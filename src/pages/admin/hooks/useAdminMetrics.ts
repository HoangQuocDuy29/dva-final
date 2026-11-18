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
  paidTryoutsCount: number;
  scheduledApplicationsCount: number;
  applicationsCount: number;
  paidTournamentTeamsCount: number;
  pendingBookingsCount: number;
  pendingApplicationsCount: number;
  pendingTrainingCount: number;
  pendingStoreOrdersCount: number;
  pendingGuestSessionsCount: number;
  pendingTournamentFeesCount: number;
  tournamentsCount: number;
  hostedTournamentsCount: number;
  playersCount: number;
  activePlayersCount: number;
  totalBookingsCount: number;
  totalTrainingRegsCount: number;
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
  /** Verified Cashflow = Court (PAID) + Shop (PAID/SHIPPED/COMPLETED) + Guest Sessions (PAID) + Tryout Fees + Tournaments (HOSTED & PAID) */
  verifiedClubRevenue: number;
  /** Combined Total = Verified Cashflow + Est. Training Tuition */
  totalClubRevenue: number;
  confirmedTrainingCount: number;
  monthlyRevenue: MonthlyRevenuePoint[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_MONTHS = 6;

const toNumber = (value: unknown): number => Number(value) || 0;

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
  const { isSuperAdmin, data } = useAdminDashboard();
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
    overviewSummary,
    loadedScopes,
  } = data;

  return useMemo(() => {
    const summary = overviewSummary;
    const isScopeLoaded = (scope: Parameters<typeof loadedScopes.has>[0]) => loadedScopes.has(scope);

    // Non-financial operational counts (available to both ADMIN and SUPERADMIN)
    const appsLoaded = isScopeLoaded('APPLICATIONS');
    const newsLoaded = isScopeLoaded('NEWS');
    const playersLoaded = isScopeLoaded('PLAYERS');
    const coursesLoaded = isScopeLoaded('TRAINING');
    const coachesLoaded = isScopeLoaded('COACHES');
    const toursLoaded = isScopeLoaded('TOURNAMENTS');

    const applicationsCount = appsLoaded
      ? applications.length
      : toNumber(summary?.applicationsCount);
    const pendingApplicationsCount = appsLoaded
      ? applications.filter((a) => a.status === 'PENDING').length
      : toNumber(summary?.pendingApplicationsCount);
    const scheduledApplicationsCount = appsLoaded
      ? applications.filter((a) => a.status === 'SCHEDULED').length
      : toNumber(summary?.scheduledApplicationsCount);
    const approvedTryoutsCount = appsLoaded
      ? applications.filter((a) => a.status === 'APPROVED').length
      : toNumber(summary?.approvedTryoutsCount);

    const tournamentsCount = toursLoaded
      ? tournamentsList.length
      : toNumber(summary?.tournamentsCount ?? tournamentsSummary.length);
    const hostedTournamentsCount = toursLoaded
      ? tournamentsList.filter((t) => t.mode === 'HOSTED').length
      : toNumber(summary?.hostedTournamentsCount ?? tournamentsSummary.filter((t) => t.mode === 'HOSTED').length);

    const playersCount = playersLoaded ? players.length : toNumber(summary?.playersCount);
    const activePlayersCount = playersLoaded
      ? players.filter((p) => p.isActive !== false).length
      : toNumber(summary?.activePlayersCount);
    const coursesCount = coursesLoaded ? coursesList.length : toNumber(summary?.coursesCount);
    const coachesCount = coachesLoaded ? coachesList.length : toNumber(summary?.coachesCount);
    const newsCount = newsLoaded ? newsList.length : toNumber(summary?.newsCount);

    // Strict RBAC guard: ADMIN never receives financial totals or hidden module KPIs
    if (!isSuperAdmin) {
      return {
        paidBookingsCount: 0,
        paidStoreOrdersCount: 0,
        paidGuestSessionsCount: 0,
        approvedTryoutsCount,
        paidTryoutsCount: 0,
        scheduledApplicationsCount,
        applicationsCount,
        paidTournamentTeamsCount: 0,
        pendingBookingsCount: 0,
        pendingApplicationsCount,
        pendingTrainingCount: 0,
        pendingStoreOrdersCount: 0,
        pendingGuestSessionsCount: 0,
        pendingTournamentFeesCount: 0,
        tournamentsCount,
        hostedTournamentsCount,
        playersCount,
        activePlayersCount,
        totalBookingsCount: 0,
        totalTrainingRegsCount: 0,
        coursesCount,
        coachesCount,
        newsCount,
        storeProductsCount: 0,
        storeOrdersCount: 0,
        guestSessionsCount: 0,
        courtRevenue: 0,
        trainingRevenue: 0,
        storeRevenue: 0,
        guestSessionRevenue: 0,
        tryoutRevenue: 0,
        tournamentRevenue: 0,
        verifiedClubRevenue: 0,
        totalClubRevenue: 0,
        confirmedTrainingCount: 0,
        monthlyRevenue: [],
      };
    }

    // SUPERADMIN metrics: prefer live array once that tab scope is loaded, else pre-aggregated server summary
    const bookingsLoaded = isScopeLoaded('BOOKINGS');
    const storeLoaded = isScopeLoaded('STORE');
    const trainingLoaded = isScopeLoaded('TRAINING');
    const guestLoaded =
      !summary || guestSessions.length > 0 || toNumber(summary?.totalGuestSessionsCount) === 0;

    // 1. Court Bookings
    const paidBookings = bookings.filter((b) => b.paymentStatus === 'PAID');
    const courtRevenue = bookingsLoaded
      ? paidBookings.reduce((sum, b) => sum + toNumber(b.totalPrice), 0)
      : toNumber(summary?.courtRevenue);
    const paidBookingsCount = bookingsLoaded ? paidBookings.length : toNumber(summary?.paidBookingsCount);
    const pendingBookingsCount = bookingsLoaded
      ? bookings.filter((b) => b.paymentStatus === 'PENDING').length
      : toNumber(summary?.pendingBookingsCount);
    const totalBookingsCount = bookingsLoaded ? bookings.length : toNumber(summary?.totalBookingsCount);

    // 2. DVA Store
    const paidStoreOrders = storeOrders.filter((o) =>
      ['PAID', 'SHIPPED', 'COMPLETED'].includes(String(o.status || o.paymentStatus))
    );
    const storeRevenue = storeLoaded
      ? paidStoreOrders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0)
      : toNumber(summary?.storeRevenue);
    const paidStoreOrdersCount = storeLoaded
      ? paidStoreOrders.length
      : toNumber(summary?.paidStoreOrdersCount);
    const pendingStoreOrdersCount = storeLoaded
      ? storeOrders.filter((o) => (o.status || o.paymentStatus) === 'PENDING').length
      : toNumber(summary?.pendingStoreOrdersCount);
    const storeProductsCount = storeLoaded
      ? storeProducts.length
      : toNumber(summary?.storeProductsCount);
    const storeOrdersCount = storeLoaded
      ? storeOrders.length
      : toNumber(summary?.totalStoreOrdersCount);

    // 3. Guest Sessions (preloaded into Overview from summary.guestSessions)
    const paidGuestSessions = guestSessions.filter((g) => g.paymentStatus === 'PAID');
    const guestSessionRevenue = guestLoaded
      ? paidGuestSessions.reduce((sum, g) => sum + toNumber(g.amount), 0)
      : toNumber(summary?.guestSessionRevenue);
    const paidGuestSessionsCount = guestLoaded
      ? paidGuestSessions.length
      : toNumber(summary?.paidGuestSessionsCount);
    const pendingGuestSessionsCount = guestLoaded
      ? guestSessions.filter((g) => g.paymentStatus === 'PENDING').length
      : toNumber(summary?.pendingGuestSessionsCount);
    const guestSessionsCount = guestLoaded
      ? guestSessions.length
      : toNumber(summary?.totalGuestSessionsCount);

    // 4. Training & Scrimmages
    const coursePriceById = new Map<string, number>();
    coursesList.forEach((c) => coursePriceById.set(c.id, toNumber(c.price)));
    const regValue = (courseId: string) => coursePriceById.get(courseId) ?? 0;
    const confirmedRegs = trainingRegs.filter((r) => r.status === 'CONFIRMED');
    const trainingRevenue = trainingLoaded
      ? confirmedRegs.reduce((sum, r) => sum + regValue(r.courseId), 0)
      : toNumber(summary?.trainingRevenue);
    const confirmedTrainingCount = trainingLoaded
      ? confirmedRegs.length
      : toNumber(summary?.confirmedTrainingCount);
    const pendingTrainingCount = trainingLoaded
      ? trainingRegs.filter((r) => r.status === 'PENDING').length
      : toNumber(summary?.pendingTrainingCount);
    const totalTrainingRegsCount = trainingLoaded
      ? trainingRegs.length
      : toNumber(summary?.totalTrainingRegsCount);

    // 5. Tryouts
    const tryoutFeeOf = (app: (typeof applications)[number]) => {
      if (app.paymentStatus === 'FREE') return 0;
      return app.entryFee !== undefined && app.entryFee !== null ? toNumber(app.entryFee) : 100000;
    };
    const revenueTryouts = applications.filter(
      (a) => a.paymentStatus === 'PAID' || (a.status === 'APPROVED' && a.paymentStatus !== 'FREE')
    );
    const paidTryoutsCount = appsLoaded
      ? applications.filter((a) => a.paymentStatus === 'PAID').length
      : toNumber(summary?.paidTryoutsCount);
    const tryoutRevenue = appsLoaded
      ? revenueTryouts.reduce((sum, a) => sum + tryoutFeeOf(a), 0)
      : toNumber(summary?.tryoutRevenue);

    // 6. Hosted Tournaments
    const hostedToursSource = toursLoaded
      ? tournamentsList.filter((t) => t.mode === 'HOSTED')
      : tournamentsSummary.filter((t) => t.mode === 'HOSTED');

    const paidTournamentTeams: Array<{ amount: number; paidAt?: string; createdAt?: string }> = [];
    let pendingFromList = 0;
    for (const tour of hostedToursSource) {
      for (const tm of tour.teams || []) {
        if (tm.paymentStatus === 'PAID') {
          paidTournamentTeams.push({
            amount: toNumber(tm.entryFeeAmount ?? tour.entryFeePerTeam),
            paidAt: tm.paidAt,
            createdAt: tm.createdAt,
          });
        } else if (tm.paymentStatus === 'PENDING') {
          pendingFromList += 1;
        }
      }
    }

    const paidTournamentTeamsCount = toursLoaded
      ? paidTournamentTeams.length
      : toNumber(summary?.paidTournamentTeamsCount ?? paidTournamentTeams.length);
    const pendingTournamentFeesCount = toursLoaded
      ? pendingFromList
      : toNumber(summary?.pendingTournamentFeesCount ?? pendingFromList);
    const tournamentRevenue = toursLoaded
      ? paidTournamentTeams.reduce((sum, t) => sum + t.amount, 0)
      : toNumber(summary?.tournamentRevenue);

    const verifiedClubRevenue =
      courtRevenue + storeRevenue + guestSessionRevenue + tryoutRevenue + tournamentRevenue;
    const totalClubRevenue = verifiedClubRevenue + trainingRevenue;

    // 6-month trend chart: start from server buckets and overlay any locally mutated loaded scopes
    const baseMonthly =
      Array.isArray(summary?.monthlyRevenue) && summary.monthlyRevenue.length > 0
        ? summary.monthlyRevenue.map((b) => ({ ...b }))
        : buildMonthBuckets(new Date());
    const bucketByKey = new Map(baseMonthly.map((p) => [p.monthKey, p]));

    if (bookingsLoaded) {
      baseMonthly.forEach((b) => {
        b.court = 0;
      });
      paidBookings.forEach((b) => {
        const bucket = bucketByKey.get(toMonthKey(b.bookingDate) ?? '');
        if (bucket) bucket.court += toNumber(b.totalPrice);
      });
    }
    if (trainingLoaded) {
      baseMonthly.forEach((b) => {
        b.training = 0;
      });
      confirmedRegs.forEach((r) => {
        const bucket = bucketByKey.get(toMonthKey(r.createdAt) ?? '');
        if (bucket) bucket.training += regValue(r.courseId);
      });
    }
    if (storeLoaded) {
      baseMonthly.forEach((b) => {
        b.store = 0;
      });
      paidStoreOrders.forEach((o) => {
        const bucket = bucketByKey.get(toMonthKey(o.createdAt) ?? '');
        if (bucket) bucket.store += toNumber(o.totalAmount);
      });
    }
    if (guestLoaded) {
      baseMonthly.forEach((b) => {
        b.guest = 0;
      });
      paidGuestSessions.forEach((g) => {
        const bucket = bucketByKey.get(toMonthKey(g.paidAt ?? g.sessionDate) ?? '');
        if (bucket) bucket.guest += toNumber(g.amount);
      });
    }
    if (appsLoaded) {
      baseMonthly.forEach((b) => {
        b.tryout = 0;
      });
      revenueTryouts.forEach((a) => {
        const bucket = bucketByKey.get(
          toMonthKey(a.paidAt ?? a.approvedAt ?? a.updatedAt ?? a.createdAt) ?? ''
        );
        if (bucket) bucket.tryout += tryoutFeeOf(a);
      });
    }
    if (toursLoaded) {
      baseMonthly.forEach((b) => {
        b.tournament = 0;
      });
      paidTournamentTeams.forEach((tm) => {
        const bucket = bucketByKey.get(toMonthKey(tm.paidAt ?? tm.createdAt) ?? '');
        if (bucket) bucket.tournament += tm.amount;
      });
    }

    return {
      paidBookingsCount,
      paidStoreOrdersCount,
      paidGuestSessionsCount,
      approvedTryoutsCount,
      paidTryoutsCount,
      scheduledApplicationsCount,
      applicationsCount,
      paidTournamentTeamsCount,
      pendingBookingsCount,
      pendingApplicationsCount,
      pendingTrainingCount,
      pendingStoreOrdersCount,
      pendingGuestSessionsCount,
      pendingTournamentFeesCount,
      tournamentsCount,
      hostedTournamentsCount,
      playersCount,
      activePlayersCount,
      totalBookingsCount,
      totalTrainingRegsCount,
      coursesCount,
      coachesCount,
      newsCount,
      storeProductsCount,
      storeOrdersCount,
      guestSessionsCount,
      courtRevenue,
      trainingRevenue,
      storeRevenue,
      guestSessionRevenue,
      tryoutRevenue,
      tournamentRevenue,
      verifiedClubRevenue,
      totalClubRevenue,
      confirmedTrainingCount,
      monthlyRevenue: baseMonthly,
    };
  }, [
    isSuperAdmin,
    overviewSummary,
    loadedScopes,
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
