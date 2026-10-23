/**
 * Shared (client + server) court schedule & pricing rules.
 * The server uses these as the single source of truth when validating bookings
 * so the client can never dictate slots or prices.
 */
import type { DayOfWeekKey, WeeklySchedule } from '../types';

export interface CourtTimeSlot {
  start: string;
  end: string;
  label: string;
  durationHours: number;
  period: string; // 'Morning' | 'Afternoon' | 'Evening'
  courtId: string;
}

export const ADDON_PRICES = {
  mineralWaterBottle: 15000,
  mikasaBallCrate: 100000,
  certifiedReferee: 200000,
} as const;

export const MAX_WATER_BOTTLES = 100;

export const DAY_KEYS_BY_JS_DAY: DayOfWeekKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const getDayOfWeekKey = (dateString: string): DayOfWeekKey => {
  const [y, m, d] = (dateString || '').split('-').map(Number);
  if (!y || !m || !d) return 'monday';
  const dateObj = new Date(y, m - 1, d);
  return DAY_KEYS_BY_JS_DAY[dateObj.getDay()] || 'monday';
};

export const getDefaultWeeklyScheduleForCourt = (courtIdOrCode?: string): WeeklySchedule => {
  const id = (courtIdOrCode || '').toLowerCase();
  if (id === 'court-btl' || id === 'btl_tt') {
    const weekday = ['17:30 - 19:00', '19:00 - 21:30'];
    return {
      monday: [...weekday],
      tuesday: [...weekday],
      wednesday: [...weekday],
      thursday: [...weekday],
      friday: [...weekday],
      saturday: ['12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 19:30', '19:30 - 21:30'],
      sunday: ['10:00 - 12:00', '12:00 - 14:00', '14:00 - 17:00', '17:00 - 19:00'],
    };
  }

  if (id === 'court-thecong' || id === 'the_cong' || id === 'court-mydinh' || id === 'my_dinh') {
    const weekday = ['19:00 - 20:30', '20:30 - 22:00', '19:00 - 22:00 (Full 3h Block)'];
    const weekend = ['08:00 - 10:00', '10:00 - 12:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00'];
    return {
      monday: [...weekday],
      tuesday: [...weekday],
      wednesday: [...weekday],
      thursday: [...weekday],
      friday: [...weekday],
      saturday: [...weekend],
      sunday: [...weekend],
    };
  }

  // Default for newly created courts
  const defaultWeekday = ['17:30 - 19:30', '19:30 - 21:30'];
  const defaultWeekend = ['08:00 - 10:00', '10:00 - 12:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00'];
  return {
    monday: [...defaultWeekday],
    tuesday: [...defaultWeekday],
    wednesday: [...defaultWeekday],
    thursday: [...defaultWeekday],
    friday: [...defaultWeekday],
    saturday: [...defaultWeekend],
    sunday: [...defaultWeekend],
  };
};

export const normalizeWeeklySchedule = (raw: unknown, fallbackCourtId?: string): WeeklySchedule => {
  const defaults = getDefaultWeeklyScheduleForCourt(fallbackCourtId);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  const result: WeeklySchedule = { ...defaults };
  for (const dayKey of DAY_KEYS_BY_JS_DAY) {
    if (Array.isArray(obj[dayKey])) {
      result[dayKey] = (obj[dayKey] as unknown[])
        .map((s) => String(s || '').trim())
        .filter((s) => Boolean(parseSlotLabel(s)));
    }
  }
  return result;
};

const getPeriodFromTime = (startHm: string): string => {
  const [h] = startHm.split(':').map(Number);
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

export const slotLabelToCourtTimeSlot = (courtId: string, label: string): CourtTimeSlot | null => {
  const parsed = parseSlotLabel(label);
  if (!parsed) return null;
  const startMin = toMinutes(parsed.start);
  const endMin = toMinutes(parsed.end);
  if (endMin <= startMin) return null;
  const durationHours = Number(((endMin - startMin) / 60).toFixed(2));
  return {
    courtId,
    start: parsed.start,
    end: parsed.end,
    label: label.trim(),
    durationHours,
    period: getPeriodFromTime(parsed.start),
  };
};

// Schedule calculation based on court, date (day of week), and optional custom weeklySchedule
export const getScheduleSlotsForCourtAndDate = (
  courtId: string,
  dateString: string,
  weeklySchedule?: WeeklySchedule | null
): CourtTimeSlot[] => {
  const dayKey = getDayOfWeekKey(dateString);
  const schedule = normalizeWeeklySchedule(weeklySchedule, courtId);
  const daySlotLabels = schedule[dayKey] || [];
  return daySlotLabels
    .map((label) => slotLabelToCourtTimeSlot(courtId, label))
    .filter((slot): slot is CourtTimeSlot => slot !== null);
};

export const toMinutes = (hm: string): number => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

/** Extract "HH:mm - HH:mm" from a slot label (labels may carry a suffix like "(Full 3h Block)"). */
export const parseSlotLabel = (label: string): { start: string; end: string } | null => {
  const match = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(label || '');
  return match ? { start: match[1].padStart(5, '0'), end: match[2].padStart(5, '0') } : null;
};

/** True when two [start, end) time ranges ("HH:mm") overlap. */
export const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
