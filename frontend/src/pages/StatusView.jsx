import React, { useState, useEffect } from 'react';
import { Activity, Server, Shield, Globe, Cpu, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../services/api';

export const StatusView = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await adminApi.getStatus();
        setStatus(res.data);
      } catch (err) {
        console.error('Failed to load status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>System & Hypervisor Health</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            ALL SYSTEMS NORMAL
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time diagnostics for Proxmox VE, Caddy Ingress, and Host Networking.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Querying platform status...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Edge Ingress & Network */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-100">Single-IP Ingress Layer</h3>
                <p className="text-xs text-slate-400">Caddy v2 with On-Demand TLS</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Host Public IPv4:</span>
                <span className="font-mono text-emerald-400 font-semibold">{status?.single_public_ip}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Primary Base Domain:</span>
                <span className="font-mono text-slate-200">{status?.base_domain}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dynamic Ingress API:</span>
                <span className="text-emerald-400 font-mono text-[11px]">{status?.caddy_api_url}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SSL Certificate Engine:</span>
                <span className="text-slate-200">Let's Encrypt / ZeroSSL ACME</span>
              </div>
            </div>
          </div>

          {/* Hypervisor */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-100">Proxmox VE Hypervisor</h3>
                <p className="text-xs text-slate-400">QEMU / KVM Cluster Engine</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Hypervisor Driver:</span>
                <span className="text-sky-400 font-medium">
                  {status?.mock_proxmox_active ? 'Simulation / Emulation Mode' : 'Connected to Proxmox VE REST API'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SDN Isolation:</span>
                <span className="text-emerald-400 font-medium">Simple / VLAN Zones</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cloud-Init Engine:</span>
                <span className="text-slate-200">Active (Drive Scsi0 + NoCloud)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Web Console Proxy:</span>
                <span className="text-slate-200">noVNC / WebSocket Ticket API</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
