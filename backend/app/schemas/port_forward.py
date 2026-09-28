from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class PortForwardCreate(BaseModel):
    vps_id: int
    internal_port: int = Field(..., ge=1, le=65535, description="Port on the VPS, e.g. 22 for SSH, 5432 for Postgres")
    protocol: str = Field(default="TCP", description="TCP or UDP")
    description: Optional[str] = "Port Mapping"

class PortForwardResponse(BaseModel):
    id: int
    user_id: int
    vps_id: int
    vps_name: Optional[str] = None
    protocol: str
    external_port: int
    internal_ip: str
    internal_port: int
    public_ip: str
    description: Optional[str] = None
    connection_string: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
