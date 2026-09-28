from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    stripe_customer_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    vpcs = relationship("VPC", back_populates="owner", cascade="all, delete-orphan")
    vps_instances = relationship("VPS", back_populates="owner", cascade="all, delete-orphan")
    domain_routes = relationship("DomainRoute", back_populates="owner", cascade="all, delete-orphan")
    port_forwards = relationship("PortForward", back_populates="owner", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="owner", uselist=False, cascade="all, delete-orphan")
