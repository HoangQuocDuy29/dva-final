import React from 'react';
import { Trash2 } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useApplicationActions } from '../hooks/useApplicationActions';

export const ApplicationsTab: React.FC = () => {
  const {
    data: { applications },
  } = useAdminDashboard();
  const {
    handleApproveApplication,
    handleRejectApplication,
    handleDeleteApplication,
  } = useApplicationActions();

  return (
    <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h3 className="font-bold text-base text-white">Review Member Tryout Applications</h3>
          <p className="text-xs text-slate-400">
            Clicking <strong>"Approve & Promote to Squad"</strong> immediately creates the athlete card in the public roster.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[720px] text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#0E1524] text-slate-400 font-bold border-b border-slate-800">
              <th className="py-3 px-3">Candidate / Position</th>
              <th className="py-3 px-3">Division</th>
              <th className="py-3 px-3">Height / Weight</th>
              <th className="py-3 px-3">Spike Reach</th>
              <th className="py-3 px-3">5-1 Knowledge</th>
              <th className="py-3 px-3">Contact (Zalo / Email)</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-slate-800/40">
                <td className="py-3 px-3">
                  <span className="font-bold text-white block">{app.fullName}</span>
                  <span className="text-[11px] text-slate-400">
                    Position: <strong className="text-orange-400">{app.position}</strong> (Preferred #{app.desiredJerseyNumber})
                  </span>
                </td>

                <td className="py-3 px-3 font-semibold text-orange-400">{app.level}</td>
                <td className="py-3 px-3 font-mono">
                  {app.height}cm / {app.weight}kg
                </td>
                <td className="py-3 px-3 font-mono font-bold text-red-400">{app.spikeReach}cm</td>
                <td className="py-3 px-3">{app.rotationKnowledge}</td>
                <td className="py-3 px-3 text-[11px]">
                  <div>
                    Zalo: <strong className="font-mono text-white">{app.zalo}</strong>
                  </div>
                  <div className="text-slate-400">{app.gmail}</div>
                </td>

                <td className="py-3 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      app.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {app.status}
                  </span>
                </td>

                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {app.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleApproveApplication(app.id)}
                          className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                        >
                          Approve & Promote
                        </button>
                        <button
                          onClick={() => handleRejectApplication(app.id)}
                          className="min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-xl transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-500 text-[11px] mr-1">Decided</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteApplication(app.id, app.fullName)}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-300 rounded-xl bg-slate-800/80 hover:bg-red-950/80 cursor-pointer transition-colors"
                      title="Xóa hồ sơ ứng viên"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
