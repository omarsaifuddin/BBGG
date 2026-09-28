from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class DomainRoute(Base):
    __tablename__ = "domain_routes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vps_id = Column(Integer, ForeignKey("vps_instances.id", ondelete="CASCADE"), nullable=False)

    # e.g., "app.customerdomain.com" or "demo-app.cloud.yourdomain.com"
    domain = Column(String(255), unique=True, index=True, nullable=False)
    target_ip = Column(String(50), nullable=False)      # internal IP of the VPS (e.g. 10.100.1.10)
    target_port = Column(Integer, default=80)           # port on the VPS (e.g. 80, 3000, 8080)
    
    enable_tls = Column(Boolean, default=True)
    ssl_status = Column(String(50), default="ACTIVE")   # ACTIVE, PROVISIONING, FAILED
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="domain_routes")
    vps = relationship("VPS", back_populates="domain_routes")
