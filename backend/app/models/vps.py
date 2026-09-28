from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class VPS(Base):
    __tablename__ = "vps_instances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vpc_id = Column(Integer, ForeignKey("vpcs.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    proxmox_vmid = Column(Integer, unique=True, nullable=False)
    node = Column(String(50), default="pve")

    os_type = Column(String(50), default="ubuntu")  # ubuntu, debian, alpine, etc.
    internal_ip = Column(String(50), nullable=False)  # Assigned static IP in VPC, e.g. 10.100.1.10
    mac_address = Column(String(50), nullable=True)

    cores = Column(Integer, default=2)
    memory_mb = Column(Integer, default=2048)
    disk_gb = Column(Integer, default=25)

    status = Column(String(50), default="RUNNING")  # RUNNING, STOPPED, CREATING, SUSPENDED, ERROR
    ssh_public_key = Column(Text, nullable=True)
    root_password = Column(String(255), nullable=True)  # Generated initial cloud-init password

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="vps_instances")
    vpc = relationship("VPC", back_populates="vps_instances")
    domain_routes = relationship("DomainRoute", back_populates="vps", cascade="all, delete-orphan")
    port_forwards = relationship("PortForward", back_populates="vps", cascade="all, delete-orphan")
