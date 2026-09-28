import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, Server, LogOut, User as UserIcon, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Cloud className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            CloudControl
          </span>
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Proxmox VPC
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Single IP Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Single-IP Host Ingress:</span>
          <span className="font-mono text-emerald-400 font-medium">Active (SNI + Caddy)</span>
        </div>

        {/* User profile & logout */}
        {user && (
          <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-slate-200">{user.full_name || user.email.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
