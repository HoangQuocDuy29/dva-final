import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Send, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { AdminTabNav } from './AdminTabNav';

export const AdminHeader: React.FC = () => {
  const { currentUser, loading, fetchData, openGuestModal } = useAdminDashboard();

  return (
    <header className="bg-[#121826] border-b border-slate-800 px-6 py-4 sticky top-0 z-30 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white shadow font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-lg text-white">
                DVA Club Management Workspace
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-200 border border-red-700 font-mono">
                {currentUser.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Connected Admin: <strong>{currentUser.fullName}</strong> ({currentUser.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openGuestModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-purple-950/40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Mail Khách Vãng Lai</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#161F30] border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/"
            className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to Public Website</span>
          </Link>
        </div>
      </div>

      {/* Dedicated Admin Module Navigation Tabs */}
      <AdminTabNav />
    </header>
  );
};
