from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Proxmox VPC Cloud Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "change_this_to_a_super_secure_random_key_in_production_32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./cloud_platform.db"

    # Single Public IP & Host Networking
    PUBLIC_IP: str = "203.0.113.10"  # Your single public IPv4
    BASE_DOMAIN: str = "cloud.yourdomain.com"
    CADDY_ADMIN_API_URL: str = "http://localhost:2019"
    PORT_FORWARD_MIN: int = 20000
    PORT_FORWARD_MAX: int = 29999

    # Proxmox VE Settings
    PROXMOX_HOST: str = "192.168.1.100"
    PROXMOX_PORT: int = 8006
    PROXMOX_USER: str = "root@pam"
    PROXMOX_TOKEN_NAME: Optional[str] = "api_token"
    PROXMOX_TOKEN_VALUE: Optional[str] = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    PROXMOX_PASSWORD: Optional[str] = None  # Or use password auth if token not used
    PROXMOX_VERIFY_SSL: bool = False
    PROXMOX_DEFAULT_NODE: str = "pve"
    PROXMOX_STORAGE_POOL: str = "local-lvm"
    PROXMOX_SDN_ZONE: str = "sdnzone"  # Simple or VLAN zone in Proxmox SDN
    
    # Template VM IDs configured on Proxmox
    PROXMOX_ROUTER_TEMPLATE_ID: int = 9000
    PROXMOX_UBUNTU_TEMPLATE_ID: int = 9001
    PROXMOX_DEBIAN_TEMPLATE_ID: int = 9002
    PROXMOX_ALPINE_TEMPLATE_ID: int = 9003

    # Mock mode flag: Allows running, testing and developing without a live Proxmox host
    MOCK_PROXMOX: bool = True

    # Stripe Billing
    STRIPE_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder"
    STRIPE_CURRENCY: str = "usd"

    # Frontend URL for CORS
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
