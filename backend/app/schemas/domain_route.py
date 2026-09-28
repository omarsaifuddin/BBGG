from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class DomainRouteCreate(BaseModel):
    vps_id: int
    domain: str = Field(..., description="e.g. app.mycustomer.com or sub.cloud.domain.com")
    target_port: int = Field(default=80, ge=1, le=65535)
    enable_tls: bool = True

class DomainRouteResponse(BaseModel):
    id: int
    user_id: int
    vps_id: int
    vps_name: Optional[str] = None
    domain: str
    target_ip: str
    target_port: int
    enable_tls: bool
    ssl_status: str
    cname_target: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
