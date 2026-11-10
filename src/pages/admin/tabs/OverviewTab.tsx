import React from 'react';
import { PieChart, ArrowRight, CreditCard, Dumbbell, ShoppingBag } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { RevenueKpiCards } from '../components/overview/RevenueKpiCards';
import { RevenueTrendChart } from '../components/overview/RevenueTrendChart';

export const OverviewTab: React.FC = () => {
  const {
    setActiveModule,
    data: { bookings, trainingRegs },
  } = useAdminDashboard();
  const {
    totalClubRevenue,
    courtRevenue,
    trainingRevenue,
    storeRevenue,
    paidBookingsCount,
    confirmedTrainingCount,
  } = useAdminMetrics();

  const safeTotal = totalClubRevenue > 0 ? totalClubRevenue : 1;
  const bookingSharePct = totalClubRevenue > 0 ? Math.round((courtRevenue / safeTotal) * 100) : 0;
  const trainingSharePct =
    totalClubRevenue > 0 ? Math.max(0, 100 - bookingSharePct) : 0;

  const serviceStreams = [
    {
      id: 'BOOKINGS' as const,
      icon: CreditCard,
      label: 'Court Bookings',
      revenue: courtRevenue,
      pct: bookingSharePct,
      volume: `${paidBookingsCount} paid / ${bookings.length} total bookings`,
      color: 'bg-[#F97316]',
      textColor: 'text-[#F97316]',
    },
    {
      id: 'TRAINING' as const,
      icon: Dumbbell,
      label: 'Training & Scrimmages',
      revenue: trainingRevenue,
      pct: trainingSharePct,
      volume: `${confirmedTrainingCount} confirmed / ${trainingRegs.length} enrollments`,
      color: 'bg-[#38BDF8]',
      textColor: 'text-[#38BDF8]',
    },
    {
      id: 'STORE' as const,
      icon: ShoppingBag,
      label: 'DVA Store (Coming Soon)',
      revenue: storeRevenue,
      pct: 0,
      volume: 'Phase 2 E-Commerce',
      color: 'bg-[#FACC15]',
      textColor: 'text-[#FACC15]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Row: 6 Executive Metric KPI Cards */}
      <RevenueKpiCards />

      {/* 2. Middle Section: Revenue Trend Chart & Service Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueTrendChart />
        </div>

        {/* Service Revenue & Activity Share */}
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#38BDF8]" />
              Service Revenue Share
            </h3>
            <p className="text-[11px] text-slate-500">
              Revenue & registration distribution across club services
            </p>
          </div>

          {/* Stacked horizontal proportion bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-[#0B0F19] border border-[#1E293B] overflow-hidden flex">
              {bookingSharePct > 0 && (
                <div
                  className="h-full bg-[#F97316] transition-all duration-500"
                  style={{ width: `${bookingSharePct}%` }}
                  title={`Court Bookings: ${bookingSharePct}%`}
                />
              )}
              {trainingSharePct > 0 && (
                <div
                  className="h-full bg-[#38BDF8] transition-all duration-500"
                  style={{ width: `${trainingSharePct}%` }}
                  title={`Training & Scrimmages: ${trainingSharePct}%`}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Bookings {bookingSharePct}%</span>
              <span>Training {trainingSharePct}%</span>
              <span>Shop 0%</span>
            </div>
          </div>

          <div className="space-y-3">
            {serviceStreams.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveModule(s.id)}
                  className="w-full text-left p-3 rounded-2xl bg-[#0B0F19] hover:bg-[#161F30] border border-[#1E293B] transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-white">
                      <Icon className={`w-3.5 h-3.5 ${s.textColor}`} />
                      {s.label}
                    </span>
                    <span className={`font-mono text-xs font-black tabular-nums ${s.textColor}`}>
                      {s.pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{s.volume}</span>
                    <span className="font-mono text-slate-200 font-semibold tabular-nums">
                      {s.revenue.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Recent Activity (Top 5 Bookings & Top 5 Training Registrations) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Court Bookings (Top 5) */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white">Recent Activity — Court Bookings</h3>
              <p className="text-[11px] text-slate-500">Latest 5 court reservation requests</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('BOOKINGS')}
              className="text-xs text-[#F97316] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#1E293B] text-xs">
            {bookings.length === 0 ? (
              <p className="py-6 text-center text-slate-500">No court reservations recorded yet.</p>
            ) : (
              bookings.slice(0, 5).map((b) => (
                <div key={b.id} className="py-3 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {b.courtName} ({b.startTime} - {b.endTime})
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {b.customerName} · {b.bookingDate} · Ref:{' '}
                      <span className="font-mono text-slate-300">{b.bookingCode}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.paymentStatus === 'PAID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : b.paymentStatus === 'CANCELLED'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {b.paymentStatus}
                    </span>
                    <div className="font-mono text-[#F97316] font-bold mt-0.5 tabular-nums">
                      {b.totalPrice.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Training & Scrimmage Enrollments (Top 5) */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white">Recent Activity — Training & Scrimmages</h3>
              <p className="text-[11px] text-slate-500">Latest 5 academy & scrimmage enrollments</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('TRAINING')}
              className="text-xs text-[#38BDF8] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#1E293B] text-xs">
            {trainingRegs.length === 0 ? (
              <p className="py-6 text-center text-slate-500">No training enrollments recorded yet.</p>
            ) : (
              trainingRegs.slice(0, 5).map((reg) => (
                <div key={reg.id} className="py-3 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {reg.fullName}{' '}
                      <span className="text-slate-400 font-normal">({reg.experienceLevel})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      <span className="text-[#38BDF8] font-semibold">{reg.courseTitle}</span> ·{' '}
                      {reg.preferredTimeSlot}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        reg.status === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : reg.status === 'CANCELLED'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {reg.status}
                    </span>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {reg.phone}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
