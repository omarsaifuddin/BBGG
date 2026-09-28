from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class VPC(Base):
    __tablename__ = "vpcs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    
    # Network parameters (e.g. 10.100.1.0/24)
    cidr_block = Column(String(50), nullable=False)
    vnet_id = Column(String(50), nullable=False)  # e.g. vnet101 in Proxmox SDN
    
    # Lightweight Router Gateway Info
    router_vm_id = Column(Integer, nullable=True)  # VMID in Proxmox
    router_ip = Column(String(50), default="10.100.1.1")
    
    # WireGuard VPN client tunnel access for customer
    wireguard_public_key = Column(String(255), nullable=True)
    wireguard_private_key = Column(String(255), nullable=True)
    wireguard_client_ip = Column(String(50), default="10.100.1.250")

    status = Column(String(50), default="ACTIVE")  # ACTIVE, PROVISIONING, ERROR
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="vpcs")
    vps_instances = relationship("VPS", back_populates="vpc", cascade="all, delete-orphan")
