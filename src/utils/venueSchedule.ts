import type { CourtClubProfile, SessionConflictDetail, VenueGenderRule, VenuePlayStyle, VenueRecruitmentStatus, VenueSessionSlot, VenueType, VolleyballVenue } from '../types';

export const VN_DAY_OPTIONS = [
  { value: 1, short: 'T2', label: 'Thứ 2' },
  { value: 2, short: 'T3', label: 'Thứ 3' },
  { value: 3, short: 'T4', label: 'Thứ 4' },
  { value: 4, short: 'T5', label: 'Thứ 5' },
  { value: 5, short: 'T6', label: 'Thứ 6' },
  { value: 6, short: 'T7', label: 'Thứ 7' },
  { value: 0, short: 'CN', label: 'Chủ Nhật' },
] as const;

const DAY_ORDER: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
const DAY_SHORT: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };
const DAY_FULL: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'Chủ Nhật' };
const WEEKDAY_EN: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export const PLAY_STYLE_META: Record<VenuePlayStyle, { emoji: string; shortLabel: string; label: string; badgeClass: string; activeClass: string }> = {
  COMPETITIVE: { emoji: '🔥', shortLabel: 'Đấu căng', label: 'Đấu căng / Kèo trình độ', badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/45', activeClass: 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-orange-400' },
  FUN_GAME: { emoji: '😊', shortLabel: 'Chơi vui', label: 'Chơi vui vẻ / Giao lưu', badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40', activeClass: 'bg-emerald-600 text-white border-emerald-400' },
  TRAINING: { emoji: '🎯', shortLabel: 'Tập luyện', label: 'Thiên về tập luyện', badgeClass: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/40', activeClass: 'bg-indigo-600 text-white border-indigo-400' },
};

export const SESSION_POSITION_OPTIONS = [
  { code: 'OH', label: 'Chủ công' },
  { code: 'MB', label: 'Phụ công' },
  { code: 'OP', label: 'Đối chuyền' },
  { code: 'S', label: 'Chuyền hai' },
  { code: 'L', label: 'Libero' },
] as const;

export const GENDER_RULE_META: Record<VenueGenderRule, { label: string; shortLabel: string; badgeClass: string }> = {
  MALE_ONLY: { label: '♂️ Chỉ Nam', shortLabel: '♂️ Chỉ Nam', badgeClass: 'bg-blue-500/15 text-blue-300 border border-blue-500/40' },
  MIXED: { label: '⚥ Nam & Nữ (Mixed)', shortLabel: '⚥ Nam & Nữ', badgeClass: 'bg-purple-500/15 text-purple-300 border border-purple-500/40' },
  FEMALE_ONLY: { label: '♀️ Chỉ Nữ', shortLabel: '♀️ Chỉ Nữ', badgeClass: 'bg-pink-500/15 text-pink-300 border border-pink-500/40' },
};
export const suggestGenderRule = (style?: VenuePlayStyle): VenueGenderRule => (style === 'COMPETITIVE' ? 'MALE_ONLY' : 'MIXED');

export const RECRUITMENT_META: Record<VenueRecruitmentStatus, { label: string; badgeClass: string }> = {
  OPEN_RECRUIT: { label: 'Đang tuyển slot', badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35' },
  CHECK_CAPTAIN: { label: 'Hỏi đội trưởng', badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/35' },
  FULL: { label: 'Đã đủ người', badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700' },
};

export const VENUE_TYPE_META: Record<VenueType, { label: string; shortLabel: string; badgeClass: string }> = {
  COMMERCIAL: { label: 'Sân dịch vụ', shortLabel: 'Sân dịch vụ', badgeClass: 'bg-sky-500/15 text-sky-300 border border-sky-500/40' },
  FREE_PUBLIC: { label: 'Sân Miễn Phí / Công cộng', shortLabel: 'Sân Free', badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40' },
};

export const HANOI_DISTRICTS = ['Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Nam Từ Liêm', 'Cầu Giấy', 'Ba Đình', 'Hoàng Mai', 'Tây Hồ', 'Hà Đông', 'Long Biên', 'Bắc Từ Liêm', 'Hoàn Kiếm', 'Gia Lâm', 'Đông Anh', 'Thanh Trì'] as const;
export const VIETNAM_CITIES = [{ name: 'Hà Nội', lat: 21.0285, lng: 105.8542, zoom: 12 }, { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, zoom: 12 }, { name: 'TP.HCM', lat: 10.8231, lng: 106.6297, zoom: 12 }] as const;
export const VIETNAM_OVERVIEW = { lat: 16.0471, lng: 108.2068, zoom: 6 } as const;
export const SURFACE_TYPES = ['Sàn thảm PVC', 'Sàn gỗ', 'Sân xi măng / Ngoài trời'] as const;

export interface VietnamNow { dayOfWeek: number; minutes: number; timeLabel: string; dayLabel: string; dateStr: string; nowMs: number }

export function getVietnamNow(date: Date = new Date()): VietnamNow {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const rawH = Number(get('hour') || '0');
    const h = rawH === 24 ? 0 : rawH;
    const m = Number(get('minute') || '0');
    const dayOfWeek = WEEKDAY_EN[get('weekday')] ?? date.getDay();
    const dateStr = `${get('year')}-${get('month')}-${get('day')}`;
    return { dayOfWeek, minutes: h * 60 + m, timeLabel: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, dayLabel: DAY_FULL[dayOfWeek], dateStr, nowMs: date.getTime() };
  } catch {
    const dayOfWeek = date.getDay();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { dayOfWeek, minutes: date.getHours() * 60 + date.getMinutes(), timeLabel: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`, dayLabel: DAY_FULL[dayOfWeek], dateStr, nowMs: date.getTime() };
  }
}

export function getDateForWeekdayInCurrentWeek(dayOfWeek: number, nowVn: VietnamNow): string {
  const [y, m, d] = nowVn.dateStr.split('-').map(Number);
  const diff = (DAY_ORDER[dayOfWeek] ?? 0) - (DAY_ORDER[nowVn.dayOfWeek] ?? 0);
  return new Date(Date.UTC(y, m - 1, d + diff)).toISOString().slice(0, 10);
}

export const isSessionCancelledOnDate = (s: Pick<VenueSessionSlot, 'isCancelled' | 'cancelledDates'>, dateStr: string) =>
  Boolean(s.isCancelled) || Boolean(s.cancelledDates?.includes(dateStr));

export const formatShortVnDate = (ymd: string) => { const [, m, d] = ymd.split('-'); return m && d ? `${d}/${m}` : ymd; };

export const getSubCourtNames = (count: number) => Array.from({ length: Math.max(1, Math.min(12, Math.floor(Number(count) || 1))) }, (_, i) => `Court ${String.fromCharCode(65 + i)}`);
export const parseTimeToMinutes = (hhmm: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : -1; };
export const formatDayFull = (day: number) => DAY_FULL[day] ?? String(day);
export const formatDaysOfWeek = (days: number[]) => !days?.length ? 'Chưa có lịch' : days.length === 7 ? 'Cả tuần (T2 – CN)' : [...new Set(days)].sort((a, b) => (DAY_ORDER[a] ?? 9) - (DAY_ORDER[b] ?? 9)).map((d) => DAY_SHORT[d]).join(', ');

export function isVenueClosedNow(venue: Pick<VolleyballVenue, 'isClosed' | 'closedUntil'>, nowMs: number = Date.now()): boolean {
  if (venue.closedUntil) {
    const untilMs = new Date(venue.closedUntil).getTime();
    if (!Number.isNaN(untilMs)) return nowMs < untilMs;
  }
  return Boolean(venue.isClosed);
}

export function formatClosedUntilDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function getSessionRealtimeInfo(session: Pick<VenueSessionSlot, 'daysOfWeek' | 'startTime' | 'endTime' | 'isCancelled' | 'cancelledDates'>, nowVn: VietnamNow, venueClosed = false) {
  const cancelledToday = isSessionCancelledOnDate(session, nowVn.dateStr);
  if (venueClosed || cancelledToday || !session.daysOfWeek?.includes(nowVn.dayOfWeek)) {
    return { state: cancelledToday && !venueClosed ? ('CANCELLED' as const) : ('OTHER_DAY' as const), countdownText: null };
  }
  const [start, end] = [parseTimeToMinutes(session.startTime), parseTimeToMinutes(session.endTime)];
  if (start < 0 || end < 0) return { state: 'OTHER_DAY' as const, countdownText: null };
  if (nowVn.minutes >= start && nowVn.minutes < end) return { state: 'LIVE' as const, countdownText: null };
  if (nowVn.minutes < start) {
    const diff = Math.max(1, start - nowVn.minutes);
    const text = diff < 60 ? `Còn ${diff} phút nữa diễn ra` : `Còn ${Math.floor(diff / 60)} giờ${diff % 60 ? ` ${diff % 60} phút` : ''} nữa`;
    return { state: 'UPCOMING' as const, countdownText: text };
  }
  return { state: 'ENDED' as const, countdownText: null };
}

export const isVenueLiveNow = (v: VolleyballVenue, nowVn: VietnamNow) =>
  !isVenueClosedNow(v, nowVn.nowMs) && (v.sessions || []).some((s) => s.club?.isActive !== false && getSessionRealtimeInfo(s, nowVn).state === 'LIVE');

export const isVenueUpcomingToday = (v: VolleyballVenue, nowVn: VietnamNow) =>
  !isVenueClosedNow(v, nowVn.nowMs) && (v.sessions || []).some((s) => s.club?.isActive !== false && getSessionRealtimeInfo(s, nowVn).state === 'UPCOMING');

// Pure client-side Haversine distance (km)
export function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const buildGoogleMapsUrl = (v: Pick<VolleyballVenue, 'latitude' | 'longitude'>) => `https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`;
export const sanitizePhoneForLink = (p: string) => (p || '').replace(/[^\d+]/g, '');
export const getClubInitials = (name: string) => { const p = (name || '').trim().split(/\s+/).filter(Boolean); return !p.length ? 'VB' : p.length === 1 ? p[0].slice(0, 3).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase(); };

export function buildZaloContact(
  club: Pick<CourtClubProfile, 'name' | 'captainName' | 'captainPhone' | 'captainZalo'>,
  venue: Pick<VolleyballVenue, 'name'>,
  session?: Pick<VenueSessionSlot, 'daysOfWeek' | 'startTime' | 'endTime' | 'subCourts'>
) {
  const raw = (club.captainZalo || club.captainPhone || '').trim();
  const zaloUrl = /^https?:\/\//i.test(raw) ? raw : `https://zalo.me/${raw.replace(/[^\d]/g, '')}`;
  const slot = session ? ` lịch ${formatDaysOfWeek(session.daysOfWeek)} (${session.startTime}–${session.endTime}, ${session.subCourts.join(' & ')})` : '';
  return { zaloUrl, messageTemplate: `Chào ${club.captainName}, mình xem trên Bản đồ sân DVA thấy CLB "${club.name}" đánh tại ${venue.name}${slot}. Cho mình hỏi buổi tới đội còn slot giao lưu không ạ?` };
}

export function findClientSessionConflicts(
  existing: VenueSessionSlot[],
  c: { daysOfWeek: number[]; startTime: string; endTime: string; subCourts: string[] },
  excludeId?: string
): SessionConflictDetail[] {
  const [ns, ne] = [parseTimeToMinutes(c.startTime), parseTimeToMinutes(c.endTime)];
  if (ns < 0 || ne <= ns) return [];
  const days = new Set(c.daysOfWeek);
  const courts = new Set(c.subCourts.map((x) => x.trim().toLowerCase()));
  return existing.reduce<SessionConflictDetail[]>((acc, s) => {
    if ((excludeId && s.id === excludeId) || s.club?.isActive === false) return acc;
    const hitDays = s.daysOfWeek.filter((d) => days.has(d));
    const hitCourts = s.subCourts.filter((x) => courts.has(x.trim().toLowerCase()));
    if (hitDays.length && hitCourts.length && ns < parseTimeToMinutes(s.endTime) && parseTimeToMinutes(s.startTime) < ne) {
      acc.push({ sessionId: s.id, clubName: s.club?.name || 'Đội khác', days: hitDays, startTime: s.startTime, endTime: s.endTime, subCourts: hitCourts });
    }
    return acc;
  }, []);
}
