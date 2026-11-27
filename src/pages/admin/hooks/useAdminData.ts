import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Booking,
  Court,
  MemberApplication,
  NewsPost,
  Player,
  TrainingRegistration,
  TrainingCourse,
  CoachProfile,
  ClosedSlot,
  StoreProduct,
  StoreOrder,
  GuestSessionRecord,
  Tournament,
  TournamentFinanceSummary,
  AdminOverviewSummary,
  VolleyballVenue,
} from '../../../types';
import {
  adminService,
  authService,
  bookingService,
  courtService,
  memberService,
  trainingService,
  coachService,
  playerService,
  newsService,
  sheetsService,
  storeService,
  tournamentService,
  venueService,
} from '../../../services/api';
import { normalizeCourtWeeklySchedule } from '../../../shared/schedule';
import { AdminTabId } from '../types';

function normalizeActiveCourts(fetchedCourts: unknown): Court[] {
  if (!Array.isArray(fetchedCourts)) return [];
  return fetchedCourts
    .filter((fc: Court) => fc.isActive !== false)
    .map((fc: Court) => {
      const subs =
        fc.subCourts && fc.subCourts.length > 0
          ? fc.subCourts
          : fc.id === 'court-btl' || fc.code === 'BTL_TT'
          ? ['Sân A', 'Sân B']
          : [];
      return {
        ...fc,
        subCourts: subs,
        weeklySchedule: normalizeCourtWeeklySchedule(fc.weeklySchedule, fc.id, subs),
      };
    });
}

const ADMIN_PERMITTED_DATA_TABS = new Set<AdminTabId>(['OVERVIEW', 'APPLICATIONS', 'NEWS', 'TOURNAMENTS']);

/**
 * Modular Admin Data Hook with Strict On-Demand / Lazy Tab Fetching:
 * - On entering Admin Hub (`OVERVIEW`), ONLY calls lightweight `/api/admin/overview-summary`.
 * - Each remaining tab fetches ONLY its own endpoint when `activeModule` becomes active.
 * - `ADMIN` role never requests hidden module endpoints (`PLAYERS`, `COURTS`, `BOOKINGS`, `TRAINING`, `STORE`, `SHEETS`, etc.).
 */
export function useAdminData(
  activeModule: AdminTabId = 'OVERVIEW',
  isSuperAdmin: boolean = false,
  isAdmin: boolean = false,
  isCaptain: boolean = false,
  isMemberPortal: boolean = false
) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courtsList, setCourtsList] = useState<Court[]>([]);
  const [applications, setApplications] = useState<MemberApplication[]>([]);
  const [trainingRegs, setTrainingRegs] = useState<TrainingRegistration[]>([]);
  const [coursesList, setCoursesList] = useState<TrainingCourse[]>([]);
  const [coachesList, setCoachesList] = useState<CoachProfile[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [sheetsData, setSheetsData] = useState<any>(null);
  const [closedSlots, setClosedSlots] = useState<ClosedSlot[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const [guestSessions, setGuestSessions] = useState<GuestSessionRecord[]>([]);
  const [tournamentsSummary, setTournamentsSummary] = useState<TournamentFinanceSummary[]>([]);
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>([]);
  const [venuesList, setVenuesList] = useState<VolleyballVenue[]>([]);
  const [overviewSummary, setOverviewSummary] = useState<AdminOverviewSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [loadedScopes, setLoadedScopes] = useState<Set<AdminTabId>>(() => new Set());
  const loadedScopesRef = useRef<Set<AdminTabId>>(new Set());
  const scopeLoadedAtRef = useRef<Map<AdminTabId, number>>(new Map());
  const inflightScopesRef = useRef<Set<AdminTabId>>(new Set());

  const markScopeLoaded = useCallback((scope: AdminTabId) => {
    loadedScopesRef.current.add(scope);
    scopeLoadedAtRef.current.set(scope, Date.now());
    setLoadedScopes(new Set(loadedScopesRef.current));
  }, []);

  const fetchScopeData = useCallback(
    async (scope: AdminTabId, force: boolean = false) => {
      if ((!isAdmin && !isCaptain) || !authService.hasToken()) return;
      if (scope === 'OVERVIEW' || scope === 'USERS' || scope === 'LEADERSHIP') return;
      if (isCaptain && scope !== 'VENUES' && scope !== 'CAPTAIN_PROFILE') return;
      const effectiveScope: AdminTabId = scope === 'CAPTAIN_PROFILE' ? 'VENUES' : scope;
      if (!isSuperAdmin && !isCaptain && !ADMIN_PERMITTED_DATA_TABS.has(effectiveScope)) return;
      if (!force && (loadedScopesRef.current.has(effectiveScope) || inflightScopesRef.current.has(effectiveScope))) return;

      inflightScopesRef.current.add(effectiveScope);
      try {
        switch (effectiveScope) {
          case 'APPLICATIONS': {
            const apps = await memberService.getApplications();
            setApplications(Array.isArray(apps) ? apps : []);
            break;
          }
          case 'NEWS': {
            const posts = await newsService.getNews({ adminMode: true });
            setNewsList(Array.isArray(posts) ? posts : []);
            break;
          }
          case 'TOURNAMENTS': {
            const tours = await tournamentService.getTournaments({ adminMode: true });
            setTournamentsList(Array.isArray(tours) ? tours : []);
            break;
          }
          case 'PLAYERS': {
            const rows = await playerService.getPlayers({ adminMode: true });
            setPlayers(Array.isArray(rows) ? rows : []);
            break;
          }
          case 'COACHES': {
            const rows = await coachService.getCoaches({ adminMode: true });
            setCoachesList(Array.isArray(rows) ? rows : []);
            break;
          }
          case 'TRAINING': {
            const [coursesRes, regsRes] = await Promise.allSettled([
              trainingService.getCourses({ adminMode: true }),
              trainingService.getRegistrations(),
            ]);
            if (coursesRes.status === 'fulfilled') setCoursesList(Array.isArray(coursesRes.value) ? coursesRes.value : []);
            if (regsRes.status === 'fulfilled') setTrainingRegs(Array.isArray(regsRes.value) ? regsRes.value : []);
            break;
          }
          case 'COURTS': {
            const [courtsRes, slotsRes] = await Promise.allSettled([
              courtService.getCourts({ adminMode: true }),
              courtService.getClosedSlots(),
            ]);
            if (courtsRes.status === 'fulfilled') setCourtsList(normalizeActiveCourts(courtsRes.value));
            if (slotsRes.status === 'fulfilled') setClosedSlots(Array.isArray(slotsRes.value) ? slotsRes.value : []);
            break;
          }
          case 'BOOKINGS': {
            const [bookingRes, courtsRes, slotsRes] = await Promise.allSettled([
              bookingService.getBookings(),
              courtService.getCourts({ adminMode: true }),
              courtService.getClosedSlots(),
            ]);
            if (bookingRes.status === 'fulfilled') setBookings(Array.isArray(bookingRes.value) ? bookingRes.value : []);
            if (courtsRes.status === 'fulfilled') setCourtsList(normalizeActiveCourts(courtsRes.value));
            if (slotsRes.status === 'fulfilled') setClosedSlots(Array.isArray(slotsRes.value) ? slotsRes.value : []);
            break;
          }
          case 'STORE': {
            const [productsRes, ordersRes] = await Promise.allSettled([
              storeService.getProducts(),
              storeService.getOrders(),
            ]);
            if (productsRes.status === 'fulfilled') setStoreProducts(Array.isArray(productsRes.value) ? productsRes.value : []);
            if (ordersRes.status === 'fulfilled') setStoreOrders(Array.isArray(ordersRes.value) ? ordersRes.value : []);
            break;
          }
          case 'SHEETS': {
            const data = await sheetsService.getSheetsData();
            setSheetsData(data || null);
            break;
          }
          case 'VENUES': {
            const rows = await venueService.getAdminVenues();
            setVenuesList(Array.isArray(rows) ? rows : []);
            break;
          }
        }
        markScopeLoaded(effectiveScope);
      } catch (e) {
        console.error(`[useAdminData] Failed loading scope ${effectiveScope}:`, e);
      } finally {
        inflightScopesRef.current.delete(effectiveScope);
      }
    },
    [isAdmin, isSuperAdmin, isCaptain, markScopeLoaded]
  );

  const loadMemberPortalData = useCallback(async () => {
    const [playerRes, coachRes, courseRes, venueRes] = await Promise.allSettled([
      playerService.getPlayers(),
      coachService.getCoaches(),
      trainingService.getCourses(),
      venueService.getPublicVenues(),
    ]);
    setPlayers(playerRes.status === 'fulfilled' && Array.isArray(playerRes.value) ? playerRes.value : []);
    setCoachesList(coachRes.status === 'fulfilled' && Array.isArray(coachRes.value) ? coachRes.value : []);
    setCoursesList(courseRes.status === 'fulfilled' && Array.isArray(courseRes.value) ? courseRes.value : []);
    setVenuesList(venueRes.status === 'fulfilled' && Array.isArray(venueRes.value) ? venueRes.value : []);
    markScopeLoaded('MEMBER_OVERVIEW');
  }, [markScopeLoaded]);

  const loadOverviewOnly = useCallback(async () => {
    if (!isAdmin || isCaptain || !authService.hasToken()) return;
    const [summaryRes, publicVenuesRes] = await Promise.allSettled([
      adminService.getOverviewSummary(),
      isSuperAdmin && !loadedScopesRef.current.has('VENUES')
        ? venueService.getPublicVenues()
        : Promise.resolve(null),
    ]);
    const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
    const publicVenues = publicVenuesRes.status === 'fulfilled' ? publicVenuesRes.value : null;
    setOverviewSummary(summary || null);
    markScopeLoaded('OVERVIEW');

    if (!isSuperAdmin || summary?.restrictedFinance) {
      // Strict RBAC cleanup: ADMIN never retains financial or hidden-tab records
      setBookings([]);
      setTrainingRegs([]);
      setCoursesList([]);
      setCoachesList([]);
      setPlayers([]);
      setCourtsList([]);
      setClosedSlots([]);
      setStoreProducts([]);
      setStoreOrders([]);
      setGuestSessions([]);
      setSheetsData(null);
      setTournamentsSummary([]);
      setVenuesList([]);
      return;
    }

    if (Array.isArray(publicVenues) && !loadedScopesRef.current.has('VENUES')) {
      setVenuesList(publicVenues);
    }

    if (summary) {
      if (!loadedScopesRef.current.has('BOOKINGS') && Array.isArray(summary.recentBookings)) {
        setBookings(summary.recentBookings);
      }
      if (!loadedScopesRef.current.has('TRAINING') && Array.isArray(summary.recentTrainingRegs)) {
        setTrainingRegs(summary.recentTrainingRegs);
      }
      if (Array.isArray(summary.guestSessions)) {
        setGuestSessions(summary.guestSessions);
      }
    }
  }, [isAdmin, isCaptain, isSuperAdmin, markScopeLoaded]);

  // Refresh overview + ONLY currently visited permitted scopes (never pre-loads unvisited tabs)
  const fetchData = useCallback(async () => {
    if ((!isAdmin && !isCaptain && !isMemberPortal) || !authService.hasToken()) return;
    setLoading(true);
    try {
      if (isMemberPortal) {
        await loadMemberPortalData();
        return;
      }
      if (isCaptain) {
        await fetchScopeData('VENUES', true);
        return;
      }
      const refreshTasks: Promise<unknown>[] = [loadOverviewOnly()];

      const scopesToRefresh = new Set<AdminTabId>();
      if (activeModule !== 'OVERVIEW' && (isSuperAdmin || ADMIN_PERMITTED_DATA_TABS.has(activeModule))) {
        scopesToRefresh.add(activeModule);
      }
      for (const s of loadedScopesRef.current) {
        if (s !== 'OVERVIEW' && (isSuperAdmin || ADMIN_PERMITTED_DATA_TABS.has(s))) {
          scopesToRefresh.add(s);
        }
      }

      for (const s of scopesToRefresh) {
        refreshTasks.push(fetchScopeData(s, true));
      }

      await Promise.allSettled(refreshTasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeModule, fetchScopeData, isAdmin, isCaptain, isMemberPortal, isSuperAdmin, loadMemberPortalData, loadOverviewOnly]);

  // Initial Hub mount / role transition: load ONLY overview summary (+ active deep-linked tab if any)
  useEffect(() => {
    loadedScopesRef.current.clear();
    setLoadedScopes(new Set());
    if ((!isAdmin && !isCaptain && !isMemberPortal) || !authService.hasToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (isMemberPortal) {
          await loadMemberPortalData();
          return;
        }
        if (isCaptain) {
          await fetchScopeData('VENUES', false);
          return;
        }
        const initTasks: Promise<unknown>[] = [loadOverviewOnly()];
        if (activeModule !== 'OVERVIEW') {
          initTasks.push(fetchScopeData(activeModule, false));
        }
        await Promise.allSettled(initTasks);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally triggered only on role / mount; tab switches below trigger lazy loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isSuperAdmin, isCaptain, isMemberPortal]);

  // Lazy-fetch exact dataset whenever the user switches to a new tab (with silent SWR revalidation on revisit)
  useEffect(() => {
    if ((!isAdmin && !isCaptain) || !authService.hasToken()) return;
    if (activeModule === 'USERS' || activeModule === 'LEADERSHIP') return;
    if (isCaptain && activeModule !== 'VENUES' && activeModule !== 'CAPTAIN_PROFILE') return;
    const effectiveScope: AdminTabId = activeModule === 'CAPTAIN_PROFILE' ? 'VENUES' : activeModule;
    if (effectiveScope === 'OVERVIEW') {
      const lastLoaded = scopeLoadedAtRef.current.get('OVERVIEW') || 0;
      if (loadedScopesRef.current.has('OVERVIEW') && Date.now() - lastLoaded > 15_000) {
        void loadOverviewOnly();
      }
      return;
    }
    if (!isSuperAdmin && !isCaptain && !ADMIN_PERMITTED_DATA_TABS.has(effectiveScope)) return;

    const alreadyLoaded = loadedScopesRef.current.has(effectiveScope);
    if (alreadyLoaded) {
      const lastLoaded = scopeLoadedAtRef.current.get(effectiveScope) || 0;
      if (Date.now() - lastLoaded > 15_000) {
        // Stale-while-revalidate: keep existing data visible while `.dva-top-loader` refreshes silently
        void fetchScopeData(effectiveScope, true);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await fetchScopeData(effectiveScope, false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeModule, fetchScopeData, isAdmin, isCaptain, isSuperAdmin, loadOverviewOnly]);

  return {
    loading,
    fetchData,
    data: {
      bookings,
      courtsList,
      applications,
      trainingRegs,
      coursesList,
      coachesList,
      players,
      newsList,
      sheetsData,
      closedSlots,
      storeProducts,
      storeOrders,
      guestSessions,
      tournamentsSummary,
      tournamentsList,
      venuesList,
      overviewSummary,
      loadedScopes,
    },
    setData: {
      setBookings,
      setCourtsList,
      setApplications,
      setTrainingRegs,
      setCoursesList,
      setCoachesList,
      setPlayers,
      setNewsList,
      setSheetsData,
      setClosedSlots,
      setStoreProducts,
      setStoreOrders,
      setGuestSessions,
      setTournamentsSummary,
      setTournamentsList,
      setVenuesList,
      setOverviewSummary,
    },
  };
}
