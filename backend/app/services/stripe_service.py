import logging
import stripe
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

PLANS = {
    "starter": {
        "id": "starter",
        "name": "Cloud Starter",
        "price_monthly": 15,
        "currency": "usd",
        "max_vpcs": 1,
        "max_vps": 2,
        "max_cores": 4,
        "max_ram_mb": 4096,
        "features": [
            "1 Isolated Cloud VPC",
            "Up to 2 VPS Instances",
            "4 vCPU Cores & 4GB RAM",
            "Single-IP Domain Routing & SSL",
            "Web Console Access",
            "Community Support"
        ]
    },
    "pro": {
        "id": "pro",
        "name": "Cloud Pro",
        "price_monthly": 35,
        "currency": "usd",
        "max_vpcs": 3,
        "max_vps": 6,
        "max_cores": 12,
        "max_ram_mb": 16384,
        "features": [
            "3 Isolated Cloud VPCs",
            "Up to 6 VPS Instances",
            "12 vCPU Cores & 16GB RAM",
            "Unlimited Domain Ingress Routes",
            "WireGuard Client VPC Tunnels",
            "High-Port TCP/UDP Forwarding",
            "Priority Support"
        ]
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Cloud Enterprise",
        "price_monthly": 75,
        "currency": "usd",
        "max_vpcs": 10,
        "max_vps": 20,
        "max_cores": 32,
        "max_ram_mb": 65536,
        "features": [
            "10 Isolated Cloud VPCs",
            "Up to 20 VPS Instances",
            "32 vCPU Cores & 64GB RAM",
            "Full Custom Router Control",
            "Dedicated Bandwidth Allocation",
            "24/7 SLA & Dedicated Support"
        ]
    }
}

class StripeService:
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def get_plans(self) -> List[Dict[str, Any]]:
        return list(PLANS.values())

    def get_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        return PLANS.get(plan_id)

    async def create_checkout_session(
        self,
        user_id: int,
        user_email: str,
        plan_id: str,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Creates Stripe Checkout Session.
        If Stripe key is mock/placeholder, generates a simulated test checkout session.
        """
        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Invalid plan: {plan_id}")

        if settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder") or not settings.STRIPE_SECRET_KEY:
            # Simulated Stripe Session
            mock_session_id = f"cs_test_mock_{user_id}_{plan_id}"
            return {
                "session_id": mock_session_id,
                "checkout_url": f"{settings.FRONTEND_URL}/billing?success=true&session_id={mock_session_id}&plan_id={plan_id}"
            }

        try:
            succ = success_url or f"{settings.FRONTEND_URL}/billing?session_id={{CHECKOUT_SESSION_ID}}"
            canc = cancel_url or f"{settings.FRONTEND_URL}/billing?canceled=true"

            session = stripe.checkout.Session.create(
                customer_email=user_email,
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": plan["currency"],
                            "product_data": {
                                "name": plan["name"],
                                "description": f"Subscription for {plan['name']}"
                            },
                            "unit_amount": plan["price_monthly"] * 100,
                            "recurring": {"interval": "month"},
                        },
                        "quantity": 1,
                    }
                ],
                mode="subscription",
                success_url=succ,
                cancel_url=canc,
                metadata={
                    "user_id": str(user_id),
                    "plan_id": plan_id
                }
            )
            return {
                "session_id": session.id,
                "checkout_url": session.url
            }
        except Exception as e:
            logger.error(f"Error creating Stripe checkout session: {e}")
            raise e

stripe_service = StripeService()
