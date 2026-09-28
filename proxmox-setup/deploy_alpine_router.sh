#!/usr/bin/env bash
# ==============================================================================
# Deploy Lightweight Alpine Linux Router / Gateway VM
# Takes: VMID, VPC_NAME, VNET_BRIDGE, ROUTER_IP
# Consumes ~128MB RAM
# ==============================================================================
set -euo pipefail

ROUTER_VMID="${1:-9000}"
VPC_NAME="${2:-vpc1}"
VNET_BRIDGE="${3:-vnet101}"
ROUTER_IP="${4:-10.100.1.1}"
STORAGE_POOL="${5:-local-lvm}"

echo "Deploying Alpine Router VMID $ROUTER_VMID for VPC $VPC_NAME..."

# 1. Download Alpine Virt ISO if not already cached
ALPINE_ISO="/var/lib/vz/template/iso/alpine-virt-3.20.0-x86_64.iso"
if [ ! -f "$ALPINE_ISO" ]; then
    echo "Fetching Alpine Virt ISO..."
    wget -q --show-progress -O "$ALPINE_ISO" https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-virt-3.20.0-x86_64.iso
fi

# 2. Create VM with dual NICs:
# net0: WAN bridge (vmbr0)
# net1: Tenant Private VPC Bridge (vnet101)
qm create "$ROUTER_VMID" --name "router-${VPC_NAME}" \
    --memory 128 \
    --cores 1 \
    --net0 virtio,bridge=vmbr0,firewall=1 \
    --net1 virtio,bridge="${VNET_BRIDGE}",firewall=0 \
    --ostype l26 \
    --onboot 1

qm set "$ROUTER_VMID" --scsihw virtio-scsi-pci
qm set "$ROUTER_VMID" --scsi0 "${STORAGE_POOL}:4"
qm set "$ROUTER_VMID" --cdrom "local:iso/alpine-virt-3.20.0-x86_64.iso"
qm set "$ROUTER_VMID" --boot order=scsi0;ide2

echo "Alpine router VM $ROUTER_VMID created successfully."
