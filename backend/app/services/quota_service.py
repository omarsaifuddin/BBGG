import asyncio
from collections import defaultdict
from typing import Any, Dict

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.billing import Subscription
from app.models.vpc import VPC
from app.models.vps import VPS
from app.services.stripe_service import PLANS

# Subscription states that may create new resources
PROVISIONING_STATUSES = {"active", "trialing"}

# Serializes each user's create requests so parallel calls cannot all pass the
# quota check before any of them commits. Per process only: this needs a
# database-level lock if the backend ever runs with multiple workers.
_user_locks: Dict[int, asyncio.Lock] = defaultdict(asyncio.Lock)

def user_lock(user_id: int) -> asyncio.Lock:
    return _user_locks[user_id]

def _quota_exceeded(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"{message} Upgrade your plan or free up resources."
    )

async def get_active_plan(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    res = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    sub = res.scalars().first()
    # Same fallback as GET /billing/subscription, which shows a missing row as an active starter plan
    plan_id = sub.plan_id if sub else "starter"
    sub_status = sub.status if sub else "active"

    if sub_status not in PROVISIONING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your subscription is {sub_status}. Renew it to create new resources."
        )
    plan = PLANS.get(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your subscription references unknown plan '{plan_id}'. Contact support."
        )
    return plan

async def check_vpc_quota(db: AsyncSession, user_id: int) -> None:
    plan = await get_active_plan(db, user_id)
    res = await db.execute(select(func.count(VPC.id)).where(VPC.user_id == user_id))
    vpc_count = res.scalar_one()
    if vpc_count >= plan["max_vpcs"]:
        raise _quota_exceeded(f"VPC limit reached for the {plan['name']} plan ({vpc_count}/{plan['max_vpcs']}).")

async def check_vps_quota(db: AsyncSession, user_id: int, cores: int, memory_mb: int) -> None:
    """Plan vCPU and RAM limits are account-wide pools shared by all of a user's VPS instances."""
    plan = await get_active_plan(db, user_id)
    res = await db.execute(
        select(
            func.count(VPS.id),
            func.coalesce(func.sum(VPS.cores), 0),
            func.coalesce(func.sum(VPS.memory_mb), 0)
        ).where(VPS.user_id == user_id)
    )
    vps_count, used_cores, used_memory_mb = res.one()

    if vps_count >= plan["max_vps"]:
        raise _quota_exceeded(f"VPS limit reached for the {plan['name']} plan ({vps_count}/{plan['max_vps']}).")
    if used_cores + cores > plan["max_cores"]:
        raise _quota_exceeded(
            f"This VPS needs {cores} vCPU, but only {plan['max_cores'] - used_cores} of the "
            f"{plan['name']} plan's {plan['max_cores']} vCPU remain."
        )
    if used_memory_mb + memory_mb > plan["max_ram_mb"]:
        raise _quota_exceeded(
            f"This VPS needs {memory_mb} MB RAM, but only {plan['max_ram_mb'] - used_memory_mb} MB of the "
            f"{plan['name']} plan's {plan['max_ram_mb']} MB remain."
        )
