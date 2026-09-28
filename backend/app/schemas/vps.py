from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class VPSCreate(BaseModel):
    name: str
    vpc_id: int
    os_type: str = Field(default="ubuntu", description="ubuntu, debian, alpine")
    cores: int = Field(default=2, ge=1, le=16)
    memory_mb: int = Field(default=2048, ge=512, le=32768)
    disk_gb: int = Field(default=25, ge=10, le=500)
    ssh_public_key: Optional[str] = None

class VPSResponse(BaseModel):
    id: int
    user_id: int
    vpc_id: int
    name: str
    proxmox_vmid: int
    node: str
    os_type: str
    internal_ip: str
    mac_address: Optional[str] = None
    cores: int
    memory_mb: int
    disk_gb: int
    status: str
    ssh_public_key: Optional[str] = None
    root_password: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class VPSAction(BaseModel):
    action: str = Field(..., description="start, stop, reboot, reset, shutdown")

class VPSConsoleResponse(BaseModel):
    ticket: str
    port: int
    user: str
    vmid: int
    node: str
    novnc_url: str
    status: str

class VPSStatsResponse(BaseModel):
    cpu_usage_pct: float
    memory_used_mb: float
    memory_total_mb: float
    disk_used_gb: float
    disk_total_gb: float
    uptime_seconds: int
    status: str
