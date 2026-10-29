/**
 * Shared (client + server) court schedule & pricing rules.
 * The server uses these as the single source of truth when validating bookings
 * so the client can never dictate slots or prices.
 */
import type { CourtWeeklySchedule, DayOfWeekKey, SubCourtWeeklySchedule, WeeklySchedule } from '../types';

export interface CourtTimeSlot {
  start: string;
  end: string;
  label: string;
  durationHours: number;
  period: string; // 'Morning' | 'Afternoon' | 'Evening'
  courtId: string;
  subCourt?: string; // 'Sân A' | 'Sân B'
}

export const ADDON_PRICES = {
  mineralWaterBottle: 15000,
  mikasaBallCrate: 100000,
  certifiedReferee: 200000,
} as const;

export const MAX_WATER_BOTTLES = 100;

export const toMinutes = (hm: string): number => {
  if (!hm) return 0;
  const clean = String(hm).trim();
  const [h, m] = clean.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

/** Extract "HH:mm - HH:mm" from a slot label (labels may carry a suffix like "(Full 3h Block)"). */
export const parseSlotLabel = (label: string): { start: string; end: string } | null => {
  const match = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(label || '');
  return match ? { start: match[1].padStart(5, '0'), end: match[2].padStart(5, '0') } : null;
};

/**
 * Extract start time in minutes from a slot string (e.g. "12:00 - 14:00")
 * or slot object with startTime / start / label / timeSlot.
 */
export const getSlotStartMinutes = (
  slot: string | { startTime?: string; start?: string; label?: string; timeSlot?: string }
): number => {
  if (!slot) return 0;
  if (typeof slot === 'string') {
    const parsed = parseSlotLabel(slot);
    if (parsed) return toMinutes(parsed.start);
    const startStr = slot.split(/[-–—]/)[0]?.trim();
    return toMinutes(startStr);
  }
  const timeStr = slot.startTime || slot.start;
  if (timeStr) {
    const startStr = timeStr.split(/[-–—]/)[0]?.trim();
    return toMinutes(startStr);
  }
  const labelStr = slot.label || slot.timeSlot;
  if (labelStr) {
    const parsed = parseSlotLabel(labelStr);
    if (parsed) return toMinutes(parsed.start);
    const startStr = labelStr.split(/[-–—]/)[0]?.trim();
    return toMinutes(startStr);
  }
  return 0;
};

/**
 * Comparator to sort slots/sessions ascending by start time (and end time if start time is identical).
 */
export const compareSlotsByStartTime = <
  T extends string | { startTime?: string; start?: string; endTime?: string; end?: string; label?: string; timeSlot?: string }
>(
  a: T,
  b: T
): number => {
  const aStartMin = getSlotStartMinutes(a);
  const bStartMin = getSlotStartMinutes(b);
  if (aStartMin !== bStartMin) {
    return aStartMin - bStartMin;
  }
  const getEndMin = (item: T): number => {
    if (typeof item === 'string') {
      const parsed = parseSlotLabel(item);
      return parsed ? toMinutes(parsed.end) : 0;
    }
    const endStr = item.endTime || item.end;
    if (endStr) return toMinutes(endStr.split(/[-–—]/)[0]?.trim());
    const labelStr = item.label || item.timeSlot;
    if (labelStr) {
      const parsed = parseSlotLabel(labelStr);
      return parsed ? toMinutes(parsed.end) : 0;
    }
    return 0;
  };
  return getEndMin(a) - getEndMin(b);
};

export const sortSlotsByStartTime = <
  T extends string | { startTime?: string; start?: string; endTime?: string; end?: string; label?: string; timeSlot?: string }
>(
  slots: T[]
): T[] => {
  if (!Array.isArray(slots)) return [];
  return [...slots].sort(compareSlotsByStartTime);
};

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

export const getDefaultWeeklyScheduleForCourt = (courtIdOrCode?: string, subCourt?: string): WeeklySchedule => {
  const id = (courtIdOrCode || '').toLowerCase();
  if (id === 'court-btl' || id === 'btl_tt') {
    const isSanB = subCourt === 'Sân B' || subCourt?.toLowerCase().includes('b');
    if (isSanB) {
      const weekdayB = ['18:00 - 20:00', '20:00 - 22:00'];
      return {
        monday: [...weekdayB],
        tuesday: ['18:00 - 20:00'],
        wednesday: [...weekdayB],
        thursday: ['18:00 - 20:00'],
        friday: [...weekdayB],
        saturday: [...weekdayB],
        sunday: ['12:00 - 14:00', '17:00 - 19:00'],
      };
    }
    // Sân A default: Thứ 2, 4, 6, 7 có các ca 17:30 - 19:00 và 19:00 - 21:30
    const weekdayA = ['17:30 - 19:00', '19:00 - 21:30'];
    return {
      monday: [...weekdayA],
      tuesday: ['17:30 - 19:00'],
      wednesday: [...weekdayA],
      thursday: ['17:30 - 19:00'],
      friday: [...weekdayA],
      saturday: [...weekdayA],
      sunday: ['10:00 - 12:00', '14:00 - 17:00'],
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

/**
 * Slots Extractor Helper:
 * Extracts slots array for a given day and sub-court with full backward compatibility.
 * Supports day aliases ('monday', 't2', 'thứ 2', etc.)
 */
export function getSlotsForSubCourt(
  weeklySchedule: any,
  dayKey: string,
  selectedSubCourt?: string
): string[] {
  if (!weeklySchedule || typeof weeklySchedule !== 'object') return [];

  const rawDay = (dayKey || '').toLowerCase().trim();
  const DAY_ALIASES: Record<string, DayOfWeekKey> = {
    t2: 'monday',
    'thứ 2': 'monday',
    'thu 2': 'monday',
    mon: 'monday',
    monday: 'monday',
    t3: 'tuesday',
    'thứ 3': 'tuesday',
    'thu 3': 'tuesday',
    tue: 'tuesday',
    tuesday: 'tuesday',
    t4: 'wednesday',
    'thứ 4': 'wednesday',
    'thu 4': 'wednesday',
    wed: 'wednesday',
    wednesday: 'wednesday',
    t5: 'thursday',
    'thứ 5': 'thursday',
    'thu 5': 'thursday',
    thu: 'thursday',
    thursday: 'thursday',
    t6: 'friday',
    'thứ 6': 'friday',
    'thu 6': 'friday',
    fri: 'friday',
    friday: 'friday',
    t7: 'saturday',
    'thứ 7': 'saturday',
    'thu 7': 'saturday',
    sat: 'saturday',
    saturday: 'saturday',
    cn: 'sunday',
    'chủ nhật': 'sunday',
    'chu nhat': 'sunday',
    sun: 'sunday',
    sunday: 'sunday',
  };
  const normalizedDay = DAY_ALIASES[rawDay] || rawDay;

  const extractSlots = (obj: any): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj[dayKey])) return sortSlotsByStartTime(obj[dayKey]);
    if (Array.isArray(obj[rawDay])) return sortSlotsByStartTime(obj[rawDay]);
    if (Array.isArray(obj[normalizedDay])) return sortSlotsByStartTime(obj[normalizedDay]);
    return [];
  };

  // Trường hợp 1: Schedule chia theo từng sân con
  if (selectedSubCourt && weeklySchedule[selectedSubCourt]) {
    const subSchedule = weeklySchedule[selectedSubCourt];
    const slots = extractSlots(subSchedule);
    if (slots.length > 0 || (subSchedule && typeof subSchedule === 'object')) {
      return slots;
    }
  }

  // Trường hợp 2: Dữ liệu phẳng cũ (hoặc sân đơn)
  const flatSlots = extractSlots(weeklySchedule);
  if (flatSlots.length > 0) return flatSlots;

  // Fallback: nếu có sub-court đầu tiên
  const firstKey = Object.keys(weeklySchedule)[0];
  if (firstKey && typeof weeklySchedule[firstKey] === 'object' && weeklySchedule[firstKey] !== null) {
    return extractSlots(weeklySchedule[firstKey]);
  }

  return [];
}

export const isMultiCourtWeeklySchedule = (
  raw: unknown
): raw is Record<string, WeeklySchedule> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  // If top-level keys contain day-of-week keys, it's a flat schedule
  const hasDayKeys = keys.some((k) => (DAY_KEYS_BY_JS_DAY as string[]).includes(k));
  if (hasDayKeys) return false;
  // If keys are not day keys, check if any value is an object (sub-court schedule)
  return keys.some((k) => obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]));
};

export const normalizeWeeklySchedule = (
  raw: unknown,
  fallbackCourtId?: string,
  subCourt?: string | null
): WeeklySchedule => {
  const defaults = getDefaultWeeklyScheduleForCourt(fallbackCourtId, subCourt || undefined);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;

  // If this is a nested multi-court schedule:
  if (isMultiCourtWeeklySchedule(obj)) {
    if (subCourt && obj[subCourt]) {
      return normalizeWeeklySchedule(obj[subCourt], fallbackCourtId, subCourt);
    }
    // If no specific subCourt requested or found, take the first sub-court's schedule
    const firstKey = Object.keys(obj)[0];
    if (firstKey && obj[firstKey]) {
      return normalizeWeeklySchedule(obj[firstKey], fallbackCourtId, firstKey);
    }
    return defaults;
  }

  const result: WeeklySchedule = { ...defaults };
  for (const dayKey of DAY_KEYS_BY_JS_DAY) {
    if (Array.isArray(obj[dayKey])) {
      result[dayKey] = sortSlotsByStartTime(
        (obj[dayKey] as unknown[])
          .map((s) => String(s || '').trim())
          .filter((s) => Boolean(parseSlotLabel(s)))
      );
    }
  }
  return result;
};

/**
 * Normalizes court schedule according to single-court (flat) vs multi-court (nested) rules.
 * Backward Compatibility:
 * If a court has multiple subCourts (> 1) but raw schedule is flat, maps that schedule to all subCourts.
 * If a court has <= 1 subCourt, flattens into a single WeeklySchedule.
 */
export const normalizeCourtWeeklySchedule = (
  raw: unknown,
  fallbackCourtId?: string,
  subCourts?: string[] | null
): CourtWeeklySchedule => {
  const hasMultiSubCourts = Array.isArray(subCourts) && subCourts.length > 1;

  if (hasMultiSubCourts) {
    const result: Record<string, WeeklySchedule> = {};
    if (isMultiCourtWeeklySchedule(raw)) {
      const nested = raw as Record<string, unknown>;
      for (const sc of subCourts) {
        if (nested[sc]) {
          result[sc] = normalizeWeeklySchedule(nested[sc], fallbackCourtId, sc);
        } else {
          result[sc] = getDefaultWeeklyScheduleForCourt(fallbackCourtId, sc);
        }
      }
    } else {
      // Backward compatibility: raw is flat or undefined/empty
      const hasFlatSlots = raw && typeof raw === 'object' && Object.values(raw).some(v => Array.isArray(v) && v.length > 0);
      if (hasFlatSlots) {
        const flatNormalized = normalizeWeeklySchedule(raw, fallbackCourtId);
        for (const sc of subCourts) {
          result[sc] = JSON.parse(JSON.stringify(flatNormalized));
        }
      } else {
        // Fallback: build default schedule for each sub-court
        for (const sc of subCourts) {
          result[sc] = getDefaultWeeklyScheduleForCourt(fallbackCourtId, sc);
        }
      }
    }
    return result;
  }

  // Single court: always return flat WeeklySchedule
  return normalizeWeeklySchedule(raw, fallbackCourtId);
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

// Schedule calculation based on court, date (day of week), and optional custom weeklySchedule & subCourt
export const getScheduleSlotsForCourtAndDate = (
  courtId: string,
  dateString: string,
  weeklySchedule?: CourtWeeklySchedule | null,
  subCourt?: string | null
): CourtTimeSlot[] => {
  const dayKey = getDayOfWeekKey(dateString);
  let slotLabels = getSlotsForSubCourt(weeklySchedule, dayKey, subCourt || undefined);

  // If slotLabels is empty and weeklySchedule is null/empty, fallback to default for this court & subCourt
  if (slotLabels.length === 0 && (!weeklySchedule || Object.keys(weeklySchedule).length === 0)) {
    const fallbackSched = getDefaultWeeklyScheduleForCourt(courtId, subCourt || undefined);
    slotLabels = getSlotsForSubCourt(fallbackSched, dayKey, subCourt || undefined);
  }

  return slotLabels
    .map((label) => slotLabelToCourtTimeSlot(courtId, label))
    .filter((slot): slot is CourtTimeSlot => slot !== null)
    .map((slot) => (subCourt ? { ...slot, subCourt } : slot))
    .sort(compareSlotsByStartTime);
};

/** True when two [start, end) time ranges ("HH:mm") overlap. */
export const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
