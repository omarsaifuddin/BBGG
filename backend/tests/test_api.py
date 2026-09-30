import asyncio
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import update
from sqlalchemy.future import select

from app.cli import set_admin
from app.core.config import Settings, settings
from app.core.database import AsyncSessionLocal, engine, init_db
from app.main import app
from app.models.billing import Subscription
from app.models.user import User

@pytest_asyncio.fixture
async def client():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    # Drop pooled connections so the next test's event loop starts clean
    await engine.dispose()

async def register(client):
    email = f"customer_{uuid.uuid4().hex[:12]}@cloudcorp.com"
    res = await client.post("/api/auth/register", json={
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Test Customer"
    })
    assert res.status_code == 200
    return email, {"Authorization": f"Bearer {res.json()['access_token']}"}

async def create_vps(client, headers, vpc_id, cores=1, memory_mb=1024):
    return await client.post("/api/vps", json={
        "name": f"vps-{uuid.uuid4().hex[:6]}",
        "vpc_id": vpc_id,
        "os_type": "ubuntu",
        "cores": cores,
        "memory_mb": memory_mb,
        "disk_gb": 25
    }, headers=headers)

@pytest.mark.asyncio
async def test_full_cloud_platform_workflow(client, monkeypatch):
    # 1. Healthcheck root
    root_res = await client.get("/")
    assert root_res.status_code == 200
    assert "Caddy" in root_res.json()["single_ip_routing"]

    # 2. Register Customer User
    email, headers = await register(client)

    # 3. Create VPC with SDN & WireGuard
    vpc_res = await client.post("/api/vpcs", json={"name": "Production VPC"}, headers=headers)
    assert vpc_res.status_code == 200
    vpc = vpc_res.json()
    vpc_id = vpc["id"]
    assert "10.100." in vpc["cidr_block"]
    assert vpc["router_ip"] == "10.100.1.1" or "10.100." in vpc["router_ip"]
    assert vpc["status"] == "ACTIVE"

    # 4. Fetch WireGuard VPN Client Config
    wg_res = await client.get(f"/api/vpcs/{vpc_id}/wireguard-config", headers=headers)
    assert wg_res.status_code == 200
    wg_data = wg_res.json()
    assert "[Interface]" in wg_data["config_file"]
    assert "[Peer]" in wg_data["config_file"]

    # 5. Launch Cloud-Init VPS inside VPC
    vps_res = await client.post("/api/vps", json={
        "name": "web-cluster-node1",
        "vpc_id": vpc_id,
        "os_type": "ubuntu",
        "cores": 2,
        "memory_mb": 2048,
        "disk_gb": 25,
        "ssh_public_key": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG... customer@laptop"
    }, headers=headers)
    assert vps_res.status_code == 200
    vps = vps_res.json()
    vps_id = vps["id"]
    assert vps["status"] == "RUNNING"
    assert vps["internal_ip"].startswith("10.100.")

    # 6. VPS Power Actions (Reboot, Stop, Start)
    action_res = await client.post(f"/api/vps/{vps_id}/action", json={"action": "reboot"}, headers=headers)
    assert action_res.status_code == 200
    assert action_res.json()["status"] == "RUNNING"

    # 7. Web Console (noVNC Ticket generation)
    console_res = await client.get(f"/api/vps/{vps_id}/console", headers=headers)
    assert console_res.status_code == 200
    assert "ticket" in console_res.json()
    assert "novnc_url" in console_res.json()

    # 8. VPS Live Telemetry Stats
    stats_res = await client.get(f"/api/vps/{vps_id}/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "cpu_usage_pct" in stats
    assert "memory_used_mb" in stats

    # 9. Register Domain Ingress Route (Single Public IP Routing)
    test_domain = f"api-{uuid.uuid4().hex[:8]}.cloudcorp.com"
    route_res = await client.post("/api/routes", json={
        "vps_id": vps_id,
        "domain": test_domain,
        "target_port": 3000,
        "enable_tls": True
    }, headers=headers)
    assert route_res.status_code == 200
    route = route_res.json()
    assert route["domain"] == test_domain
    assert route["target_port"] == 3000
    assert route["ssl_status"] == "ACTIVE"

    # 10. Test Caddy On-Demand TLS verification hook
    check_res = await client.get(f"/api/routes/check-domain?domain={test_domain}")
    assert check_res.status_code == 200

    unauth_check = await client.get("/api/routes/check-domain?domain=random-unregistered.com")
    assert unauth_check.status_code == 403

    # 11. Expose TCP Port (High-Port Forwarding for SSH/DB)
    port_res = await client.post("/api/ports", json={
        "vps_id": vps_id,
        "internal_port": 22,
        "protocol": "TCP",
        "description": "Remote SSH Port"
    }, headers=headers)
    assert port_res.status_code == 200
    port_data = port_res.json()
    assert 20000 <= port_data["external_port"] <= 29999
    assert "ssh -p" in port_data["connection_string"]

    # 12. Billing & Stripe Plans (simulator enabled as in a dev deployment)
    monkeypatch.setattr(settings, "BILLING_SIMULATOR_ENABLED", True)
    plans_res = await client.get("/api/billing/plans")
    assert plans_res.status_code == 200
    assert len(plans_res.json()) >= 3

    sim_res = await client.post("/api/billing/simulate-activate?plan_id=pro", headers=headers)
    assert sim_res.status_code == 200
    assert sim_res.json()["plan_id"] == "pro"

    # 13. System Status (administrators only)
    assert await set_admin(email, True) == 0
    status_res = await client.get("/api/admin/status", headers=headers)
    assert status_res.status_code == 200
    metrics = status_res.json()["metrics"]
    assert metrics["total_vpcs"] >= 1
    assert metrics["total_vps_instances"] >= 1
    assert metrics["active_domain_routes"] >= 1
    assert metrics["allocated_port_forwards"] >= 1

@pytest.mark.asyncio
async def test_admin_status_requires_admin(client):
    assert (await client.get("/api/admin/status")).status_code == 401

    email, headers = await register(client)
    assert (await client.get("/api/admin/status", headers=headers)).status_code == 403

    assert await set_admin(email, True) == 0
    assert (await client.get("/api/admin/status", headers=headers)).status_code == 200

    assert await set_admin(email, False) == 0
    assert (await client.get("/api/admin/status", headers=headers)).status_code == 403

@pytest.mark.asyncio
async def test_billing_simulator_is_disabled_by_default(client):
    _, headers = await register(client)

    sim_res = await client.post("/api/billing/simulate-activate?plan_id=enterprise", headers=headers)
    assert sim_res.status_code == 404

    sub_res = await client.get("/api/billing/subscription", headers=headers)
    assert sub_res.json()["plan_id"] == "starter"
    assert sub_res.json()["billing_simulator_enabled"] is False

@pytest.mark.asyncio
async def test_starter_plan_quotas_are_enforced(client):
    # Starter: 1 VPC, 2 VPS, 4 vCPU and 4096 MB RAM shared across the account
    _, headers = await register(client)

    vpc_res = await client.post("/api/vpcs", json={"name": "vpc-a"}, headers=headers)
    assert vpc_res.status_code == 200
    vpc_id = vpc_res.json()["id"]

    second_vpc = await client.post("/api/vpcs", json={"name": "vpc-b"}, headers=headers)
    assert second_vpc.status_code == 403
    assert "VPC limit" in second_vpc.json()["detail"]

    assert (await create_vps(client, headers, vpc_id, cores=3, memory_mb=2048)).status_code == 200

    too_many_cores = await create_vps(client, headers, vpc_id, cores=2, memory_mb=1024)
    assert too_many_cores.status_code == 403
    assert "vCPU" in too_many_cores.json()["detail"]

    too_much_ram = await create_vps(client, headers, vpc_id, cores=1, memory_mb=3072)
    assert too_much_ram.status_code == 403
    assert "RAM" in too_much_ram.json()["detail"]

    # Exactly fills the remaining pool
    assert (await create_vps(client, headers, vpc_id, cores=1, memory_mb=2048)).status_code == 200

    too_many_vps = await create_vps(client, headers, vpc_id, cores=1, memory_mb=512)
    assert too_many_vps.status_code == 403
    assert "VPS limit" in too_many_vps.json()["detail"]

@pytest.mark.asyncio
async def test_quota_follows_plan_upgrade(client, monkeypatch):
    monkeypatch.setattr(settings, "BILLING_SIMULATOR_ENABLED", True)
    _, headers = await register(client)

    assert (await client.post("/api/vpcs", json={"name": "vpc-a"}, headers=headers)).status_code == 200
    assert (await client.post("/api/vpcs", json={"name": "vpc-b"}, headers=headers)).status_code == 403

    sim_res = await client.post("/api/billing/simulate-activate?plan_id=pro", headers=headers)
    assert sim_res.status_code == 200
    assert (await client.post("/api/vpcs", json={"name": "vpc-b"}, headers=headers)).status_code == 200

@pytest.mark.asyncio
async def test_inactive_subscription_blocks_provisioning(client):
    email, headers = await register(client)
    async with AsyncSessionLocal() as db:
        user_id = (await db.execute(select(User.id).where(User.email == email))).scalar_one()
        await db.execute(update(Subscription).where(Subscription.user_id == user_id).values(status="past_due"))
        await db.commit()

    res = await client.post("/api/vpcs", json={"name": "vpc-a"}, headers=headers)
    assert res.status_code == 403
    assert "past_due" in res.json()["detail"]

@pytest.mark.asyncio
async def test_parallel_creates_cannot_exceed_quota(client):
    _, headers = await register(client)

    results = await asyncio.gather(*[
        client.post("/api/vpcs", json={"name": f"vpc-{i}"}, headers=headers) for i in range(5)
    ])
    assert sorted(r.status_code for r in results) == [200, 403, 403, 403, 403]

@pytest.mark.asyncio
async def test_vpc_with_instances_cannot_be_deleted(client):
    _, headers = await register(client)
    vpc_id = (await client.post("/api/vpcs", json={"name": "vpc-a"}, headers=headers)).json()["id"]
    vps_id = (await create_vps(client, headers, vpc_id)).json()["id"]

    blocked = await client.delete(f"/api/vpcs/{vpc_id}", headers=headers)
    assert blocked.status_code == 409

    assert (await client.delete(f"/api/vps/{vps_id}", headers=headers)).status_code == 200
    assert (await client.delete(f"/api/vpcs/{vpc_id}", headers=headers)).status_code == 200

    # Quota is released once the resources are really gone
    assert (await client.post("/api/vpcs", json={"name": "vpc-b"}, headers=headers)).status_code == 200

@pytest.mark.parametrize("key", ["", "too-short", "change_this_to_a_super_secure_random_key_in_production_32chars"])
def test_real_proxmox_requires_a_strong_secret_key(key):
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        Settings(_env_file=None, MOCK_PROXMOX=False, SECRET_KEY=key)

def test_secret_key_handling():
    strong_key = "a" * 64
    assert Settings(_env_file=None, MOCK_PROXMOX=False, SECRET_KEY=strong_key).SECRET_KEY == strong_key

    # Mock mode swaps an unset key for a random one instead of a guessable constant
    first = Settings(_env_file=None, MOCK_PROXMOX=True, SECRET_KEY="").SECRET_KEY
    second = Settings(_env_file=None, MOCK_PROXMOX=True, SECRET_KEY="").SECRET_KEY
    assert len(first) >= 32 and first != second
