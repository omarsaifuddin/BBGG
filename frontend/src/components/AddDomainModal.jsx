import React, { useState } from 'react';
import { X, Globe, Plus, Loader2, ArrowRight } from 'lucide-react';
import { domainApi } from '../services/api';

export const AddDomainModal = ({ instances, onClose, onSuccess }) => {
  const [domain, setDomain] = useState('');
  const [vpsId, setVpsId] = useState(instances[0]?.id || '');
  const [targetPort, setTargetPort] = useState(80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain.trim() || !vpsId) return;
    setLoading(true);
    setError('');

    try {
      await domainApi.create({
        domain: domain.trim(),
        vps_id: parseInt(vpsId),
        target_port: parseInt(targetPort),
        enable_tls: true,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add domain routing');
    } finally {
      setLoading(false);
    }
  };

  const selectedVps = instances.find((i) => i.id === parseInt(vpsId));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Add Domain Ingress Route</h3>
              <p className="text-xs text-slate-400">Single-IP reverse proxy with On-Demand TLS</p>
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Domain or Subdomain Name
            </label>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. app.mycompany.com or store.mydomain.io"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Destination VPS</label>
              <select
                value={vpsId}
                onChange={(e) => setVpsId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              >
                {instances.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.internal_ip})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Internal Port</label>
              <input
                type="number"
                min="1"
                max="65535"
                required
                value={targetPort}
                onChange={(e) => setTargetPort(e.target.value)}
                placeholder="80, 3000, 8080..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Traffic flow illustration */}
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2 text-slate-300 font-medium">
              <span>Routing Preview:</span>
            </div>
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="text-emerald-400">{domain || 'yourdomain.com'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-sky-400">{selectedVps?.internal_ip || '10.100.x.x'}:{targetPort}</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              • Automatic SSL Certificate (Let's Encrypt / ACME) will be generated upon first request.
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
              disabled={loading || instances.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{loading ? 'Activating Proxy...' : 'Enable Route'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
