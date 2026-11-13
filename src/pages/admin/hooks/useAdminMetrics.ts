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
}

export interface AdminMetrics {
  paidBookingsCount: number;
  paidStoreOrdersCount: number;
  pendingBookingsCount: number;
  pendingApplicationsCount: number;
  pendingTrainingCount: number;
  pendingStoreOrdersCount: number;
  playersCount: number;
  coursesCount: number;
  coachesCount: number;
  newsCount: number;
  storeProductsCount: number;
  storeOrdersCount: number;
  courtRevenue: number;
  /** Estimate: Σ current course price per CONFIRMED registration (no amount is stored per registration). */
  trainingRevenue: number;
  storeRevenue: number;
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

    return {
      paidBookingsCount,
      paidStoreOrdersCount,
      pendingBookingsCount,
      pendingApplicationsCount,
      pendingTrainingCount,
      pendingStoreOrdersCount,
      playersCount: players.length,
      coursesCount: coursesList.length,
      coachesCount: coachesList.length,
      newsCount: newsList.length,
      storeProductsCount: storeProducts.length,
      storeOrdersCount: storeOrders.length,
      courtRevenue,
      trainingRevenue,
      storeRevenue,
      totalClubRevenue: courtRevenue + trainingRevenue + storeRevenue,
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
  ]);
}
