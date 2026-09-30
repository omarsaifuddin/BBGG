import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Network, Server, Globe, ArrowRightLeft, CreditCard, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/vpcs', label: 'VPCs & Networks', icon: Network },
  { to: '/vps', label: 'VPS Instances', icon: Server },
  { to: '/domains', label: 'Domain Routing (Ingress)', icon: Globe },
  { to: '/ports', label: 'Port Forwarding', icon: ArrowRightLeft },
  { to: '/billing', label: 'Billing & Plans', icon: CreditCard },
  { to: '/status', label: 'System Health', icon: Activity, adminOnly: true },
];

export const Sidebar = () => {
  const { user } = useAuth();
  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.is_admin);

  return (
    <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col justify-between p-4">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Cloud Console
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-xs text-slate-400">
        <div className="flex items-center justify-between font-medium text-slate-300 mb-1">
          <span>Hypervisor</span>
          <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">ONLINE</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Proxmox VE 8+ SDN with Caddy On-Demand TLS & dynamic port forwarder.
        </p>
      </div>
    </aside>
  );
};
