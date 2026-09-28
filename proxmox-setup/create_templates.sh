#!/usr/bin/env bash
# ==============================================================================
# Proxmox Cloud-Init VM Template Creator
# Run on Proxmox VE Host to create Ubuntu, Debian, and Alpine templates.
# ==============================================================================
set -euo pipefail

STORAGE_POOL="${1:-local-lvm}"

echo "=========================================================="
echo "Creating Cloud-Init VM Templates on Storage: $STORAGE_POOL"
echo "=========================================================="

# 1. Download official cloud images
mkdir -p /tmp/cloud-images
cd /tmp/cloud-images

echo "[1/3] Downloading Ubuntu 24.04 Noble Numbat cloud image..."
if [ ! -f ubuntu-24.04-minimal-cloudimg-amd64.img ]; then
    wget -q --show-progress https://cloud-images.ubuntu.com/minimal/releases/noble/release/ubuntu-24.04-minimal-cloudimg-amd64.img
fi

echo "[2/3] Downloading Debian 12 Bookworm generic cloud image..."
if [ ! -f debian-12-generic-amd64.qcow2 ]; then
    wget -q --show-progress https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2
fi

echo "[3/3] Downloading Alpine Linux 3.20 cloud image..."
if [ ! -f alpine-standard-3.20.0-x86_64.iso ]; then
    wget -q --show-progress https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-virt-3.20.0-x86_64.iso || true
fi

# Function to build a cloud-init template VM
build_template() {
    local VMID=$1
    local NAME=$2
    local IMAGE=$3

    echo "Building Template VMID $VMID: $NAME..."

    # Destroy old if exists
    qm stop "$VMID" 2>/dev/null || true
    qm destroy "$VMID" 2>/dev/null || true

    # Create base VM
    qm create "$VMID" --name "$NAME" --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0
    qm importdisk "$VMID" "$IMAGE" "$STORAGE_POOL"
    
    # Configure scsi hardware & cloudinit drive
    qm set "$VMID" --scsihw virtio-scsi-pci --scsi0 "${STORAGE_POOL}:vm-${VMID}-disk-0"
    qm set "$VMID" --ide2 "${STORAGE_POOL}:cloudinit"
    qm set "$VMID" --boot c --bootdisk scsi0
    qm set "$VMID" --serial0 socket --vga serial0
    qm set "$VMID" --agent enabled=1

    # Convert to template
    qm template "$VMID"
    echo "✓ Template $VMID ($NAME) created successfully."
}

# Create Ubuntu 24.04 Template (VMID 9001)
build_template 9001 "ubuntu-2404-template" "ubuntu-24.04-minimal-cloudimg-amd64.img"

# Create Debian 12 Template (VMID 9002)
build_template 9002 "debian-12-template" "debian-12-generic-amd64.qcow2"

echo "=========================================================="
echo "All VM templates ready for dynamic cloning!"
echo "=========================================================="
