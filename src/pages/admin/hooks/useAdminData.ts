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
  isCaptain: boolean = false
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
  const inflightScopesRef = useRef<Set<AdminTabId>>(new Set());

  const markScopeLoaded = useCallback((scope: AdminTabId) => {
    loadedScopesRef.current.add(scope);
    setLoadedScopes(new Set(loadedScopesRef.current));
  }, []);

  const fetchScopeData = useCallback(
    async (scope: AdminTabId, force: boolean = false) => {
      if ((!isAdmin && !isCaptain) || !authService.hasToken()) return;
      if (scope === 'OVERVIEW' || scope === 'USERS') return;
      if (isCaptain && scope !== 'VENUES') return;
      if (!isSuperAdmin && !isCaptain && !ADMIN_PERMITTED_DATA_TABS.has(scope)) return;
      if (!force && (loadedScopesRef.current.has(scope) || inflightScopesRef.current.has(scope))) return;

      inflightScopesRef.current.add(scope);
      try {
        switch (scope) {
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
            const [courses, regs] = await Promise.all([
              trainingService.getCourses({ adminMode: true }),
              trainingService.getRegistrations(),
            ]);
            setCoursesList(Array.isArray(courses) ? courses : []);
            setTrainingRegs(Array.isArray(regs) ? regs : []);
            break;
          }
          case 'COURTS': {
            const [courts, slots] = await Promise.all([
              courtService.getCourts({ adminMode: true }),
              courtService.getClosedSlots(),
            ]);
            setCourtsList(normalizeActiveCourts(courts));
            setClosedSlots(Array.isArray(slots) ? slots : []);
            break;
          }
          case 'BOOKINGS': {
            const [bookingRows, courts, slots] = await Promise.all([
              bookingService.getBookings(),
              courtService.getCourts({ adminMode: true }),
              courtService.getClosedSlots(),
            ]);
            setBookings(Array.isArray(bookingRows) ? bookingRows : []);
            setCourtsList(normalizeActiveCourts(courts));
            setClosedSlots(Array.isArray(slots) ? slots : []);
            break;
          }
          case 'STORE': {
            const [products, orders] = await Promise.all([
              storeService.getProducts(),
              storeService.getOrders(),
            ]);
            setStoreProducts(Array.isArray(products) ? products : []);
            setStoreOrders(Array.isArray(orders) ? orders : []);
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
        markScopeLoaded(scope);
      } catch (e) {
        console.error(`[useAdminData] Failed loading scope ${scope}:`, e);
      } finally {
        inflightScopesRef.current.delete(scope);
      }
    },
    [isAdmin, isSuperAdmin, isCaptain, markScopeLoaded]
  );

  const loadOverviewOnly = useCallback(async () => {
    if (!isAdmin || isCaptain || !authService.hasToken()) return;
    const summary = await adminService.getOverviewSummary();
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
  }, [isAdmin, isSuperAdmin, markScopeLoaded]);

  // Refresh overview + ONLY currently visited permitted scopes (never pre-loads unvisited tabs)
  const fetchData = useCallback(async () => {
    if ((!isAdmin && !isCaptain) || !authService.hasToken()) return;
    setLoading(true);
    try {
      if (isCaptain) {
        await fetchScopeData('VENUES', true);
        return;
      }
      await loadOverviewOnly();

      const scopesToRefresh = new Set<AdminTabId>();
      if (activeModule !== 'OVERVIEW' && (isSuperAdmin || ADMIN_PERMITTED_DATA_TABS.has(activeModule))) {
        scopesToRefresh.add(activeModule);
      }
      for (const s of loadedScopesRef.current) {
        if (s !== 'OVERVIEW' && (isSuperAdmin || ADMIN_PERMITTED_DATA_TABS.has(s))) {
          scopesToRefresh.add(s);
        }
      }

      if (scopesToRefresh.size > 0) {
        await Promise.all(Array.from(scopesToRefresh).map((s) => fetchScopeData(s, true)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeModule, fetchScopeData, isAdmin, isCaptain, isSuperAdmin, loadOverviewOnly]);

  // Initial Hub mount / role transition: load ONLY overview summary (+ active deep-linked tab if any)
  useEffect(() => {
    loadedScopesRef.current.clear();
    setLoadedScopes(new Set());
    if ((!isAdmin && !isCaptain) || !authService.hasToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (isCaptain) {
          await fetchScopeData('VENUES', false);
          return;
        }
        await loadOverviewOnly();
        if (!cancelled && activeModule !== 'OVERVIEW') {
          await fetchScopeData(activeModule, false);
        }
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
  }, [isAdmin, isSuperAdmin, isCaptain]);

  // Lazy-fetch exact dataset whenever the user switches to a new tab
  useEffect(() => {
    if ((!isAdmin && !isCaptain) || !authService.hasToken()) return;
    if (activeModule === 'OVERVIEW' || activeModule === 'USERS') return;
    if (isCaptain && activeModule !== 'VENUES') return;
    if (!isSuperAdmin && !isCaptain && !ADMIN_PERMITTED_DATA_TABS.has(activeModule)) return;
    if (loadedScopesRef.current.has(activeModule)) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await fetchScopeData(activeModule, false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeModule, fetchScopeData, isSuperAdmin]);

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
