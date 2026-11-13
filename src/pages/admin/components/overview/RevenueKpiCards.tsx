import React from 'react';
import { Wallet, CreditCard, Dumbbell, ShoppingBag, Users, Clock, Info } from 'lucide-react';
import { useAdminDashboard } from '../../context/AdminDashboardContext';
import { useAdminMetrics } from '../../hooks/useAdminMetrics';

const formatVnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;

/** Overview top KPI grid: 6 core executive metrics (Spec 005, US2). */
export const RevenueKpiCards: React.FC = () => {
  const {
    setActiveModule,
    data: { players },
  } = useAdminDashboard();
  const {
    totalClubRevenue,
    courtRevenue,
    trainingRevenue,
    storeRevenue,
    paidBookingsCount,
    paidStoreOrdersCount,
    confirmedTrainingCount,
    pendingBookingsCount,
    pendingTrainingCount,
    pendingApplicationsCount,
    pendingStoreOrdersCount,
    playersCount,
  } = useAdminMetrics();

  const activeAthletesCount = players.filter((p) => p.isActive !== false).length;
  const totalPendingApprovals =
    pendingBookingsCount + pendingTrainingCount + pendingApplicationsCount + pendingStoreOrdersCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Total Club Revenue — hero card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#8B0000] via-[#7A1A0A] to-[#F97316] shadow-lg shadow-orange-950/30">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center justify-between">
          <span className="text-xs font-semibold text-white/85">Total Revenue</span>
          <Wallet className="w-4 h-4 text-white/85" />
        </div>
        <div className="relative mt-2 font-mono font-black text-xl text-white tabular-nums">
          {formatVnd(totalClubRevenue)}
        </div>
        <span className="relative text-[10px] text-white/75 block mt-1">
          Bookings + Training + Shop
        </span>
      </div>

      {/* 2. Est. Training Tuition */}
      <KpiCard
        icon={Dumbbell}
        label="Est. Training Tuition"
        value={formatVnd(trainingRevenue)}
        note={`${confirmedTrainingCount} confirmed enrollments`}
        accent="text-[#38BDF8]"
        bar="bg-[#38BDF8]"
        hint="Estimated as current course price × each CONFIRMED registration."
        onClick={() => setActiveModule('TRAINING')}
      />

      {/* 3. Booking Revenue */}
      <KpiCard
        icon={CreditCard}
        label="Booking Revenue"
        value={formatVnd(courtRevenue)}
        note={`${paidBookingsCount} verified sessions (PAID)`}
        accent="text-[#F97316]"
        bar="bg-[#F97316]"
        onClick={() => setActiveModule('BOOKINGS')}
      />

      {/* 4. Shop Revenue */}
      <KpiCard
        icon={ShoppingBag}
        label="Shop Revenue"
        badge="Live"
        value={formatVnd(storeRevenue)}
        note={`${paidStoreOrdersCount} verified store orders`}
        accent="text-[#FACC15]"
        bar="bg-[#FACC15]"
        onClick={() => setActiveModule('STORE')}
      />

      {/* 5. Active Athletes */}
      <KpiCard
        icon={Users}
        label="Active Athletes"
        value={`${activeAthletesCount} / ${playersCount}`}
        note="Published on public roster"
        accent="text-emerald-400"
        bar="bg-emerald-400"
        onClick={() => setActiveModule('PLAYERS')}
      />

      {/* 6. Pending Approvals */}
      <KpiCard
        icon={Clock}
        label="Pending Approvals"
        value={`${totalPendingApprovals} Items`}
        note={`${pendingBookingsCount} bookings · ${pendingStoreOrdersCount} shop · ${pendingTrainingCount} trainees · ${pendingApplicationsCount} tryouts`}
        accent="text-amber-400"
        bar="bg-amber-400"
        onClick={() =>
          setActiveModule(
            pendingBookingsCount > 0
              ? 'BOOKINGS'
              : pendingStoreOrdersCount > 0
                ? 'STORE'
                : pendingTrainingCount > 0
                  ? 'TRAINING'
                  : 'APPLICATIONS'
          )
        }
      />
    </div>
  );
};

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  value: string;
  note: string;
  accent: string;
  bar: string;
  hint?: string;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon: Icon,
  label,
  badge,
  value,
  note,
  accent,
  bar,
  hint,
  onClick,
}) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    className={`relative overflow-hidden rounded-3xl p-5 bg-[#111827] border border-[#1E293B] transition-colors ${
      onClick ? 'hover:bg-[#161F30] cursor-pointer' : ''
    }`}
  >
    <span className={`absolute left-0 top-5 bottom-5 w-1 rounded-r ${bar}`} aria-hidden="true" />
    <div className="flex items-center justify-between gap-1">
      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 truncate">
        <span className="truncate">{label}</span>
        {hint && (
          <span title={hint} aria-label={hint} className="inline-flex cursor-help shrink-0">
            <Info className="w-3 h-3 text-slate-500" />
          </span>
        )}
      </span>
      {badge ? (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/40 shrink-0">
          {badge}
        </span>
      ) : (
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
      )}
    </div>
    <div className={`mt-2 font-mono font-black text-xl tabular-nums ${accent}`}>{value}</div>
    <span className="text-[10px] text-slate-500 block mt-1 truncate" title={note}>
      {note}
    </span>
  </div>
);
