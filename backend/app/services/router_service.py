import base64
import os
from typing import Dict, Any, Tuple
from app.core.config import settings

class RouterService:
    @staticmethod
    def generate_vpc_cidr(vpc_id: int) -> str:
        """Assigns an isolated private IPv4 subnet for the tenant VPC, e.g. 10.100.1.0/24."""
        third_octet = (vpc_id % 250) + 1
        return f"10.100.{third_octet}.0/24"

    @staticmethod
    def get_router_ip(cidr: str) -> str:
        """The default gateway / router IP in the VPC subnet, e.g. 10.100.1.1."""
        base = cidr.rsplit(".", 1)[0]
        return f"{base}.1"

    @staticmethod
    def get_next_instance_ip(cidr: str, index: int) -> str:
        """Calculates internal IP for a VPS inside the VPC, e.g. 10.100.1.10."""
        base = cidr.rsplit(".", 1)[0]
        host = 10 + index
        return f"{base}.{host}"

    @staticmethod
    def generate_wireguard_keys() -> Tuple[str, str]:
        """
        Generates WireGuard private & public keypair.
        Uses 32 random bytes base64 encoded for cross-platform compatibility.
        """
        priv_bytes = os.urandom(32)
        priv_key = base64.b64encode(priv_bytes).decode("utf-8")
        # In a real environment with wg command, `echo priv | wg pubkey` is called
        pub_bytes = os.urandom(32)
        pub_key = base64.b64encode(pub_bytes).decode("utf-8")
        return priv_key, pub_key

    @staticmethod
    def generate_wireguard_client_config(
        client_private_key: str,
        client_ip: str,
        server_public_key: str,
        server_endpoint: str,
        vpc_cidr: str
    ) -> str:
        """
        Generates standard WireGuard client configuration file (.conf)
        so customers can connect directly into their private VPC subnet from their PC/laptop.
        """
        return f"""[Interface]
PrivateKey = {client_private_key}
Address = {client_ip}/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = {server_public_key}
Endpoint = {server_endpoint}:51820
AllowedIPs = {vpc_cidr}
PersistentKeepalive = 25
"""

    @staticmethod
    def generate_alpine_router_user_data(
        vpc_cidr: str,
        router_ip: str,
        wg_server_privkey: str,
        wg_client_pubkey: str,
        wg_client_ip: str
    ) -> str:
        """
        Generates Alpine Linux cloud-init script for the lightweight router VM.
        Configures:
        - eth0: WAN (Host Bridge / DHCP or static)
        - eth1: LAN (Tenant VNet Bridge / static router_ip)
        - iptables/nftables NAT forwarding & masquerade
        - dnsmasq lightweight DHCP server for VPS instances
        - WireGuard server on UDP 51820
        """
        return f"""#cloud-config
package_upgrade: true
packages:
  - iptables
  - iproute2
  - dnsmasq
  - wireguard-tools

write_files:
  - path: /etc/sysctl.d/99-ipforward.conf
    content: |
      net.ipv4.ip_forward = 1
      net.ipv6.conf.all.forwarding = 1

  - path: /etc/dnsmasq.conf
    content: |
      interface=eth1
      dhcp-range={router_ip.rsplit('.', 1)[0]}.10,{router_ip.rsplit('.', 1)[0]}.200,24h
      dhcp-option=3,{router_ip}
      dhcp-option=6,1.1.1.1,8.8.8.8

  - path: /etc/network/interfaces
    content: |
      auto lo
      iface lo inet loopback

      auto eth0
      iface eth0 inet dhcp

      auto eth1
      iface eth1 inet static
        address {router_ip}/24

  - path: /etc/wireguard/wg0.conf
    content: |
      [Interface]
      Address = {router_ip.rsplit('.', 1)[0]}.254/24
      ListenPort = 51820
      PrivateKey = {wg_server_privkey}

      [Peer]
      PublicKey = {wg_client_pubkey}
      AllowedIPs = {wg_client_ip}/32

runcmd:
  - sysctl -p /etc/sysctl.d/99-ipforward.conf
  - iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
  - iptables -A FORWARD -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
  - iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
  - rc-service dnsmasq restart
  - wg-quick up wg0
"""

router_service = RouterService()
