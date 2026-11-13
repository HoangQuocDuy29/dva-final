import React, { useState } from 'react';
import {
  Wallet,
  CreditCard,
  Dumbbell,
  ShoppingBag,
  Users,
  Clock,
  Info,
  Ticket,
  UserCheck,
} from 'lucide-react';
import { useAdminDashboard } from '../../context/AdminDashboardContext';
import { useAdminMetrics } from '../../hooks/useAdminMetrics';

const formatVnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;

interface RevenueKpiCardsProps {
  onJumpToGuestSessions?: () => void;
}

/** Overview top KPI grid: balanced 2x4 grid covering 5 cashflow streams + club ops. */
export const RevenueKpiCards: React.FC<RevenueKpiCardsProps> = ({ onJumpToGuestSessions }) => {
  const {
    setActiveModule,
    data: { players },
  } = useAdminDashboard();
  const {
    verifiedClubRevenue,
    totalClubRevenue,
    courtRevenue,
    trainingRevenue,
    storeRevenue,
    guestSessionRevenue,
    tryoutRevenue,
    paidBookingsCount,
    paidStoreOrdersCount,
    paidGuestSessionsCount,
    approvedTryoutsCount,
    confirmedTrainingCount,
    pendingBookingsCount,
    pendingTrainingCount,
    pendingApplicationsCount,
    pendingStoreOrdersCount,
    pendingGuestSessionsCount,
    playersCount,
  } = useAdminMetrics();

  const [includeEstTuition, setIncludeEstTuition] = useState(false);

  const activeAthletesCount = players.filter((p) => p.isActive !== false).length;
  const totalPendingApprovals =
    pendingBookingsCount +
    pendingStoreOrdersCount +
    pendingGuestSessionsCount +
    pendingTrainingCount +
    pendingApplicationsCount;

  const displayedTotal = includeEstTuition ? totalClubRevenue : verifiedClubRevenue;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Row 1, Card 1: Total Revenue — Hero card with Verified Cash vs Include Est. Tuition toggle */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#8B0000] via-[#7A1A0A] to-[#F97316] shadow-lg shadow-orange-950/30 flex flex-col justify-between">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-white/90" />
            <span>Total Revenue</span>
          </span>
          <button
            type="button"
            onClick={() => setIncludeEstTuition((v) => !v)}
            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-black/30 hover:bg-black/45 text-white border border-white/25 transition-colors cursor-pointer shrink-0"
            title="Switch between Verified Bank Cashflow and Combined Total including Estimated Training Tuition"
          >
            {includeEstTuition ? 'Include Est. Tuition' : 'Verified Cash Only'}
          </button>
        </div>

        <div className="relative mt-2 font-mono font-black text-xl text-white tabular-nums">
          {formatVnd(displayedTotal)}
        </div>

        <div className="relative text-[10px] text-white/85 mt-1.5 space-y-0.5">
          {includeEstTuition ? (
            <span className="block truncate" title={`Verified Cash: ${formatVnd(verifiedClubRevenue)} + Est. Tuition: ${formatVnd(trainingRevenue)}`}>
              Verified: {formatVnd(verifiedClubRevenue)} + Est. Tuition: {formatVnd(trainingRevenue)}
            </span>
          ) : (
            <span className="block truncate" title={`Bookings + Shop + Guest + Tryout | Est. Tuition: ${formatVnd(trainingRevenue)}`}>
              Bookings + Shop + Guest + Tryout · +Est. Tuition: {formatVnd(trainingRevenue)}
            </span>
          )}
        </div>
      </div>

      {/* Row 1, Card 2: Booking Revenue */}
      <KpiCard
        icon={CreditCard}
        label="Booking Revenue"
        value={formatVnd(courtRevenue)}
        note={`${paidBookingsCount} verified sessions (PAID)`}
        accent="text-[#F97316]"
        bar="bg-[#F97316]"
        onClick={() => setActiveModule('BOOKINGS')}
      />

      {/* Row 1, Card 3: Shop Revenue */}
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

      {/* Row 1, Card 4: Est. Training Tuition */}
      <KpiCard
        icon={Dumbbell}
        label="Est. Training Tuition"
        badge="Est."
        badgeTone="sky"
        value={formatVnd(trainingRevenue)}
        note={`${confirmedTrainingCount} confirmed enrollments`}
        accent="text-[#38BDF8]"
        bar="bg-[#38BDF8]"
        hint="Estimated as current course price × each CONFIRMED registration (not included in Verified Cash Only)."
        onClick={() => setActiveModule('TRAINING')}
      />

      {/* Row 2, Card 5: Guest Sessions */}
      <KpiCard
        icon={Ticket}
        label="Guest Sessions"
        value={formatVnd(guestSessionRevenue)}
        note={`${paidGuestSessionsCount} paid · ${pendingGuestSessionsCount} pending`}
        accent="text-[#A855F7]"
        bar="bg-[#A855F7]"
        hint="Verified drop-in & scrimmage guest passes marked as PAID."
        onClick={onJumpToGuestSessions}
      />

      {/* Row 2, Card 6: Tryout Fees */}
      <KpiCard
        icon={UserCheck}
        label="Tryout Fees"
        value={formatVnd(tryoutRevenue)}
        note={`${approvedTryoutsCount} approved squad athletes`}
        accent="text-[#10B981]"
        bar="bg-[#10B981]"
        hint="Club entry fees recorded from APPROVED tryout applications (default 100,000 đ, adjustable for waived athletes)."
        onClick={() => setActiveModule('APPLICATIONS')}
      />

      {/* Row 2, Card 7: Active Athletes */}
      <KpiCard
        icon={Users}
        label="Active Athletes"
        value={`${activeAthletesCount} / ${playersCount}`}
        note="Published on public roster"
        accent="text-emerald-400"
        bar="bg-emerald-400"
        onClick={() => setActiveModule('PLAYERS')}
      />

      {/* Row 2, Card 8: Pending Approvals */}
      <KpiCard
        icon={Clock}
        label="Pending Approvals"
        value={`${totalPendingApprovals} Items`}
        note={`${pendingBookingsCount} bookings · ${pendingStoreOrdersCount} shop · ${pendingGuestSessionsCount} guest · ${pendingTrainingCount} trainees · ${pendingApplicationsCount} tryouts`}
        accent="text-amber-400"
        bar="bg-amber-400"
        onClick={() => {
          if (pendingBookingsCount > 0) setActiveModule('BOOKINGS');
          else if (pendingStoreOrdersCount > 0) setActiveModule('STORE');
          else if (pendingGuestSessionsCount > 0 && onJumpToGuestSessions) onJumpToGuestSessions();
          else if (pendingTrainingCount > 0) setActiveModule('TRAINING');
          else setActiveModule('APPLICATIONS');
        }}
      />
    </div>
  );
};

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  badgeTone?: 'yellow' | 'sky';
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
  badgeTone = 'yellow',
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
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border shrink-0 ${
            badgeTone === 'sky'
              ? 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/40'
              : 'bg-[#FACC15]/15 text-[#FACC15] border-[#FACC15]/40'
          }`}
        >
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
