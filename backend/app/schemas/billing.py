from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class PlanInfo(BaseModel):
    id: str
    name: str
    price_monthly: int
    currency: str
    features: List[str]
    max_vpcs: int
    max_vps: int
    max_cores: int
    max_ram_mb: int

class CheckoutSessionRequest(BaseModel):
    plan_id: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str

class SubscriptionResponse(BaseModel):
    id: Optional[int] = None
    plan_id: str
    status: str
    current_period_end: Optional[datetime] = None
    plans: List[PlanInfo]
    billing_simulator_enabled: bool = False

    model_config = ConfigDict(from_attributes=True)
