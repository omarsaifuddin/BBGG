from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.vpc import VPC
from app.schemas.vpc import VPCCreate, VPCResponse, WireGuardConfigResponse
from app.services.proxmox_service import proxmox_service
from app.services.quota_service import check_vpc_quota, user_lock
from app.services.router_service import router_service

router = APIRouter(prefix="/vpcs", tags=["VPC"])

@router.get("", response_model=List[VPCResponse])
async def list_vpcs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(VPC)
        .where(VPC.user_id == current_user.id)
        .options(selectinload(VPC.vps_instances))
    )
    result = await db.execute(query)
    vpcs = result.scalars().all()
    
    responses = []
    for v in vpcs:
        resp = VPCResponse(
            id=v.id,
            user_id=v.user_id,
            name=v.name,
            cidr_block=v.cidr_block,
            vnet_id=v.vnet_id,
            router_ip=v.router_ip,
            wireguard_client_ip=v.wireguard_client_ip,
            status=v.status,
            created_at=v.created_at,
            vps_count=len(v.vps_instances)
        )
        responses.append(resp)
    return responses

@router.post("", response_model=VPCResponse)
async def create_vpc(
    vpc_in: VPCCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    async with user_lock(current_user.id):
        await check_vpc_quota(db, current_user.id)

        # Count current user's VPCs to generate distinct ID and subnet
        count_res = await db.execute(select(VPC))
        total_existing = len(count_res.scalars().all()) + 1

        cidr = router_service.generate_vpc_cidr(total_existing)
        router_ip = router_service.get_router_ip(cidr)
        vnet_id = f"vnet{100 + total_existing}"

        # Generate WireGuard keys for customer VPN client access
        privkey, pubkey = router_service.generate_wireguard_keys()
        client_ip = f"{cidr.rsplit('.', 1)[0]}.250"

        # Provision Proxmox SDN VNet
        await proxmox_service.create_vnet(vnet_id=vnet_id, zone=settings.PROXMOX_SDN_ZONE)

        new_vpc = VPC(
            user_id=current_user.id,
            name=vpc_in.name,
            cidr_block=cidr,
            vnet_id=vnet_id,
            router_ip=router_ip,
            wireguard_public_key=pubkey,
            wireguard_private_key=privkey,
            wireguard_client_ip=client_ip,
            status="ACTIVE"
        )
        db.add(new_vpc)
        await db.commit()
        await db.refresh(new_vpc)

    return VPCResponse(
        id=new_vpc.id,
        user_id=new_vpc.user_id,
        name=new_vpc.name,
        cidr_block=new_vpc.cidr_block,
        vnet_id=new_vpc.vnet_id,
        router_ip=new_vpc.router_ip,
        wireguard_client_ip=new_vpc.wireguard_client_ip,
        status=new_vpc.status,
        created_at=new_vpc.created_at,
        vps_count=0
    )

@router.get("/{vpc_id}/wireguard-config", response_model=WireGuardConfigResponse)
async def get_wireguard_config(
    vpc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(VPC).where(VPC.id == vpc_id, VPC.user_id == current_user.id))
    vpc = res.scalars().first()
    if not vpc:
        raise HTTPException(status_code=404, detail="VPC not found")

    server_pubkey = "B7l2mU389yQ7nZ29rE7vR6wY0xL2mN1bV4cX5zQ="
    conf_text = router_service.generate_wireguard_client_config(
        client_private_key=vpc.wireguard_private_key or "client_sample_private_key",
        client_ip=vpc.wireguard_client_ip,
        server_public_key=server_pubkey,
        server_endpoint=settings.PUBLIC_IP,
        vpc_cidr=vpc.cidr_block
    )

    return WireGuardConfigResponse(
        client_ip=vpc.wireguard_client_ip,
        server_endpoint=settings.PUBLIC_IP,
        client_private_key=vpc.wireguard_private_key or "",
        server_public_key=server_pubkey,
        allowed_ips=vpc.cidr_block,
        config_file=conf_text
    )

@router.delete("/{vpc_id}")
async def delete_vpc(
    vpc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(VPC)
        .where(VPC.id == vpc_id, VPC.user_id == current_user.id)
        .options(selectinload(VPC.vps_instances))
    )
    vpc = res.scalars().first()
    if not vpc:
        raise HTTPException(status_code=404, detail="VPC not found")

    # Cascading the rows away would free quota while the VMs keep running in Proxmox
    if vpc.vps_instances:
        raise HTTPException(status_code=409, detail="Destroy the VPS instances in this VPC before deleting it")

    await db.delete(vpc)
    await db.commit()
    return {"message": f"VPC {vpc_id} deleted successfully"}
