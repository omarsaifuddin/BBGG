from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.vps import VPS
from app.models.domain_route import DomainRoute
from app.schemas.domain_route import DomainRouteCreate, DomainRouteResponse
from app.services.caddy_service import caddy_service

router = APIRouter(prefix="/routes", tags=["Domain Routing (Single-IP Ingress)"])

@router.get("", response_model=List[DomainRouteResponse])
async def list_domain_routes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(DomainRoute).where(DomainRoute.user_id == current_user.id)
    result = await db.execute(query)
    routes = result.scalars().all()

    responses = []
    for r in routes:
        vps_res = await db.execute(select(VPS).where(VPS.id == r.vps_id))
        vps = vps_res.scalars().first()
        responses.append(
            DomainRouteResponse(
                id=r.id,
                user_id=r.user_id,
                vps_id=r.vps_id,
                vps_name=vps.name if vps else "Unknown",
                domain=r.domain,
                target_ip=r.target_ip,
                target_port=r.target_port,
                enable_tls=r.enable_tls,
                ssl_status=r.ssl_status,
                cname_target=settings.BASE_DOMAIN,
                created_at=r.created_at
            )
        )
    return responses

@router.post("", response_model=DomainRouteResponse)
async def create_domain_route(
    route_in: DomainRouteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    clean_domain = route_in.domain.strip().lower()

    # Check if domain already mapped
    existing = await db.execute(select(DomainRoute).where(DomainRoute.domain == clean_domain))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="This domain is already routed on this platform")

    # Verify target VPS exists and belongs to user
    res = await db.execute(select(VPS).where(VPS.id == route_in.vps_id, VPS.user_id == current_user.id))
    vps = res.scalars().first()
    if not vps:
        raise HTTPException(status_code=404, detail="Target VPS not found")

    # Dynamically register route with Caddy reverse proxy
    added_to_caddy = await caddy_service.add_route(
        domain=clean_domain,
        target_ip=vps.internal_ip,
        target_port=route_in.target_port
    )
    if not added_to_caddy:
        raise HTTPException(status_code=500, detail="Failed to register reverse proxy route with edge gateway")

    new_route = DomainRoute(
        user_id=current_user.id,
        vps_id=vps.id,
        domain=clean_domain,
        target_ip=vps.internal_ip,
        target_port=route_in.target_port,
        enable_tls=route_in.enable_tls,
        ssl_status="ACTIVE"
    )
    db.add(new_route)
    await db.commit()
    await db.refresh(new_route)

    return DomainRouteResponse(
        id=new_route.id,
        user_id=new_route.user_id,
        vps_id=new_route.vps_id,
        vps_name=vps.name,
        domain=new_route.domain,
        target_ip=new_route.target_ip,
        target_port=new_route.target_port,
        enable_tls=new_route.enable_tls,
        ssl_status=new_route.ssl_status,
        cname_target=settings.BASE_DOMAIN,
        created_at=new_route.created_at
    )

@router.delete("/{route_id}")
async def delete_domain_route(
    route_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(DomainRoute).where(DomainRoute.id == route_id, DomainRoute.user_id == current_user.id))
    route = res.scalars().first()
    if not route:
        raise HTTPException(status_code=404, detail="Domain route not found")

    # Remove from Caddy
    await caddy_service.remove_route(route.domain)

    await db.delete(route)
    await db.commit()
    return {"message": f"Route for {route.domain} deleted"}

@router.get("/check-domain")
async def check_domain_for_caddy(
    domain: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Called automatically by Caddy's On-Demand TLS verification hook.
    Returns 200 OK only if the domain is registered in the database,
    preventing malicious actors from exhausting Let's Encrypt rate limits.
    """
    clean = domain.strip().lower()
    res = await db.execute(select(DomainRoute).where(DomainRoute.domain == clean))
    route = res.scalars().first()
    if route:
        return Response(status_code=200, content="Domain authorized for SSL")
    return Response(status_code=403, content="Domain unauthorized")
