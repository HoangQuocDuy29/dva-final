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
}

export interface AdminMetrics {
  paidBookingsCount: number;
  paidStoreOrdersCount: number;
  paidGuestSessionsCount: number;
  approvedTryoutsCount: number;
  pendingBookingsCount: number;
  pendingApplicationsCount: number;
  pendingTrainingCount: number;
  pendingStoreOrdersCount: number;
  pendingGuestSessionsCount: number;
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
  /** Verified Cashflow = Court (PAID) + Shop (PAID/SHIPPED/COMPLETED) + Guest Sessions (PAID) + Tryout Fees (APPROVED) */
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

    const verifiedClubRevenue =
      courtRevenue + storeRevenue + guestSessionRevenue + tryoutRevenue;
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

    return {
      paidBookingsCount,
      paidStoreOrdersCount,
      paidGuestSessionsCount,
      approvedTryoutsCount,
      pendingBookingsCount,
      pendingApplicationsCount,
      pendingTrainingCount,
      pendingStoreOrdersCount,
      pendingGuestSessionsCount,
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
  ]);
}
