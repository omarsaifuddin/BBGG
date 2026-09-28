import React, { useState, useEffect } from 'react';
import { Network, Server, Globe, ArrowRightLeft, Plus, Cpu, HardDrive, ShieldCheck, ExternalLink, Activity } from 'lucide-react';
import { vpcApi, vpsApi, domainApi, portApi } from '../services/api';
import { CreateVpsModal } from '../components/CreateVpsModal';
import { CreateVpcModal } from '../components/CreateVpcModal';
import { AddDomainModal } from '../components/AddDomainModal';
import { VncConsoleModal } from '../components/VncConsoleModal';

export const Dashboard = () => {
  const [vpcs, setVpcs] = useState([]);
  const [vpsList, setVpsList] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showVpcModal, setShowVpcModal] = useState(false);
  const [showVpsModal, setShowVpsModal] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [activeConsoleVps, setActiveConsoleVps] = useState(null);

  const loadData = async () => {
    try {
      const [vpcsRes, vpsRes, routesRes, portsRes] = await Promise.all([
        vpcApi.list(),
        vpsApi.list(),
        domainApi.list(),
        portApi.list(),
      ]);
      setVpcs(vpcsRes.data);
      setVpsList(vpsRes.data);
      setRoutes(routesRes.data);
      setPorts(portsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCores = vpsList.reduce((acc, v) => acc + (v.cores || 0), 0);
  const totalRamGb = Math.round(vpsList.reduce((acc, v) => acc + (v.memory_mb || 0), 0) / 1024);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Customer Cloud Console</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              VPC Active
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Automated Proxmox hypervisor automation. Your VPS instances run inside private isolated VPC subnets, 
            routed publicly using your single IP with dynamic reverse proxying and automated Let's Encrypt TLS.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowVpcModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Network className="w-4 h-4 text-sky-400" />
            <span>New VPC</span>
          </button>
          <button
            onClick={() => setShowVpsModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
          >
            <Server className="w-4 h-4" />
            <span>Launch VPS</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Isolated VPCs</p>
            <p className="text-2xl font-bold text-white mt-1">{vpcs.length}</p>
            <p className="text-[11px] text-sky-400 mt-1">SDN Simple Zones</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Network className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">VPS Instances</p>
            <p className="text-2xl font-bold text-white mt-1">{vpsList.length}</p>
            <p className="text-[11px] text-emerald-400 mt-1">{totalCores} vCPUs • {totalRamGb}GB RAM</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Server className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Domain Routes (Ingress)</p>
            <p className="text-2xl font-bold text-white mt-1">{routes.length}</p>
            <p className="text-[11px] text-purple-400 mt-1">On-Demand Let's Encrypt</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Exposed High Ports</p>
            <p className="text-2xl font-bold text-white mt-1">{ports.length}</p>
            <p className="text-[11px] text-amber-400 mt-1">SSH / TCP Port Mappings</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent VPS Instances */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Active VPS Instances</h2>
            <button
              onClick={() => setShowVpsModal(true)}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              + Launch Instance
            </button>
          </div>

          {vpsList.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Server className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No VPS instances created yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                First ensure you have a VPC, then launch an Ubuntu, Debian, or Alpine cloud-init instance.
              </p>
              <button
                onClick={() => setShowVpsModal(true)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
              >
                Launch Your First VPS
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {vpsList.map((vps) => (
                <div
                  key={vps.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300">
                      <Server className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-slate-100">{vps.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          VMID {vps.proxmox_vmid}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {vps.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                        <span className="font-mono text-slate-300">{vps.internal_ip}</span>
                        <span>•</span>
                        <span>{vps.cores} vCPU</span>
                        <span>•</span>
                        <span>{vps.memory_mb} MB RAM</span>
                        <span>•</span>
                        <span className="capitalize">{vps.os_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveConsoleVps(vps)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-1.5"
                    >
                      <span>Web Console</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Ingress & Domain Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Domain Ingress (Single IP)</h2>
            <button
              onClick={() => setShowDomainModal(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              + Add Route
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300/90 leading-relaxed">
              <strong>Single-IP Advantage:</strong> Point any domain's CNAME record to this host. Our Caddy ingress
              automatically negotiates TLS certificates and forwards traffic to your private VPC ports.
            </div>

            {routes.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No domain routes mapped yet.</p>
            ) : (
              <div className="space-y-2">
                {routes.slice(0, 3).map((r) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{r.domain}</p>
                      <p className="font-mono text-[11px] text-slate-400">&rarr; {r.target_ip}:{r.target_port}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      SSL Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showVpcModal && (
        <CreateVpcModal onClose={() => setShowVpcModal(false)} onSuccess={loadData} />
      )}
      {showVpsModal && (
        <CreateVpsModal vpcs={vpcs} onClose={() => setShowVpsModal(false)} onSuccess={loadData} />
      )}
      {showDomainModal && (
        <AddDomainModal instances={vpsList} onClose={() => setShowDomainModal(false)} onSuccess={loadData} />
      )}
      {activeConsoleVps && (
        <VncConsoleModal vps={activeConsoleVps} onClose={() => setActiveConsoleVps(null)} />
      )}
    </div>
  );
};
