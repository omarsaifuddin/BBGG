from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.vps import VPS
from app.models.port_forward import PortForward
from app.schemas.port_forward import PortForwardCreate, PortForwardResponse
from app.services.firewall_service import firewall_service

router = APIRouter(prefix="/ports", tags=["Port Forwarding"])

@router.get("", response_model=List[PortForwardResponse])
async def list_port_forwards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(PortForward).where(PortForward.user_id == current_user.id)
    result = await db.execute(query)
    ports = result.scalars().all()

    responses = []
    for p in ports:
        vps_res = await db.execute(select(VPS).where(VPS.id == p.vps_id))
        vps = vps_res.scalars().first()
        
        conn_str = f"{settings.PUBLIC_IP}:{p.external_port}"
        if p.internal_port == 22:
            conn_str = f"ssh -p {p.external_port} clouduser@{settings.PUBLIC_IP}"

        responses.append(
            PortForwardResponse(
                id=p.id,
                user_id=p.user_id,
                vps_id=p.vps_id,
                vps_name=vps.name if vps else "Unknown",
                protocol=p.protocol,
                external_port=p.external_port,
                internal_ip=p.internal_ip,
                internal_port=p.internal_port,
                public_ip=settings.PUBLIC_IP,
                description=p.description,
                connection_string=conn_str,
                created_at=p.created_at
            )
        )
    return responses

@router.post("", response_model=PortForwardResponse)
async def create_port_forward(
    port_in: PortForwardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify VPS exists and belongs to user
    res = await db.execute(select(VPS).where(VPS.id == port_in.vps_id, VPS.user_id == current_user.id))
    vps = res.scalars().first()
    if not vps:
        raise HTTPException(status_code=404, detail="Target VPS not found")

    # Find used ports to allocate unique external port
    all_ports_res = await db.execute(select(PortForward.external_port))
    used_ports = set(all_ports_res.scalars().all())

    allocated_ext_port = firewall_service.allocate_port(used_ports)

    new_port = PortForward(
        user_id=current_user.id,
        vps_id=vps.id,
        protocol=port_in.protocol.upper(),
        external_port=allocated_ext_port,
        internal_ip=vps.internal_ip,
        internal_port=port_in.internal_port,
        description=port_in.description
    )
    db.add(new_port)
    await db.commit()
    await db.refresh(new_port)

    conn_str = f"{settings.PUBLIC_IP}:{allocated_ext_port}"
    if port_in.internal_port == 22:
        conn_str = f"ssh -p {allocated_ext_port} clouduser@{settings.PUBLIC_IP}"

    return PortForwardResponse(
        id=new_port.id,
        user_id=new_port.user_id,
        vps_id=new_port.vps_id,
        vps_name=vps.name,
        protocol=new_port.protocol,
        external_port=new_port.external_port,
        internal_ip=new_port.internal_ip,
        internal_port=new_port.internal_port,
        public_ip=settings.PUBLIC_IP,
        description=new_port.description,
        connection_string=conn_str,
        created_at=new_port.created_at
    )

@router.delete("/{port_id}")
async def delete_port_forward(
    port_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(PortForward).where(PortForward.id == port_id, PortForward.user_id == current_user.id))
    pf = res.scalars().first()
    if not pf:
        raise HTTPException(status_code=404, detail="Port forward rule not found")

    await db.delete(pf)
    await db.commit()
    return {"message": f"Port forward for port {pf.external_port} deleted"}
