import React from 'react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { useApplicationActions } from '../hooks/useApplicationActions';

export const OverviewTab: React.FC = () => {
  const {
    setActiveModule,
    data: { bookings, applications },
  } = useAdminDashboard();
  const {
    totalRevenue,
    pendingBookingsCount,
    pendingApplicationsCount,
    playersCount,
  } = useAdminMetrics();
  const { handleApproveApplication } = useApplicationActions();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
          <span className="text-xs text-slate-400 font-semibold block">Total Court Revenue</span>
          <div className="font-mono font-black text-2xl text-orange-400 tabular-nums">
            {totalRevenue.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-[10px] text-slate-500 block">MB Bank: 0002090671521</span>
        </div>

        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
          <span className="text-xs text-slate-400 font-semibold block">Pending Court Orders</span>
          <div className="font-mono font-black text-2xl text-amber-400 tabular-nums">
            {pendingBookingsCount} Sessions
          </div>
          <span className="text-[10px] text-slate-500 block">Awaiting VietQR verification</span>
        </div>

        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
          <span className="text-xs text-slate-400 font-semibold block">Tryout Applications</span>
          <div className="font-mono font-black text-2xl text-blue-400 tabular-nums">
            {pendingApplicationsCount} Pending
          </div>
          <span className="text-[10px] text-slate-500 block">Approve to promote into squad</span>
        </div>

        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-1 shadow">
          <span className="text-xs text-slate-400 font-semibold block">Active Squad Athletes</span>
          <div className="font-mono font-black text-2xl text-emerald-400 tabular-nums">
            {playersCount} Athletes
          </div>
          <span className="text-[10px] text-slate-500 block">
            Senior, Junior & Youth divisions
          </span>
        </div>
      </div>

      {/* Quick summary tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">Recent Court Reservations</h3>
            <button
              onClick={() => setActiveModule('BOOKINGS')}
              className="text-xs text-orange-400 hover:underline font-bold"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-800/80 text-xs">
            {bookings.slice(0, 4).map((b) => (
              <div key={b.id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">
                    {b.courtName} ({b.startTime} - {b.endTime})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {b.customerName} · Ref:{' '}
                    <span className="font-mono text-slate-300">{b.bookingCode}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.paymentStatus === 'PAID'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {b.paymentStatus}
                  </span>
                  <div className="font-mono text-orange-400 font-bold mt-0.5">
                    {b.totalPrice.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">Pending Tryout Candidates</h3>
            <button
              onClick={() => setActiveModule('APPLICATIONS')}
              className="text-xs text-orange-400 hover:underline font-bold"
            >
              Review All
            </button>
          </div>
          <div className="divide-y divide-slate-800/80 text-xs">
            {applications.slice(0, 4).map((app) => (
              <div key={app.id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">
                    {app.fullName} ({app.position})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Reach: {app.spikeReach}cm · {app.level} · 5-1: {app.rotationKnowledge}
                  </div>
                </div>
                <div>
                  {app.status === 'PENDING' ? (
                    <button
                      onClick={() => handleApproveApplication(app.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {app.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
