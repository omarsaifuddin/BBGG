import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, Copy, Check, Trash2, Terminal, Shield } from 'lucide-react';
import { portApi, vpsApi } from '../services/api';
import { AddPortModal } from '../components/AddPortModal';

export const PortsView = () => {
  const [ports, setPorts] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchData = async () => {
    try {
      const [portsRes, vpsRes] = await Promise.all([portApi.list(), vpsApi.list()]);
      setPorts(portsRes.data);
      setInstances(vpsRes.data);
    } catch (err) {
      console.error('Failed to fetch port mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id, port) => {
    if (!window.confirm(`Delete port forwarding rule for port ${port}?`)) return;
    try {
      await portApi.delete(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove port forward');
    }
  };

  const copyConnection = (connStr, id) => {
    navigator.clipboard.writeText(connStr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>High-Port Forwarding</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              TCP / UDP Services
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Expose raw non-HTTP protocols (SSH, PostgreSQL, MySQL, Game Servers) through high-ports on your single public IP.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Expose New Port</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed">
        <strong>Single Public IP Strategy:</strong> Since standard HTTP/HTTPS traffic is routed by domain name on ports 80 & 443, 
        non-HTTP traffic (like SSH on port 22 or MySQL on port 3306) is assigned a dedicated high port (range <code>20000–29999</code>) 
        and forwarded directly to the tenant VPS via host firewall DNAT rules.
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading port forwards...</div>
      ) : ports.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <ArrowRightLeft className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Port Forwards Active</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Need direct SSH or database connection from outside? Expose an internal port on your VPS.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
          >
            Expose Port
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Service Label</th>
                  <th className="px-6 py-3.5 font-semibold">Protocol</th>
                  <th className="px-6 py-3.5 font-semibold">Public Endpoint</th>
                  <th className="px-6 py-3.5 font-semibold">Internal Destination</th>
                  <th className="px-6 py-3.5 font-semibold">Connection Command</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ports.map((pf) => (
                  <tr key={pf.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-100">{pf.description || 'Custom Port'}</span>
                      <span className="block text-[10px] text-slate-400">{pf.vps_name}</span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {pf.protocol}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {pf.public_ip}:{pf.external_port}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-300">
                      {pf.internal_ip}:{pf.internal_port}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <code className="font-mono text-[11px] text-slate-300 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 max-w-xs truncate">
                          {pf.connection_string}
                        </code>
                        <button
                          onClick={() => copyConnection(pf.connection_string, pf.id)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Copy connection string"
                        >
                          {copiedId === pf.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(pf.id, pf.external_port)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Port Forward"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AddPortModal
          instances={instances}
          onClose={() => setShowModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};
