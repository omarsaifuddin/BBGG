from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.billing import Subscription
from app.schemas.billing import PlanInfo, CheckoutSessionRequest, CheckoutSessionResponse, SubscriptionResponse
from app.services.stripe_service import stripe_service, PLANS

router = APIRouter(prefix="/billing", tags=["Billing & Stripe"])

@router.get("/plans", response_model=List[PlanInfo])
async def get_available_plans():
    return [PlanInfo(**p) for p in stripe_service.get_plans()]

@router.get("/subscription", response_model=SubscriptionResponse)
async def get_user_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = res.scalars().first()
    plan_id = sub.plan_id if sub else "starter"
    status = sub.status if sub else "active"

    return SubscriptionResponse(
        id=sub.id if sub else None,
        plan_id=plan_id,
        status=status,
        current_period_end=sub.current_period_end if sub else None,
        plans=[PlanInfo(**p) for p in stripe_service.get_plans()]
    )

@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    checkout_in: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        session_data = await stripe_service.create_checkout_session(
            user_id=current_user.id,
            user_email=current_user.email,
            plan_id=checkout_in.plan_id,
            success_url=checkout_in.success_url,
            cancel_url=checkout_in.cancel_url
        )
        return CheckoutSessionResponse(**session_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/simulate-activate")
async def simulate_plan_activation(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Allows testing plan upgrades in development/demo without live Stripe checkout."""
    if plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    res = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = res.scalars().first()
    if sub:
        sub.plan_id = plan_id
        sub.status = "active"
    else:
        sub = Subscription(user_id=current_user.id, plan_id=plan_id, status="active")
        db.add(sub)
    await db.commit()
    return {"message": f"Successfully activated {plan_id} plan!", "plan_id": plan_id}

@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receives Stripe webhook notifications."""
    payload = await request.body()
    # In production, verify signature with stripe.Webhook.construct_event
    return {"status": "received"}
