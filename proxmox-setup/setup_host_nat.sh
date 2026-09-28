#!/usr/bin/env bash
# ==============================================================================
# Single-IP Proxmox Host NAT & Forwarding Setup
# Enables outbound internet access for all tenant VPC subnets (10.100.0.0/16)
# ==============================================================================
set -euo pipefail

WAN_INTERFACE="${1:-vmbr0}"

echo "Configuring Linux kernel IP forwarding..."
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv6.conf.all.forwarding=1

# Persist sysctl
cat <<EOF > /etc/sysctl.d/99-proxmox-vpc-nat.conf
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
EOF

echo "Setting up NAT Masquerade for tenant VPCs on interface $WAN_INTERFACE..."
iptables -t nat -C POSTROUTING -s 10.100.0.0/16 -o "$WAN_INTERFACE" -j MASQUERADE 2>/dev/null || \
iptables -t nat -A POSTROUTING -s 10.100.0.0/16 -o "$WAN_INTERFACE" -j MASQUERADE

iptables -C FORWARD -i "$WAN_INTERFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || \
iptables -A FORWARD -i "$WAN_INTERFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT

iptables -C FORWARD -s 10.100.0.0/16 -o "$WAN_INTERFACE" -j ACCEPT 2>/dev/null || \
iptables -A FORWARD -s 10.100.0.0/16 -o "$WAN_INTERFACE" -j ACCEPT

# Save iptables rules
if command -v iptables-save >/dev/null 2>&1; then
    mkdir -p /etc/iptables
    iptables-save > /etc/iptables/rules.v4
fi

echo "=========================================================="
echo "Host NAT forwarding active for subnets 10.100.0.0/16."
echo "Tenant VPC instances now have outbound internet access."
echo "=========================================================="
