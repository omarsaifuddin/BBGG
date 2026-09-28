from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class PortForward(Base):
    __tablename__ = "port_forwards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vps_id = Column(Integer, ForeignKey("vps_instances.id", ondelete="CASCADE"), nullable=False)

    protocol = Column(String(10), default="TCP")        # TCP or UDP
    external_port = Column(Integer, unique=True, nullable=False) # Public high port, e.g. 20022
    internal_ip = Column(String(50), nullable=False)    # internal IP of the VPS (e.g. 10.100.1.10)
    internal_port = Column(Integer, nullable=False)      # internal port (e.g. 22 for SSH, 5432 for Postgres)
    
    description = Column(String(255), nullable=True)     # e.g. "SSH Access", "Minecraft Server"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="port_forwards")
    vps = relationship("VPS", back_populates="port_forwards")
