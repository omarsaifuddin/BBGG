# BBGG: Proxmox Automated Cloud & VPC Framework (Single-IP Ingress)

A ~~production-grade~~ self-service cloud framework transforming a Proxmox VE hypervisor into an **AWS VPC / Lightsail-style** public cloud platform with **only one public IPv4 address**.

---

## Key Features

1. **Single-IP Domain Routing (Ingress Layer)**
   - Powered by **Caddy v2 with On-Demand TLS**.
   - Directs incoming web traffic to customer VPS instances based on **domain name / TLS SNI** rather than direct public IP.
   - Automatically issues, renews, and manages **Let's Encrypt / ZeroSSL** certificates on first request.
   - Built-in anti-DDoS security hook (`/api/routes/check-domain`) prevents ACME rate-limit exhaustion.

2. **Isolated Multi-Tenant VPCs (Proxmox SDN)**
   - Automatically allocates a private `/24` subnet per customer (e.g. `10.100.1.0/24`, `10.100.2.0/24`).
   - Uses Proxmox SDN (Simple/VLAN zones) to isolate tenant virtual bridges (`vnet101`, `vnet102`).
   - Provisions a lightweight Alpine/Debian virtual router gateway (consuming just 128MB RAM) with DHCP, NAT masquerading, and WireGuard.
   - **WireGuard Client VPN**: Customers can download a 1-click WireGuard profile from their dashboard to connect directly into their private VPC subnet from their workstation.

3. **Automated Cloud-Init VPS Provisioning**
   - Clones official cloud-init templates (Ubuntu 24.04 LTS Noble, Debian 12 Bookworm, Alpine Linux).
   - Injects SSH keys, static VPC IPs, gateway routes, CPU cores, RAM, and disk sizing.
   - Full power lifecycle: Start, Graceful Shutdown, Reboot, Force Reset, and Purge.
   - **In-Browser Web Console (noVNC)**: Secure WebSocket terminal console embedded in the browser so users can access their VPS shell without opening public port 22.

4. **Non-HTTP High-Port Forwarding**
   - For raw TCP/UDP services (SSH, PostgreSQL, MySQL, Game Servers), the platform dynamically assigns public high-ports from a dedicated pool (`20000–29999`) with automated host firewall DNAT rules.

5. **Customer Portal & Stripe Billing**
   - Modern React + Tailwind CSS dashboard.
   - Stripe Subscription Checkout sessions and webhooks.
   - Tiered plans: Starter ($15/mo), Pro ($35/mo), Enterprise ($75/mo), with enforced VPC, VPS, vCPU and RAM quotas.
   - Built-in Dev Simulator to test upgrades without live Stripe keys (opt-in with `BILLING_SIMULATOR_ENABLED=true`; it lets any user change plans for free, so never enable it in production).

---

## Architecture Diagram

```
                        PUBLIC INTERNET (Single Public IPv4)
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                     │
   Ports 80 / 443 (HTTP/HTTPS)                       High Ports 20000-29999 (TCP/UDP)
        │                                                     │
        ▼                                                     ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ Caddy Edge Reverse Proxy      │               │ Host DNAT Forwarder           │
│ • Host Header / SNI Routing   │               │ (iptables / nftables)         │
│ • On-Demand TLS               │               │ • Maps public_ip:20022        │
│ • Dynamic REST API (:2019)    │               │   -> 10.100.1.10:22           │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        │
                         PROXMOX VE HYPERVISOR (pve)
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        │                                                               │
┌───────▼──────────────────────────┐         ┌──────────────────────────▼───────┐
│ Tenant A: VPC (10.100.1.0/24)    │         │ Tenant B: VPC (10.100.2.0/24)    │
│ Bridge: vnet101                  │         │ Bridge: vnet102                  │
│ • Virtual Gateway (100.x.1)      │         │ • Virtual Gateway (100.2.1)      │
│ • VPS 1: 10.100.1.10 (Ubuntu)    │         │ • VPS 1: 10.100.2.10 (Debian)    │
│ • VPS 2: 10.100.1.11 (Alpine)    │         │ • WireGuard VPN (10.100.2.250)   │
│ • WireGuard VPN (10.100.1.250)   │         └──────────────────────────────────┘
└──────────────────────────────────┘
```

---

## Quick Start & Deployment

### Option 1: Docker Compose (All-in-One)

1. Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
   Set `SECRET_KEY` to the output of `openssl rand -hex 32`. The backend refuses to start without one when `MOCK_PROXMOX=false`.

2. Start the entire platform (Backend, Frontend, and Caddy Edge Proxy):
   ```bash
   docker compose up -d --build
   ```

3. Open your browser:
   - **Customer Portal**: `http://localhost:3000` (or `http://your-server-ip:3000`)
   - **Backend API Docs**: `http://localhost:8000/docs`
   - **Caddy Ingress**: Ports 80 & 443 (the Caddy admin API on 2019 stays on the internal Docker network)

4. Register an account in the portal, then make it an administrator (this unlocks **System Health**):
   ```bash
   docker compose exec backend python -m app.cli make-admin you@example.com
   ```

---

### Option 2: Local Development Setup

#### 1. Backend (FastAPI + Python 3.13)
```bash
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate   # On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run FastAPI development server
uvicorn app.main:app --app-dir backend --reload --port 8000

# Run the test suite (uses a throwaway database and mock Proxmox)
pytest backend/tests
```

#### 2. Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Proxmox Hypervisor Host Setup

Run the scripts in `proxmox-setup/` directly on your Proxmox VE root shell:

1. **Configure Software-Defined Networking (SDN)**:
   ```bash
   bash proxmox-setup/setup_sdn.sh
   ```

2. **Create Cloud-Init VM Templates (Ubuntu 24.04, Debian 12)**:
   ```bash
   bash proxmox-setup/create_templates.sh local-lvm
   ```

3. **Enable Host Outbound NAT Masquerade**:
   ```bash
   bash proxmox-setup/setup_host_nat.sh vmbr0
   ```

4. **Connect Control Plane to Proxmox API**:
   In your Proxmox Web GUI, go to **Datacenter -> Permissions -> API Tokens -> Add**:
   - User: `root@pam`
   - Token ID: `api_token`
   - Uncheck *Privilege Separation*
   Add the token ID and Secret to your `.env` file:
   ```env
   MOCK_PROXMOX=false
   PROXMOX_HOST=192.168.1.100
   PROXMOX_USER=root@pam
   PROXMOX_TOKEN_NAME=api_token
   PROXMOX_TOKEN_VALUE=your-token-secret-uuid
   ```

---

## How Domain Routing Works for Customers

1. Customer registers their domain or subdomain (e.g. `app.customer.com`).
2. In their DNS provider, they add a **CNAME** record:
   ```
   CNAME  app.customer.com  ->  cloud.yourdomain.com
   ```
3. In CloudControl Dashboard:
   - Click **Domain Routing -> Add Domain Route**.
   - Domain: `app.customer.com`
   - Destination VPS: `web-server-01`
   - Internal Port: `3000`
4. When external requests arrive at your single public IP, Caddy:
   - Validates the domain against `/api/routes/check-domain`.
   - Obtains an automated SSL certificate from Let's Encrypt.
   - Proxies the HTTPS connection directly to `10.100.1.10:3000`.

---

## Non-HTTP Traffic (SSH, DB, Game Servers)

For services that do not use HTTP Host headers:
1. **In-Browser Web Console**: Access the full terminal directly in the dashboard via secure Proxmox noVNC WebSockets (no open ports needed).
2. **High-Port Forwarding**: Allocate high-ports (`20000–29999`) in the dashboard (e.g. `ssh -p 20022 clouduser@public_ip`).
3. **WireGuard Client Tunnel**: Download the 1-click `.conf` from the VPC page to establish a secure VPN tunnel directly into your private `10.100.x.x` subnet.

This is brand spanking new and no warranty or support will be provided. Figure it out.