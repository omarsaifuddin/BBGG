import React, { useState } from 'react';
import { X, Server, Plus, Loader2, Cpu, HardDrive } from 'lucide-react';
import { vpsApi } from '../services/api';

const OS_OPTIONS = [
  { id: 'ubuntu', name: 'Ubuntu 24.04 LTS', desc: 'Noble Numbat Minimal Cloud-Init', tag: 'Recommended' },
  { id: 'debian', name: 'Debian 12', desc: 'Bookworm Generic Cloud-Init', tag: 'Stable' },
  { id: 'alpine', name: 'Alpine Linux 3.20', desc: 'Ultra-lightweight (Fast boot)', tag: 'Micro' },
];

export const CreateVpsModal = ({ vpcs, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [vpcId, setVpcId] = useState(vpcs[0]?.id || '');
  const [osType, setOsType] = useState('ubuntu');
  const [cores, setCores] = useState(2);
  const [memoryMb, setMemoryMb] = useState(2048);
  const [diskGb, setDiskGb] = useState(25);
  const [sshKey, setSshKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !vpcId) return;
    setLoading(true);
    setError('');

    try {
      await vpsApi.create({
        name: name.trim(),
        vpc_id: parseInt(vpcId),
        os_type: osType,
        cores: parseInt(cores),
        memory_mb: parseInt(memoryMb),
        disk_gb: parseInt(diskGb),
        ssh_public_key: sshKey.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to launch VPS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Launch Cloud-Init VPS</h3>
              <p className="text-xs text-slate-400">Automated QEMU VM provisioning inside your VPC</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* VPC Selection & Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Instance Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. web-backend-01"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Target VPC Network</label>
              <select
                value={vpcId}
                onChange={(e) => setVpcId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
              >
                {vpcs.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.cidr_block})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OS Template Choice */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Operating System Image</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {OS_OPTIONS.map((os) => (
                <div
                  key={os.id}
                  onClick={() => setOsType(os.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    osType === os.id
                      ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-200">{os.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {os.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{os.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>vCPU Cores</span>
                <span className="font-mono text-sky-400 font-semibold">{cores} Cores</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={cores}
                onChange={(e) => setCores(e.target.value)}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>RAM Memory</span>
                <span className="font-mono text-sky-400 font-semibold">{memoryMb} MB</span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="512"
                value={memoryMb}
                onChange={(e) => setMemoryMb(e.target.value)}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Storage Disk</span>
                <span className="font-mono text-sky-400 font-semibold">{diskGb} GB</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={diskGb}
                onChange={(e) => setDiskGb(e.target.value)}
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          {/* SSH Public Key */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              SSH Public Key (Optional - cloud-init injection)
            </label>
            <textarea
              rows={2}
              value={sshKey}
              onChange={(e) => setSshKey(e.target.value)}
              placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... user@workstation"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              If left blank, an auto-generated root password will be available via Web Console.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{loading ? 'Cloning & Launching...' : 'Launch VPS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
