from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import secrets

from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.vpc import VPC
from app.models.vps import VPS
from app.schemas.vps import VPSCreate, VPSResponse, VPSAction, VPSConsoleResponse, VPSStatsResponse
from app.services.proxmox_service import proxmox_service
from app.services.quota_service import check_vps_quota, user_lock
from app.services.router_service import router_service

router = APIRouter(prefix="/vps", tags=["VPS Instances"])

OS_TEMPLATES = {
    "ubuntu": settings.PROXMOX_UBUNTU_TEMPLATE_ID,
    "debian": settings.PROXMOX_DEBIAN_TEMPLATE_ID,
    "alpine": settings.PROXMOX_ALPINE_TEMPLATE_ID
}

@router.get("", response_model=List[VPSResponse])
async def list_vps_instances(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(VPS).where(VPS.user_id == current_user.id)
    result = await db.execute(query)
    instances = result.scalars().all()
    return [VPSResponse.model_validate(i) for i in instances]

@router.post("", response_model=VPSResponse)
async def create_vps_instance(
    vps_in: VPSCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    async with user_lock(current_user.id):
        await check_vps_quota(db, current_user.id, cores=vps_in.cores, memory_mb=vps_in.memory_mb)

        # Verify VPC exists and belongs to user
        res = await db.execute(
            select(VPC)
            .where(VPC.id == vps_in.vpc_id, VPC.user_id == current_user.id)
            .options(selectinload(VPC.vps_instances))
        )
        vpc = res.scalars().first()
        if not vpc:
            raise HTTPException(status_code=404, detail="Target VPC not found")

        # Pick template
        template_id = OS_TEMPLATES.get(vps_in.os_type.lower(), settings.PROXMOX_UBUNTU_TEMPLATE_ID)

        # Next free VMID
        vmid = await proxmox_service.get_next_vmid()

        # Calculate static internal IP in VPC subnet (e.g. 10.100.1.10)
        instance_index = len(vpc.vps_instances)
        internal_ip = router_service.get_next_instance_ip(vpc.cidr_block, instance_index)
        ip_cidr = f"{internal_ip}/24"
        generated_pass = secrets.token_urlsafe(12)

        # 1. Clone template
        clone_ok = await proxmox_service.clone_vm(
            template_id=template_id,
            new_vmid=vmid,
            name=vps_in.name
        )
        if not clone_ok:
            raise HTTPException(status_code=500, detail="Failed to clone VM template in Proxmox")

        # 2. Configure Cloud-Init & Network
        await proxmox_service.configure_cloudinit(
            vmid=vmid,
            ip_cidr=ip_cidr,
            gateway=vpc.router_ip,
            vnet_bridge=vpc.vnet_id,
            cores=vps_in.cores,
            memory_mb=vps_in.memory_mb,
            disk_gb=vps_in.disk_gb,
            ssh_key=vps_in.ssh_public_key,
            password=generated_pass
        )

        # 3. Boot VM
        await proxmox_service.start_vm(vmid=vmid)

        new_vps = VPS(
            user_id=current_user.id,
            vpc_id=vpc.id,
            name=vps_in.name,
            proxmox_vmid=vmid,
            node=settings.PROXMOX_DEFAULT_NODE,
            os_type=vps_in.os_type,
            internal_ip=internal_ip,
            cores=vps_in.cores,
            memory_mb=vps_in.memory_mb,
            disk_gb=vps_in.disk_gb,
            status="RUNNING",
            ssh_public_key=vps_in.ssh_public_key,
            root_password=generated_pass
        )
        db.add(new_vps)
        await db.commit()
        await db.refresh(new_vps)

    return VPSResponse.model_validate(new_vps)

@router.get("/{vps_id}", response_model=VPSResponse)
async def get_vps(
    vps_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(VPS).where(VPS.id == vps_id, VPS.user_id == current_user.id))
    vps = res.scalars().first()
    if not vps:
        raise HTTPException(status_code=404, detail="VPS not found")
    return VPSResponse.model_validate(vps)

@router.get("/{vps_id}/stats", response_model=VPSStatsResponse)
async def get_vps_stats(
    vps_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(VPS).where(VPS.id == vps_id, VPS.user_id == current_user.id))
    vps = res.scalars().first()
    if not vps:
        raise HTTPException(status_code=404, detail="VPS not found")

    stats = await proxmox_service.get_vm_status(vps.proxmox_vmid)
    return VPSStatsResponse(**stats)

@router.post("/{vps_id}/action")
async def perform_vps_action(
    vps_id: int,
    action_in: VPSAction,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(VPS).where(VPS.id == vps_id, VPS.user_id == current_user.id))
    vps = res.scalars().first()
    if not vps:
        raise HTTPException(status_code=404, detail="VPS not found")

    act = action_in.action.lower()
    if act == "start":
        await proxmox_service.start_vm(vps.proxmox_vmid)
        vps.status = "RUNNING"
    elif act in ["stop", "shutdown"]:
        await proxmox_service.stop_vm(vps.proxmox_vmid)
        vps.status = "STOPPED"
    elif act == "reboot":
        await proxmox_service.reboot_vm(vps.proxmox_vmid)
        vps.status = "RUNNING"
    elif act == "reset":
        await proxmox_service.reset_vm(vps.proxmox_vmid)
        vps.status = "RUNNING"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {act}")

    await db.commit()
    return {"message": f"Action '{act}' initiated for VPS {vps.name}", "status": vps.status}

@router.get("/{vps_id}/console", response_model=VPSConsoleResponse)
async def get_vps_console(
    vps_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(VPS).where(VPS.id == vps_id, VPS.user_id == current_user.id))
    vps = res.scalars().first()
    if not vps:
        raise HTTPException(status_code=404, detail="VPS not found")

    ticket_data = await proxmox_service.get_vnc_ticket(vps.proxmox_vmid)
    return VPSConsoleResponse(**ticket_data)

@router.delete("/{vps_id}")
async def delete_vps(
    vps_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(VPS).where(VPS.id == vps_id, VPS.user_id == current_user.id))
    vps = res.scalars().first()
    if not vps:
        raise HTTPException(status_code=404, detail="VPS not found")

    # Destroy on Proxmox. Keep the row on failure: deleting it would free the
    # user's quota while the VM may still be running.
    if not await proxmox_service.destroy_vm(vps.proxmox_vmid):
        raise HTTPException(status_code=502, detail="Proxmox could not destroy this VM. It has been kept; try again.")

    # Delete from DB
    await db.delete(vps)
    await db.commit()
    return {"message": f"VPS {vps.name} (VMID {vps.proxmox_vmid}) destroyed"}
