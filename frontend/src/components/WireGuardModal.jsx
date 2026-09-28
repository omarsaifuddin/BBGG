import React, { useState, useEffect } from 'react';
import { X, Shield, Download, Copy, Check, Terminal } from 'lucide-react';
import { vpcApi } from '../services/api';

export const WireGuardModal = ({ vpc, onClose }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await vpcApi.getWireguardConfig(vpc.id);
        setConfig(res.data);
      } catch (err) {
        console.error('Failed to load WireGuard config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [vpc.id]);

  const handleCopy = () => {
    if (config?.config_file) {
      navigator.clipboard.writeText(config.config_file);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!config?.config_file) return;
    const element = document.createElement('a');
    const file = new Blob([config.config_file], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${vpc.name.toLowerCase().replace(/\s+/g, '_')}_wireguard.conf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">WireGuard VPC VPN Tunnel</h3>
              <p className="text-xs text-slate-400">Connect your local workstation directly into {vpc.name} ({vpc.cidr_block})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-xs text-purple-300 leading-relaxed">
            Import this configuration into your <strong>WireGuard Client</strong> (macOS, Windows, Linux, iOS, Android). 
            Once activated, you can ping, SSH, or open any internal IP (e.g. <code>{vpc.router_ip}</code>, <code>10.100.1.10</code>) 
            directly from your local terminal.
          </div>

          <div className="relative">
            <pre className="bg-[#090d16] border border-slate-800 p-4 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto select-all">
              {loading ? 'Generating keys and configuration...' : config?.config_file}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Endpoint: <span className="font-mono text-slate-200">{config?.server_endpoint || 'Public IP'}</span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download .conf</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
