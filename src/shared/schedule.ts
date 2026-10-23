/**
 * Shared (client + server) court schedule & pricing rules.
 * The server uses these as the single source of truth when validating bookings
 * so the client can never dictate slots or prices.
 */

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

// Schedule calculation based on court and day of week
export const getScheduleSlotsForCourtAndDate = (courtId: string, dateString: string): CourtTimeSlot[] => {
  const [y, m, d] = dateString.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Mon, ..., 6 = Sat

  // Court 1: BTL Thong Tin court ('court-btl')
  if (courtId === 'court-btl') {
    // Sunday (Chủ nhật): 10h-12h, 12h-14h, 14h-17h, 17h-19h
    if (day === 0) {
      return [
        { courtId, start: '10:00', end: '12:00', label: '10:00 - 12:00', durationHours: 2.0, period: 'Morning' },
        { courtId, start: '12:00', end: '14:00', label: '12:00 - 14:00', durationHours: 2.0, period: 'Afternoon' },
        { courtId, start: '14:00', end: '17:00', label: '14:00 - 17:00', durationHours: 3.0, period: 'Afternoon' },
        { courtId, start: '17:00', end: '19:00', label: '17:00 - 19:00', durationHours: 2.0, period: 'Evening' },
      ];
    }
    // Saturday (Thứ bảy): 12h-21h30 divided into 1.5h - 2h slots
    if (day === 6) {
      return [
        { courtId, start: '12:00', end: '14:00', label: '12:00 - 14:00', durationHours: 2.0, period: 'Afternoon' },
        { courtId, start: '14:00', end: '16:00', label: '14:00 - 16:00', durationHours: 2.0, period: 'Afternoon' },
        { courtId, start: '16:00', end: '18:00', label: '16:00 - 18:00', durationHours: 2.0, period: 'Evening' },
        { courtId, start: '18:00', end: '19:30', label: '18:00 - 19:30', durationHours: 1.5, period: 'Evening' },
        { courtId, start: '19:30', end: '21:30', label: '19:30 - 21:30', durationHours: 2.0, period: 'Evening' },
      ];
    }
    // Monday to Friday (Thứ 2 đến Thứ 6): 17h30-19h và 19h-21h30
    return [
      { courtId, start: '17:30', end: '19:00', label: '17:30 - 19:00', durationHours: 1.5, period: 'Evening' },
      { courtId, start: '19:00', end: '21:30', label: '19:00 - 21:30', durationHours: 2.5, period: 'Evening' },
    ];
  }

  // Court 2: The Cong court ('court-thecong') & Court 3: My Dinh court ('court-mydinh')
  // Saturday & Sunday: Open All Day
  if (day === 0 || day === 6) {
    return [
      { courtId, start: '08:00', end: '10:00', label: '08:00 - 10:00', durationHours: 2.0, period: 'Morning' },
      { courtId, start: '10:00', end: '12:00', label: '10:00 - 12:00', durationHours: 2.0, period: 'Morning' },
      { courtId, start: '14:00', end: '16:00', label: '14:00 - 16:00', durationHours: 2.0, period: 'Afternoon' },
      { courtId, start: '16:00', end: '18:00', label: '16:00 - 18:00', durationHours: 2.0, period: 'Afternoon' },
      { courtId, start: '18:00', end: '20:00', label: '18:00 - 20:00', durationHours: 2.0, period: 'Evening' },
      { courtId, start: '20:00', end: '22:00', label: '20:00 - 22:00', durationHours: 2.0, period: 'Evening' },
    ];
  }

  // Monday to Friday: 19h - 22h
  return [
    { courtId, start: '19:00', end: '20:30', label: '19:00 - 20:30', durationHours: 1.5, period: 'Evening' },
    { courtId, start: '20:30', end: '22:00', label: '20:30 - 22:00', durationHours: 1.5, period: 'Evening' },
    { courtId, start: '19:00', end: '22:00', label: '19:00 - 22:00 (Full 3h Block)', durationHours: 3.0, period: 'Evening' },
  ];
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
