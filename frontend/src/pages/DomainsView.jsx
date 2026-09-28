import React, { useState, useEffect } from 'react';
import { Globe, Plus, ShieldCheck, Trash2, ArrowRight, ExternalLink, HelpCircle, Copy, Check } from 'lucide-react';
import { domainApi, vpsApi } from '../services/api';
import { AddDomainModal } from '../components/AddDomainModal';

export const DomainsView = () => {
  const [routes, setRoutes] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(null);

  const fetchData = async () => {
    try {
      const [routesRes, vpsRes] = await Promise.all([domainApi.list(), vpsApi.list()]);
      setRoutes(routesRes.data);
      setInstances(vpsRes.data);
    } catch (err) {
      console.error('Failed to fetch domain routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id, domain) => {
    if (!window.confirm(`Are you sure you want to remove domain route "${domain}"?`)) return;
    try {
      await domainApi.delete(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove domain route');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedTarget(id);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Domain Ingress Routing</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Single-IP Architecture
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Route incoming HTTP & HTTPS traffic dynamically to internal VPS ports based on Host domain name with automated SSL.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Domain Route</span>
        </button>
      </div>

      {/* Single-IP Mechanics Explainer */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>How Single-IP Domain Routing Operates:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-200 block mb-1">1. DNS CNAME Record</span>
            In your domain registrar (GoDaddy, Cloudflare, Namecheap), add a CNAME record pointing your domain or subdomain to this host.
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-200 block mb-1">2. Edge Ingress SNI Inspection</span>
            When visitors request your domain on ports 80/443, our Caddy proxy detects the requested hostname using HTTP Host headers & TLS SNI.
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-200 block mb-1">3. Automated On-Demand SSL</span>
            Let's Encrypt certificates are provisioned on-the-fly and traffic is forwarded to your VPS's internal IP (e.g. <code>10.100.1.10:3000</code>).
          </div>
        </div>
      </div>

      {/* Routes Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading domain routes...</div>
      ) : routes.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <Globe className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Domains Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Connect custom domains or subdomains to route directly into your private VPS containers or web apps.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Add First Domain Route
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Incoming Domain</th>
                  <th className="px-6 py-3.5 font-semibold">Destination VPS</th>
                  <th className="px-6 py-3.5 font-semibold">Internal Target</th>
                  <th className="px-6 py-3.5 font-semibold">SSL / TLS</th>
                  <th className="px-6 py-3.5 font-semibold">Required DNS CNAME</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {routes.map((route) => (
                  <tr key={route.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-100">{route.domain}</span>
                        <a
                          href={`https://${route.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-emerald-400"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {route.vps_name}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        {route.target_ip}:{route.target_port}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Let's Encrypt (Active)</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {route.cname_target}
                        </span>
                        <button
                          onClick={() => copyToClipboard(route.cname_target, route.id)}
                          className="text-slate-500 hover:text-slate-300"
                          title="Copy CNAME target"
                        >
                          {copiedTarget === route.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(route.id, route.domain)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Route"
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
        <AddDomainModal
          instances={instances}
          onClose={() => setShowModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};
