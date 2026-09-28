import React, { useState, useEffect } from 'react';
import { Server, Plus, Play, Square, RotateCw, Terminal, Trash2, Cpu, HardDrive, Layers, RefreshCw } from 'lucide-react';
import { vpsApi, vpcApi } from '../services/api';
import { CreateVpsModal } from '../components/CreateVpsModal';
import { VncConsoleModal } from '../components/VncConsoleModal';

export const VpsView = () => {
  const [instances, setInstances] = useState([]);
  const [vpcs, setVpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeConsoleVps, setActiveConsoleVps] = useState(null);

  const fetchData = async () => {
    try {
      const [vpsRes, vpcRes] = await Promise.all([vpsApi.list(), vpcApi.list()]);
      setInstances(vpsRes.data);
      setVpcs(vpcRes.data);
    } catch (err) {
      console.error('Failed to fetch VPS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id, action) => {
    setActionLoadingId(id);
    try {
      await vpsApi.action(id, action);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to perform ${action}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id, name, vmid) => {
    if (!window.confirm(`Are you sure you want to destroy VPS "${name}" (VMID: ${vmid})? This action cannot be undone.`)) {
      return;
    }
    try {
      await vpsApi.delete(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to destroy VPS');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>VPS Instances</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {instances.length} Instances
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Proxmox QEMU virtual machines provisioned with cloud-init on isolated VPC networks.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start">
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Instances"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Launch VPS</span>
          </button>
        </div>
      </div>

      {/* Instance List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading instances...</div>
      ) : instances.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <Server className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No VPS Instances</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Deploy an Ubuntu 24.04, Debian 12, or Alpine cloud-init virtual machine into your VPC.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
          >
            Launch VPS Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {instances.map((vps) => (
            <div
              key={vps.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Title & Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-sm text-slate-100">{vps.name}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          VMID {vps.proxmox_vmid}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Node: {vps.node} • OS: <span className="capitalize text-slate-300">{vps.os_type}</span></p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider border ${
                      vps.status === 'RUNNING'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {vps.status}
                  </span>
                </div>

                {/* Specs & Network */}
                <div className="grid grid-cols-3 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Internal IP</span>
                    <span className="font-mono text-sky-400 font-semibold">{vps.internal_ip}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">CPU & RAM</span>
                    <span className="text-slate-200">{vps.cores} Cores / {vps.memory_mb} MB</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Disk</span>
                    <span className="text-slate-200">{vps.disk_gb} GB</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {vps.status === 'RUNNING' ? (
                    <>
                      <button
                        disabled={actionLoadingId === vps.id}
                        onClick={() => handleAction(vps.id, 'stop')}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                        title="Shutdown VM"
                      >
                        <Square className="w-3.5 h-3.5 text-amber-400" />
                        <span>Stop</span>
                      </button>
                      <button
                        disabled={actionLoadingId === vps.id}
                        onClick={() => handleAction(vps.id, 'reboot')}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                        title="Reboot VM"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                        <span>Reboot</span>
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={actionLoadingId === vps.id}
                      onClick={() => handleAction(vps.id, 'start')}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 transition-all"
                      title="Start VM"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveConsoleVps(vps)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-medium border border-sky-500/20 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Web Console</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(vps.id, vps.name, vps.proxmox_vmid)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Destroy VM"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateVpsModal
          vpcs={vpcs}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchData}
        />
      )}
      {activeConsoleVps && (
        <VncConsoleModal vps={activeConsoleVps} onClose={() => setActiveConsoleVps(null)} />
      )}
    </div>
  );
};
