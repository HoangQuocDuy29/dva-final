import React, { useState, useEffect } from 'react';
import { X, Table, RefreshCw, Check, Database } from 'lucide-react';
import { sheetsService } from '../../services/api';

interface GoogleSheetsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsViewerModal: React.FC<GoogleSheetsViewerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations'>('Court_Bookings');
  const [sheetsData, setSheetsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const fetchSheet = async () => {
    setLoading(true);
    try {
      const data = await sheetsService.getSheetsData();
      setSheetsData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSheet();
    }
  }, [isOpen]);

  const handleManualSync = async () => {
    setSyncStatus('Dispatching row append command via Google Sheets API v4...');
    try {
      await sheetsService.syncRow(activeTab, {
        Timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        Manual_Trigger: 'Admin Console Sync',
        Status: 'ACTIVE',
      });
      setTimeout(() => {
        setSyncStatus('Successfully appended 1 row to Google Sheets master document!');
        fetchSheet();
        setTimeout(() => setSyncStatus(null), 3000);
      }, 700);
    } catch (e) {
      setSyncStatus('API sync error occurred.');
    }
  };

  if (!isOpen) return null;

  const currentRows = sheetsData?.tabs?.[activeTab] || [];
  const columnKeys = currentRows.length > 0 ? Object.keys(currentRows[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#161F30] rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-700 overflow-hidden text-white flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-emerald-950 px-6 py-4.5 border-b border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
              <Table className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Google Sheets Integration (Live Sync API v4)
                </h3>
                <span className="text-[10px] bg-emerald-900 border border-emerald-700 text-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  Spreadsheet ID: 1dVa...2026
                </span>
              </div>
              <p className="text-xs text-emerald-300">
                Automated multi-tab sync across Court Bookings, Tryouts, and Academy Registrations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSheet}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 rounded-lg text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-900 hover:bg-emerald-800 flex items-center justify-center text-emerald-200 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className="bg-emerald-950/80 border-b border-emerald-700 px-6 py-2 text-xs text-emerald-200 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-[#121826] border-b border-slate-800 px-6 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('Court_Bookings')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'Court_Bookings'
                  ? 'bg-[#161F30] text-emerald-400 border-t-2 border-emerald-500 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tab 1: Court_Bookings</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 text-[10px] rounded-full font-mono border border-emerald-800">
                {sheetsData?.tabs?.Court_Bookings?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('Member_Registrations')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'Member_Registrations'
                  ? 'bg-[#161F30] text-emerald-400 border-t-2 border-emerald-500 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tab 2: Member_Registrations</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 text-[10px] rounded-full font-mono border border-emerald-800">
                {sheetsData?.tabs?.Member_Registrations?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('Training_Registrations')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'Training_Registrations'
                  ? 'bg-[#161F30] text-emerald-400 border-t-2 border-emerald-500 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tab 3: Training_Registrations</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 text-[10px] rounded-full font-mono border border-emerald-800">
                {sheetsData?.tabs?.Training_Registrations?.length || 0}
              </span>
            </button>
          </div>

          <div className="pb-2">
            <button
              onClick={handleManualSync}
              className="text-xs font-semibold px-3 py-1 bg-[#161F30] border border-slate-700 rounded-lg text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Row Append</span>
            </button>
          </div>
        </div>

        {/* Sheet Table Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-[#0B0F19]">
          {currentRows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No entries currently recorded in sheet tab: {activeTab}.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#121826]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0E1524] border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2.5 px-3 border-r border-slate-800 w-10 text-center font-mono">
                      #
                    </th>
                    {columnKeys.map((col) => (
                      <th key={col} className="py-2.5 px-3 border-r border-slate-800 whitespace-nowrap text-white">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px] text-slate-300">
                  {currentRows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-800 text-center text-slate-500 bg-[#0E1524]">
                        {idx + 1}
                      </td>
                      {columnKeys.map((col) => {
                        const val = row[col];
                        const isStatus = col.toLowerCase().includes('status');
                        return (
                          <td key={col} className="py-2 px-3 border-r border-slate-800 whitespace-nowrap">
                            {isStatus ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                val === 'PAID' || val === 'APPROVED' || val === 'CONFIRMED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : val === 'PENDING'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {val}
                              </span>
                            ) : (
                              typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#121826] border-t border-slate-800 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Service Account: dva-sheets-sync@dva-volleyball-club.iam.gserviceaccount.com</span>
          </div>
          <span className="font-mono text-slate-500">{currentRows.length} rows verified</span>
        </div>

      </div>
    </div>
  );
};
