import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { VpcView } from './pages/VpcView';
import { VpsView } from './pages/VpsView';
import { DomainsView } from './pages/DomainsView';
import { PortsView } from './pages/PortsView';
import { BillingView } from './pages/BillingView';
import { StatusView } from './pages/StatusView';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const ProtectedLayout = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-xs text-slate-500">
        Initializing cloud session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vpcs" element={<VpcView />} />
            <Route path="/vps" element={<VpsView />} />
            <Route path="/domains" element={<DomainsView />} />
            <Route path="/ports" element={<PortsView />} />
            <Route path="/billing" element={<BillingView />} />
            <Route path="/status" element={user?.is_admin ? <StatusView /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
};
