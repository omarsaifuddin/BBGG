import logging
import random
from typing import Set, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class FirewallService:
    def __init__(self):
        self.min_port = settings.PORT_FORWARD_MIN
        self.max_port = settings.PORT_FORWARD_MAX

    def allocate_port(self, used_ports: Set[int]) -> int:
        """
        Allocates an unused public high-port in the range [20000, 29999].
        """
        available = set(range(self.min_port, self.max_port + 1)) - used_ports
        if not available:
            raise ValueError("All external high-ports in the allocation pool are exhausted.")
        return random.choice(list(available))

    def generate_dnat_rule(
        self,
        protocol: str,
        external_port: int,
        internal_ip: str,
        internal_port: int
    ) -> str:
        """
        Generates iptables command to forward traffic from public IP to internal VPS.
        """
        proto = protocol.lower()
        return (
            f"iptables -t nat -A PREROUTING -p {proto} -d {settings.PUBLIC_IP} "
            f"--dport {external_port} -j DNAT --to-destination {internal_ip}:{internal_port}"
        )

    def generate_dnat_delete_rule(
        self,
        protocol: str,
        external_port: int,
        internal_ip: str,
        internal_port: int
    ) -> str:
        """
        Generates iptables command to remove DNAT rule.
        """
        proto = protocol.lower()
        return (
            f"iptables -t nat -D PREROUTING -p {proto} -d {settings.PUBLIC_IP} "
            f"--dport {external_port} -j DNAT --to-destination {internal_ip}:{internal_port}"
        )

firewall_service = FirewallService()
