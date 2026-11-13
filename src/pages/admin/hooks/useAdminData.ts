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
} from '../../../types';
import {
  bookingService,
  courtService,
  memberService,
  trainingService,
  coachService,
  playerService,
  newsService,
  sheetsService,
  storeService,
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

/**
 * Modular Admin Data Hook with Tab-Scoped Lazy Loading:
 * - Core analytics & badge datasets load on mount.
 * - Module-specific datasets (`SHEETS`, `COURTS` closed-slots, `STORE` products & orders)
 *   lazy-load when their tab is first activated and refresh when `fetchData()` is called.
 */
export function useAdminData(activeModule: AdminTabId = 'OVERVIEW') {
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
  const [loading, setLoading] = useState(false);

  const loadedLazyScopesRef = useRef<Set<'COURTS' | 'SHEETS' | 'STORE'>>(new Set());

  const fetchLazyScope = useCallback(async (scope: 'COURTS' | 'SHEETS' | 'STORE') => {
    try {
      if (scope === 'COURTS') {
        const cs = await courtService.getClosedSlots();
        setClosedSlots(Array.isArray(cs) ? cs : []);
      } else if (scope === 'SHEETS') {
        const s = await sheetsService.getSheetsData();
        setSheetsData(s || null);
      } else if (scope === 'STORE') {
        const [products, orders] = await Promise.all([
          storeService.getProducts(),
          storeService.getOrders(),
        ]);
        setStoreProducts(Array.isArray(products) ? products : []);
        setStoreOrders(Array.isArray(orders) ? orders : []);
      }
      loadedLazyScopesRef.current.add(scope);
    } catch (e) {
      console.error(`[useAdminData] Failed lazy-loading scope ${scope}:`, e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, t, p, n, courses, coaches, fetchedCourts, fetchedProducts, fetchedOrders] = await Promise.all([
        bookingService.getBookings(),
        memberService.getApplications(),
        trainingService.getRegistrations(),
        playerService.getPlayers(),
        newsService.getNews(),
        trainingService.getCourses(),
        coachService.getCoaches(),
        courtService.getCourts(),
        storeService.getProducts(),
        storeService.getOrders(),
      ]);
      setBookings(Array.isArray(b) ? b : []);
      setApplications(Array.isArray(a) ? a : []);
      setTrainingRegs(Array.isArray(t) ? t : []);
      setPlayers(Array.isArray(p) ? p : []);
      setNewsList(Array.isArray(n) ? n : []);
      setCoursesList(Array.isArray(courses) ? courses : []);
      setCoachesList(Array.isArray(coaches) ? coaches : []);
      setCourtsList(normalizeActiveCourts(fetchedCourts));
      setStoreProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
      setStoreOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
      loadedLazyScopesRef.current.add('STORE');

      // Also refresh any lazy scopes that have already been visited
      const activeLazyScopes = Array.from(loadedLazyScopesRef.current).filter((s) => s !== 'STORE');
      if (activeLazyScopes.length > 0) {
        await Promise.all(activeLazyScopes.map((scope) => fetchLazyScope(scope)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetchLazyScope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lazy-fetch tab-specific datasets only when the Admin visits that module
  useEffect(() => {
    if (
      (activeModule === 'COURTS' || activeModule === 'BOOKINGS') &&
      !loadedLazyScopesRef.current.has('COURTS')
    ) {
      fetchLazyScope('COURTS');
    } else if (
      activeModule === 'SHEETS' &&
      !loadedLazyScopesRef.current.has('SHEETS')
    ) {
      fetchLazyScope('SHEETS');
    } else if (
      activeModule === 'STORE' &&
      !loadedLazyScopesRef.current.has('STORE')
    ) {
      fetchLazyScope('STORE');
    }
  }, [activeModule, fetchLazyScope]);

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
    },
  };
}
