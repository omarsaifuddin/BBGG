from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class VPCCreate(BaseModel):
    name: str

class VPCResponse(BaseModel):
    id: int
    user_id: int
    name: str
    cidr_block: str
    vnet_id: str
    router_ip: str
    wireguard_client_ip: Optional[str] = None
    status: str
    created_at: datetime
    vps_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class WireGuardConfigResponse(BaseModel):
    client_ip: str
    server_endpoint: str
    client_private_key: str
    server_public_key: str
    allowed_ips: str
    config_file: str
