import React, { useState, useEffect } from 'react';
import { Network, Plus, Shield, Trash2, Key, Globe, Server } from 'lucide-react';
import { vpcApi } from '../services/api';
import { CreateVpcModal } from '../components/CreateVpcModal';
import { WireGuardModal } from '../components/WireGuardModal';

export const VpcView = () => {
  const [vpcs, setVpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWireguardVpc, setSelectedWireguardVpc] = useState(null);

  const fetchVpcs = async () => {
    try {
      const res = await vpcApi.list();
      setVpcs(res.data);
    } catch (err) {
      console.error('Failed to fetch VPCs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVpcs();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete VPC "${name}"? All associated instances will be terminated.`)) {
      return;
    }
    try {
      await vpcApi.delete(id);
      fetchVpcs();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete VPC');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Virtual Private Clouds (VPC)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {vpcs.length} Subnets
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Software Defined Networks (SDN) isolating customer environments with dedicated virtual router gateways.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create VPC</span>
        </button>
      </div>

      {/* Grid of VPCs */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading VPC networks...</div>
      ) : vpcs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <Network className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No VPCs Created</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create an isolated VPC network to get started. Each VPC receives an automated /24 private subnet and lightweight Alpine router gateway.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
          >
            Create Your First VPC
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vpcs.map((vpc) => (
            <div
              key={vpc.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Network className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-100">{vpc.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400">Bridge: {vpc.vnet_id}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {vpc.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Subnet CIDR:</span>
                    <span className="font-mono text-sky-400 font-semibold">{vpc.cidr_block}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Router Gateway:</span>
                    <span className="font-mono text-slate-300">{vpc.router_ip}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Active Instances:</span>
                    <span className="text-slate-300 font-medium">{vpc.vps_count} VPS</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => setSelectedWireguardVpc(vpc)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>WireGuard VPN</span>
                </button>

                <button
                  onClick={() => handleDelete(vpc.id, vpc.name)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete VPC"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateVpcModal onClose={() => setShowCreateModal(false)} onSuccess={fetchVpcs} />
      )}
      {selectedWireguardVpc && (
        <WireGuardModal vpc={selectedWireguardVpc} onClose={() => setSelectedWireguardVpc(null)} />
      )}
    </div>
  );
};
