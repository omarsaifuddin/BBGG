import pytest
import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db

@pytest.mark.asyncio
async def test_full_cloud_platform_workflow():
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Healthcheck root
        root_res = await client.get("/")
        assert root_res.status_code == 200
        assert "Caddy" in root_res.json()["single_ip_routing"]

        # 2. Register Customer User
        unique_email = f"customer_{int(asyncio.get_event_loop().time() * 1000)}@cloudcorp.com"
        reg_res = await client.post("/api/auth/register", json={
            "email": unique_email,
            "password": "SecurePassword123!",
            "full_name": "Test Customer"
        })
        assert reg_res.status_code == 200
        token_data = reg_res.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

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
        test_domain = f"api-{int(asyncio.get_event_loop().time() * 1000)}.cloudcorp.com"
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

        # 12. Billing & Stripe Plans
        plans_res = await client.get("/api/billing/plans")
        assert plans_res.status_code == 200
        assert len(plans_res.json()) >= 3

        sim_res = await client.post("/api/billing/simulate-activate?plan_id=pro", headers=headers)
        assert sim_res.status_code == 200
        assert sim_res.json()["plan_id"] == "pro"

        # 13. System Status
        status_res = await client.get("/api/admin/status")
        assert status_res.status_code == 200
        metrics = status_res.json()["metrics"]
        assert metrics["total_vpcs"] >= 1
        assert metrics["total_vps_instances"] >= 1
        assert metrics["active_domain_routes"] >= 1
        assert metrics["allocated_port_forwards"] >= 1

if __name__ == "__main__":
    asyncio.run(test_full_cloud_platform_workflow())
    print("ALL 13 TESTS PASSED SUCCESSFULLY!")
