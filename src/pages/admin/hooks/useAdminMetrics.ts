import { useMemo } from 'react';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export interface MonthlyRevenuePoint {
  /** `YYYY-MM` in local time */
  monthKey: string;
  /** English short month label, e.g. `Nov` */
  label: string;
  court: number;
  training: number;
  store: number;
  guest: number;
  tryout: number;
  tournament: number;
}

export interface AdminMetrics {
  paidBookingsCount: number;
  paidStoreOrdersCount: number;
  paidGuestSessionsCount: number;
  approvedTryoutsCount: number;
  paidTournamentTeamsCount: number;
  pendingBookingsCount: number;
  pendingApplicationsCount: number;
  pendingTrainingCount: number;
  pendingStoreOrdersCount: number;
  pendingGuestSessionsCount: number;
  pendingTournamentFeesCount: number;
  hostedTournamentsCount: number;
  playersCount: number;
  coursesCount: number;
  coachesCount: number;
  newsCount: number;
  storeProductsCount: number;
  storeOrdersCount: number;
  guestSessionsCount: number;
  courtRevenue: number;
  /** Estimate: Σ current course price per CONFIRMED registration (no amount is stored per registration). */
  trainingRevenue: number;
  storeRevenue: number;
  guestSessionRevenue: number;
  tryoutRevenue: number;
  /** Verified tournament entry fees (strictly HOSTED mode + PAID teams). */
  tournamentRevenue: number;
  /** Verified Cashflow = Court (PAID) + Shop (PAID/SHIPPED/COMPLETED) + Guest Sessions (PAID) + Tryout Fees (APPROVED) + Tournaments (HOSTED & PAID) */
  verifiedClubRevenue: number;
  /** Combined Total = Verified Cashflow + Est. Training Tuition */
  totalClubRevenue: number;
  confirmedTrainingCount: number;
  monthlyRevenue: MonthlyRevenuePoint[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_MONTHS = 6;

const toNumber = (value: unknown): number => Number(value) || 0;

/** `YYYY-MM-DD` (local date string) or ISO timestamp → local `YYYY-MM`, or null if unparseable. */
function toMonthKey(value: string | undefined | null): string | null {
  if (!value) return null;
  const plain = /^(\d{4})-(\d{2})-\d{2}$/.exec(value);
  if (plain) return `${plain[1]}-${plain[2]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthBuckets(now: Date): MonthlyRevenuePoint[] {
  const buckets: MonthlyRevenuePoint[] = [];
  for (let i = CHART_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTH_LABELS[d.getMonth()],
      court: 0,
      training: 0,
      store: 0,
      guest: 0,
      tryout: 0,
      tournament: 0,
    });
  }
  return buckets;
}

export function useAdminMetrics(): AdminMetrics {
  const { data } = useAdminDashboard();
  const {
    bookings,
    applications,
    trainingRegs,
    players,
    coursesList,
    coachesList,
    newsList,
    storeProducts,
    storeOrders,
    guestSessions,
    tournamentsSummary,
    tournamentsList,
  } = data;

  return useMemo(() => {
    const paidBookings = bookings.filter((b) => b.paymentStatus === 'PAID');
    const courtRevenue = paidBookings.reduce((sum, b) => sum + toNumber(b.totalPrice), 0);
    const paidBookingsCount = paidBookings.length;
    const pendingBookingsCount = bookings.filter((b) => b.paymentStatus === 'PENDING').length;
    const pendingApplicationsCount = applications.filter((a) => a.status === 'PENDING').length;
    const pendingTrainingCount = trainingRegs.filter((r) => r.status === 'PENDING').length;
    const pendingStoreOrdersCount = storeOrders.filter(
      (o) => (o.status || o.paymentStatus) === 'PENDING'
    ).length;
    const pendingGuestSessionsCount = guestSessions.filter(
      (g) => g.paymentStatus === 'PENDING'
    ).length;

    const coursePriceById = new Map<string, number>();
    coursesList.forEach((c) => coursePriceById.set(c.id, toNumber(c.price)));

    const confirmedRegs = trainingRegs.filter((r) => r.status === 'CONFIRMED');
    const regValue = (courseId: string) => coursePriceById.get(courseId) ?? 0;
    const trainingRevenue = confirmedRegs.reduce((sum, r) => sum + regValue(r.courseId), 0);

    const paidStoreOrders = storeOrders.filter((o) =>
      ['PAID', 'SHIPPED', 'COMPLETED'].includes(String(o.status || o.paymentStatus))
    );
    const paidStoreOrdersCount = paidStoreOrders.length;
    const storeRevenue = paidStoreOrders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0);

    const paidGuestSessions = guestSessions.filter((g) => g.paymentStatus === 'PAID');
    const paidGuestSessionsCount = paidGuestSessions.length;
    const guestSessionRevenue = paidGuestSessions.reduce((sum, g) => sum + toNumber(g.amount), 0);

    const approvedApplications = applications.filter((a) => a.status === 'APPROVED');
    const approvedTryoutsCount = approvedApplications.length;
    const tryoutFeeOf = (app: (typeof applications)[number]) =>
      app.entryFee !== undefined && app.entryFee !== null ? toNumber(app.entryFee) : 100000;
    const tryoutRevenue = approvedApplications.reduce((sum, a) => sum + tryoutFeeOf(a), 0);

    // Strictly count HOSTED tournaments (PARTICIPATING tournaments NEVER enter revenue)
    const hostedSource =
      tournamentsList.length > 0
        ? tournamentsList.filter((t) => t.mode === 'HOSTED')
        : tournamentsSummary.filter((t) => t.mode === 'HOSTED');

    const hostedTournamentsCount = hostedSource.length;
    const paidTournamentTeams: Array<{ amount: number; paidAt?: string; createdAt?: string }> = [];
    let pendingTournamentFeesCount = 0;

    for (const tour of hostedSource) {
      for (const tm of tour.teams || []) {
        if (tm.paymentStatus === 'PAID') {
          paidTournamentTeams.push({
            amount: toNumber(tm.entryFeeAmount ?? tour.entryFeePerTeam),
            paidAt: tm.paidAt,
            createdAt: tm.createdAt,
          });
        } else if (tm.paymentStatus === 'PENDING') {
          pendingTournamentFeesCount += 1;
        }
      }
    }

    const paidTournamentTeamsCount = paidTournamentTeams.length;
    const tournamentRevenue = paidTournamentTeams.reduce((sum, t) => sum + t.amount, 0);

    const verifiedClubRevenue =
      courtRevenue + storeRevenue + guestSessionRevenue + tryoutRevenue + tournamentRevenue;
    const totalClubRevenue = verifiedClubRevenue + trainingRevenue;

    const monthlyRevenue = buildMonthBuckets(new Date());
    const bucketByKey = new Map(monthlyRevenue.map((p) => [p.monthKey, p]));
    paidBookings.forEach((b) => {
      const bucket = bucketByKey.get(toMonthKey(b.bookingDate) ?? '');
      if (bucket) bucket.court += toNumber(b.totalPrice);
    });
    confirmedRegs.forEach((r) => {
      const bucket = bucketByKey.get(toMonthKey(r.createdAt) ?? '');
      if (bucket) bucket.training += regValue(r.courseId);
    });
    paidStoreOrders.forEach((o) => {
      const bucket = bucketByKey.get(toMonthKey(o.createdAt) ?? '');
      if (bucket) bucket.store += toNumber(o.totalAmount);
    });
    paidGuestSessions.forEach((g) => {
      const bucket = bucketByKey.get(toMonthKey(g.paidAt ?? g.sessionDate) ?? '');
      if (bucket) bucket.guest += toNumber(g.amount);
    });
    approvedApplications.forEach((a) => {
      const bucket = bucketByKey.get(toMonthKey(a.approvedAt ?? a.updatedAt ?? a.createdAt) ?? '');
      if (bucket) bucket.tryout += tryoutFeeOf(a);
    });
    paidTournamentTeams.forEach((tm) => {
      const bucket = bucketByKey.get(toMonthKey(tm.paidAt ?? tm.createdAt) ?? '');
      if (bucket) bucket.tournament += tm.amount;
    });

    return {
      paidBookingsCount,
      paidStoreOrdersCount,
      paidGuestSessionsCount,
      approvedTryoutsCount,
      paidTournamentTeamsCount,
      pendingBookingsCount,
      pendingApplicationsCount,
      pendingTrainingCount,
      pendingStoreOrdersCount,
      pendingGuestSessionsCount,
      pendingTournamentFeesCount,
      hostedTournamentsCount,
      playersCount: players.length,
      coursesCount: coursesList.length,
      coachesCount: coachesList.length,
      newsCount: newsList.length,
      storeProductsCount: storeProducts.length,
      storeOrdersCount: storeOrders.length,
      guestSessionsCount: guestSessions.length,
      courtRevenue,
      trainingRevenue,
      storeRevenue,
      guestSessionRevenue,
      tryoutRevenue,
      tournamentRevenue,
      verifiedClubRevenue,
      totalClubRevenue,
      confirmedTrainingCount: confirmedRegs.length,
      monthlyRevenue,
    };
  }, [
    bookings,
    applications,
    trainingRegs,
    players,
    coursesList,
    coachesList,
    newsList,
    storeProducts,
    storeOrders,
    guestSessions,
    tournamentsSummary,
    tournamentsList,
  ]);
}
