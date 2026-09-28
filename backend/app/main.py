from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.routers import auth, vpc, vps, domain_routes, port_forwards, billing, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated Proxmox VPC/VPS Cloud Platform with Single-IP Domain Routing & Billing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local Vite dev and Docker production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(vpc.router, prefix=settings.API_V1_STR)
app.include_router(vps.router, prefix=settings.API_V1_STR)
app.include_router(domain_routes.router, prefix=settings.API_V1_STR)
app.include_router(port_forwards.router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs_url": "/docs",
        "public_ip": settings.PUBLIC_IP,
        "base_domain": settings.BASE_DOMAIN,
        "single_ip_routing": "Caddy Dynamic Reverse Proxy + On-Demand TLS"
    }
