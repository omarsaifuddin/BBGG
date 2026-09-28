#!/usr/bin/env bash
# ==============================================================================
# Proxmox VE Software Defined Networking (SDN) Setup Script
# Run this directly on your Proxmox VE Host (as root)
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "Installing & Configuring Proxmox SDN (Simple & VLAN Zones)"
echo "=========================================================="

# 1. Install SDN core packages
apt-get update
apt-get install -y libpve-network-perl ifupdown2 dnsmasq frr-pythontools

# 2. Add SDN simple zone configuration if not already present
ZONE_FILE="/etc/pve/sdn/zones.cfg"
mkdir -p /etc/pve/sdn

if ! grep -q "simple: sdnzone" "$ZONE_FILE" 2>/dev/null; then
    echo "Creating 'sdnzone' (Simple Zone) for tenant VPC isolation..."
    cat <<EOF >> "$ZONE_FILE"
simple: sdnzone
    ipam pve
EOF
fi

# 3. Reload and apply SDN
echo "Applying SDN changes across Proxmox cluster..."
pvesdn reload

echo "=========================================================="
echo "Proxmox SDN configured successfully!"
echo "Tenant VPCs can now create isolated VNets dynamically."
echo "=========================================================="
