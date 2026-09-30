from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_admin
from app.models.user import User
from app.models.vpc import VPC
from app.models.vps import VPS
from app.models.domain_route import DomainRoute
from app.models.port_forward import PortForward

# Every endpoint on this router requires an administrator
router = APIRouter(
    prefix="/admin",
    tags=["System & Admin Status"],
    dependencies=[Depends(get_current_admin)]
)

@router.get("/status")
async def get_system_status(db: AsyncSession = Depends(get_db)):
    users_cnt = len((await db.execute(select(User.id))).scalars().all())
    vpcs_cnt = len((await db.execute(select(VPC.id))).scalars().all())
    vps_cnt = len((await db.execute(select(VPS.id))).scalars().all())
    routes_cnt = len((await db.execute(select(DomainRoute.id))).scalars().all())
    ports_cnt = len((await db.execute(select(PortForward.id))).scalars().all())

    return {
        "status": "OPERATIONAL",
        "mock_proxmox_active": settings.MOCK_PROXMOX,
        "single_public_ip": settings.PUBLIC_IP,
        "base_domain": settings.BASE_DOMAIN,
        "caddy_api_url": settings.CADDY_ADMIN_API_URL,
        "metrics": {
            "total_users": users_cnt,
            "total_vpcs": vpcs_cnt,
            "total_vps_instances": vps_cnt,
            "active_domain_routes": routes_cnt,
            "allocated_port_forwards": ports_cnt
        }
    }
