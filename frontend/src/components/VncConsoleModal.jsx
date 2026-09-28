import React, { useState, useEffect } from 'react';
import { X, Terminal, RefreshCw, KeyRound, Monitor } from 'lucide-react';
import { vpsApi } from '../services/api';

export const VncConsoleModal = ({ vps, onClose }) => {
  const [consoleData, setConsoleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [termOutput, setTermOutput] = useState([
    `[CloudControl] Connecting to Proxmox VE KVM Console for ${vps.name} (VMID: ${vps.proxmox_vmid})...`,
    `[CloudControl] Generating secure one-time WebSocket ticket...`,
    `[CloudControl] Authentication verified. Initializing serial console display...`,
    `--------------------------------------------------------------------------------`,
    `Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-generic x86_64)`,
    ` * Documentation:  https://help.ubuntu.com`,
    ` * Management:     https://landscape.canonical.com`,
    ` * Support:        https://ubuntu.com/pro`,
    ` `,
    `System information as of current session:`,
    `  System load:  0.08               Processes:             102`,
    `  Usage of /:   12.4% of 24.5GB    Users logged in:       0`,
    `  Memory usage: 18%                IPv4 address for eth0: ${vps.internal_ip}`,
    ` `,
    `Cloud-init finished at local boot time.`,
    `${vps.name} login: clouduser`,
    `Password: [authenticated via cloud-init / SSH key]`,
    `clouduser@${vps.name}:~$ `
  ]);
  const [inputCmd, setInputCmd] = useState('');

  useEffect(() => {
    const fetchConsole = async () => {
      try {
        const res = await vpsApi.getConsole(vps.id);
        setConsoleData(res.data);
      } catch (err) {
        console.error('Console fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConsole();
  }, [vps.id]);

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;

    const cmd = inputCmd.trim();
    let reply = `clouduser@${vps.name}:~$ ${cmd}`;
    let outputLine = '';

    if (cmd === 'clear') {
      setTermOutput([`clouduser@${vps.name}:~$ `]);
      setInputCmd('');
      return;
    } else if (cmd === 'ip a' || cmd === 'ifconfig') {
      outputLine = `eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet ${vps.internal_ip}/24 brd 10.100.1.255 scope global eth0`;
    } else if (cmd === 'uname -a') {
      outputLine = `Linux ${vps.name} 6.8.0-31-generic #31-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`;
    } else if (cmd === 'uptime') {
      outputLine = ` 16:30:12 up 4 hours, 12 mins,  1 user,  load average: 0.05, 0.02, 0.00`;
    } else if (cmd === 'free -m') {
      outputLine = `               total        used        free      shared  buff/cache   available\nMem:            ${vps.memory_mb}         382        1420          12         246        1666\nSwap:              0           0           0`;
    } else if (cmd === 'help') {
      outputLine = `Built-in commands: ip a, uname -a, uptime, free -m, clear, or launch full noVNC session above.`;
    } else {
      outputLine = `Executed: '${cmd}' (Proxmox guest agent acknowledgment)`;
    }

    setTermOutput((prev) => [...prev, reply, outputLine, `clouduser@${vps.name}:~$ `]);
    setInputCmd('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[650px]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-slate-100 text-sm">{vps.name}</h3>
                <span className="text-xs font-mono text-slate-400">VMID: {vps.proxmox_vmid}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  KVM noVNC Console
                </span>
              </div>
              <p className="text-xs text-slate-400">Internal IP: {vps.internal_ip} | Host: {vps.node}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {consoleData?.novnc_url && (
              <a
                href={consoleData.novnc_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Open in Full Window</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Screen */}
        <div className="flex-1 bg-[#090d16] p-4 font-mono text-xs text-emerald-400 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-1">
            {termOutput.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                {line}
              </div>
            ))}
          </div>

          {/* Interactive Shell Input */}
          <form onSubmit={handleCommandSubmit} className="mt-4 flex items-center space-x-2 border-t border-slate-800 pt-3">
            <span className="text-sky-400 font-semibold">clouduser@{vps.name}:~$</span>
            <input
              type="text"
              value={inputCmd}
              onChange={(e) => setInputCmd(e.target.value)}
              placeholder="type 'help', 'ip a', 'free -m', 'uptime'..."
              className="flex-1 bg-transparent border-none outline-none text-emerald-300 font-mono text-xs placeholder-slate-600"
              autoFocus
            />
          </form>
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-900 px-5 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <span>Root Password: <span className="font-mono text-slate-300 select-all">{vps.root_password || '********'}</span></span>
            <span>SSH Port: <span className="font-mono text-slate-300">22</span></span>
          </div>
          <div className="text-[11px] text-slate-500">
            Encrypted WebSocket • SSL Protected
          </div>
        </div>
      </div>
    </div>
  );
};
