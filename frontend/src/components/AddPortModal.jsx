import React, { useState } from 'react';
import { X, ArrowRightLeft, Plus, Loader2 } from 'lucide-react';
import { portApi } from '../services/api';

export const AddPortModal = ({ instances, onClose, onSuccess }) => {
  const [vpsId, setVpsId] = useState(instances[0]?.id || '');
  const [internalPort, setInternalPort] = useState(22);
  const [protocol, setProtocol] = useState('TCP');
  const [description, setDescription] = useState('SSH Access');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vpsId) return;
    setLoading(true);
    setError('');

    try {
      await portApi.create({
        vps_id: parseInt(vpsId),
        internal_port: parseInt(internalPort),
        protocol: protocol,
        description: description.trim() || 'Port Forward',
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to allocate port forward');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Expose TCP / UDP Port</h3>
              <p className="text-xs text-slate-400">Maps single public IP high-port to internal VPS service</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Destination VPS</label>
            <select
              value={vpsId}
              onChange={(e) => setVpsId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            >
              {instances.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.internal_ip})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Internal Port on VPS</label>
              <input
                type="number"
                min="1"
                max="65535"
                required
                value={internalPort}
                onChange={(e) => setInternalPort(e.target.value)}
                placeholder="22, 5432, 25565..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Protocol</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="TCP">TCP (SSH, HTTP, Database)</option>
                <option value="UDP">UDP (DNS, Gaming, Streaming)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Label / Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Remote SSH Access, Postgres DB"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300/90 leading-relaxed">
            The platform will automatically allocate an unused public high-port in range <code>20000-29999</code> and 
            configure firewall NAT forwarding.
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
              disabled={loading || instances.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{loading ? 'Allocating...' : 'Expose Port'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
