import { useState, useCallback, useEffect } from 'react';
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
} from '../../../services/api';
import { normalizeCourtWeeklySchedule } from '../../../shared/schedule';

export function useAdminData() {
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
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, t, p, n, s, cs, courses, coaches, fetchedCourts] = await Promise.all([
        bookingService.getBookings(),
        memberService.getApplications(),
        trainingService.getRegistrations(),
        playerService.getPlayers(),
        newsService.getNews(),
        sheetsService.getSheetsData(),
        courtService.getClosedSlots(),
        trainingService.getCourses(),
        coachService.getCoaches(),
        courtService.getCourts(),
      ]);
      setBookings(Array.isArray(b) ? b : []);
      setApplications(Array.isArray(a) ? a : []);
      setTrainingRegs(Array.isArray(t) ? t : []);
      setPlayers(Array.isArray(p) ? p : []);
      setNewsList(Array.isArray(n) ? n : []);
      setSheetsData(s || null);
      setClosedSlots(Array.isArray(cs) ? cs : []);
      setCoursesList(Array.isArray(courses) ? courses : []);
      setCoachesList(Array.isArray(coaches) ? coaches : []);
      if (Array.isArray(fetchedCourts)) {
        const activeCourts = fetchedCourts
          .filter((fc) => fc.isActive !== false)
          .map((fc) => {
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
        setCourtsList(activeCourts);
      } else {
        setCourtsList([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    },
  };
}
