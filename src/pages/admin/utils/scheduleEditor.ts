import {
  DayOfWeekKey,
  WeeklySchedule,
  CourtWeeklySchedule,
  DAYS_OF_WEEK,
} from '../../../types';
import {
  getDefaultWeeklyScheduleForCourt,
  normalizeWeeklySchedule,
  getSlotsForSubCourt,
  sortSlotsByStartTime,
} from '../../../shared/schedule';

export function resolveModalSubCourts(
  subCourts?: string[],
  courtId?: string,
  courtCode?: string
): string[] {
  if (subCourts && subCourts.length > 0) {
    return subCourts;
  }
  if (courtId === 'court-btl' || courtCode === 'BTL_TT') {
    return ['Sân A', 'Sân B'];
  }
  return [];
}

export function getDaySlotsForSchedule(
  weeklySchedule: CourtWeeklySchedule | undefined,
  dayKey: DayOfWeekKey,
  modalSubCourts: string[],
  modalSubCourtTab: string
): string[] {
  const hasMultipleSubCourts = modalSubCourts.length > 1;
  let slots: string[] = [];
  if (hasMultipleSubCourts) {
    const activeSc =
      modalSubCourtTab === '__ALL__'
        ? modalSubCourts[0]
        : modalSubCourtTab || modalSubCourts[0];
    slots = getSlotsForSubCourt(weeklySchedule, dayKey, activeSc);
  } else {
    slots = getSlotsForSubCourt(weeklySchedule, dayKey);
  }
  return sortSlotsByStartTime(slots);
}

export function addSlotToSchedule(params: {
  weeklySchedule: CourtWeeklySchedule | undefined;
  courtId?: string;
  modalSubCourts: string[];
  modalSubCourtTab: string;
  dayKey: DayOfWeekKey;
  slotLabel: string;
}): { nextSchedule: CourtWeeklySchedule; duplicateError?: string } {
  const { weeklySchedule, courtId, modalSubCourts, modalSubCourtTab, dayKey, slotLabel } =
    params;
  const hasMultipleSubCourts = modalSubCourts.length > 1;

  if (hasMultipleSubCourts) {
    const prevNested = (weeklySchedule || {}) as Record<string, WeeklySchedule>;
    const nextNested: Record<string, WeeklySchedule> = {};
    for (const sc of modalSubCourts) {
      nextNested[sc] = {
        ...(prevNested[sc] || getDefaultWeeklyScheduleForCourt(courtId, sc)),
      };
    }

    if (modalSubCourtTab === '__ALL__') {
      for (const sc of modalSubCourts) {
        const daySlots = nextNested[sc][dayKey] || [];
        if (!daySlots.includes(slotLabel)) {
          nextNested[sc] = {
            ...nextNested[sc],
            [dayKey]: sortSlotsByStartTime([...daySlots, slotLabel]),
          };
        }
      }
    } else {
      const activeSc = modalSubCourtTab || modalSubCourts[0];
      const scSched =
        nextNested[activeSc] || getDefaultWeeklyScheduleForCourt(courtId, activeSc);
      const daySlots = scSched[dayKey] || [];
      if (daySlots.includes(slotLabel)) {
        return {
          nextSchedule: weeklySchedule || nextNested,
          duplicateError: `Khung giờ này đã tồn tại trong ngày đã chọn của ${activeSc}.`,
        };
      }
      nextNested[activeSc] = {
        ...scSched,
        [dayKey]: sortSlotsByStartTime([...daySlots, slotLabel]),
      };
    }
    return { nextSchedule: nextNested };
  }

  const currentSchedule = normalizeWeeklySchedule(weeklySchedule, courtId);
  const daySlots = currentSchedule[dayKey] || [];
  if (daySlots.includes(slotLabel)) {
    return {
      nextSchedule: currentSchedule,
      duplicateError: 'Khung giờ này đã tồn tại trong ngày đã chọn.',
    };
  }
  return {
    nextSchedule: {
      ...currentSchedule,
      [dayKey]: sortSlotsByStartTime([...daySlots, slotLabel]),
    },
  };
}

export function removeSlotFromSchedule(params: {
  weeklySchedule: CourtWeeklySchedule | undefined;
  courtId?: string;
  modalSubCourts: string[];
  modalSubCourtTab: string;
  dayKey: DayOfWeekKey;
  index: number;
  slotValue?: string;
}): CourtWeeklySchedule {
  const {
    weeklySchedule,
    courtId,
    modalSubCourts,
    modalSubCourtTab,
    dayKey,
    index,
    slotValue,
  } = params;
  const hasMultipleSubCourts = modalSubCourts.length > 1;

  if (hasMultipleSubCourts) {
    const prevNested = (weeklySchedule || {}) as Record<string, WeeklySchedule>;
    const nextNested: Record<string, WeeklySchedule> = {};
    for (const sc of modalSubCourts) {
      nextNested[sc] = {
        ...(prevNested[sc] || getDefaultWeeklyScheduleForCourt(courtId, sc)),
      };
    }

    if (modalSubCourtTab === '__ALL__') {
      for (const sc of modalSubCourts) {
        const daySlots = nextNested[sc][dayKey] || [];
        nextNested[sc] = {
          ...nextNested[sc],
          [dayKey]: daySlots.filter((s, idx) => (slotValue ? s !== slotValue : idx !== index)),
        };
      }
    } else {
      const activeSc = modalSubCourtTab || modalSubCourts[0];
      const scSched =
        nextNested[activeSc] || getDefaultWeeklyScheduleForCourt(courtId, activeSc);
      const daySlots = scSched[dayKey] || [];
      nextNested[activeSc] = {
        ...scSched,
        [dayKey]: daySlots.filter((_, idx) => idx !== index),
      };
    }
    return nextNested;
  }

  const currentSchedule = normalizeWeeklySchedule(weeklySchedule, courtId);
  const daySlots = currentSchedule[dayKey] || [];
  return {
    ...currentSchedule,
    [dayKey]: daySlots.filter((_, idx) => idx !== index),
  };
}

export function copyDayToWeekdaysInSchedule(params: {
  weeklySchedule: CourtWeeklySchedule | undefined;
  courtId?: string;
  modalSubCourts: string[];
  modalSubCourtTab: string;
  sourceDay: DayOfWeekKey;
}): { nextSchedule: CourtWeeklySchedule; feedbackMessage: string } {
  const { weeklySchedule, courtId, modalSubCourts, modalSubCourtTab, sourceDay } = params;
  const hasMultipleSubCourts = modalSubCourts.length > 1;
  const dayShortVi = DAYS_OF_WEEK.find((d) => d.key === sourceDay)?.shortVi;

  if (hasMultipleSubCourts) {
    const prevNested = (weeklySchedule || {}) as Record<string, WeeklySchedule>;
    const nextNested: Record<string, WeeklySchedule> = {};
    for (const sc of modalSubCourts) {
      nextNested[sc] = {
        ...(prevNested[sc] || getDefaultWeeklyScheduleForCourt(courtId, sc)),
      };
    }

    if (modalSubCourtTab === '__ALL__') {
      for (const sc of modalSubCourts) {
        const sourceSlots = [...(nextNested[sc][sourceDay] || [])];
        nextNested[sc] = {
          ...nextNested[sc],
          monday: [...sourceSlots],
          tuesday: [...sourceSlots],
          wednesday: [...sourceSlots],
          thursday: [...sourceSlots],
          friday: [...sourceSlots],
        };
      }
      return {
        nextSchedule: nextNested,
        feedbackMessage: `Đã sao chép lịch ${dayShortVi} sang T2 - T6 cho tất cả các sân!`,
      };
    }

    const activeSc = modalSubCourtTab || modalSubCourts[0];
    const scSched =
      nextNested[activeSc] || getDefaultWeeklyScheduleForCourt(courtId, activeSc);
    const sourceSlots = [...(scSched[sourceDay] || [])];
    nextNested[activeSc] = {
      ...scSched,
      monday: [...sourceSlots],
      tuesday: [...sourceSlots],
      wednesday: [...sourceSlots],
      thursday: [...sourceSlots],
      friday: [...sourceSlots],
    };
    return {
      nextSchedule: nextNested,
      feedbackMessage: `Đã sao chép lịch ${dayShortVi} sang T2 - T6 cho ${activeSc}!`,
    };
  }

  const currentSchedule = normalizeWeeklySchedule(weeklySchedule, courtId);
  const sourceSlots = [...(currentSchedule[sourceDay] || [])];
  return {
    nextSchedule: {
      ...currentSchedule,
      monday: [...sourceSlots],
      tuesday: [...sourceSlots],
      wednesday: [...sourceSlots],
      thursday: [...sourceSlots],
      friday: [...sourceSlots],
    },
    feedbackMessage: `Đã sao chép lịch ${dayShortVi} sang T2 - T6!`,
  };
}

export function copySubCourtScheduleToOthers(params: {
  weeklySchedule: CourtWeeklySchedule | undefined;
  courtId?: string;
  modalSubCourts: string[];
  sourceSubCourt: string;
}): { nextSchedule: CourtWeeklySchedule; feedbackMessage: string } | null {
  const { weeklySchedule, courtId, modalSubCourts, sourceSubCourt } = params;
  if (modalSubCourts.length <= 1) return null;

  const prevNested = (weeklySchedule || {}) as Record<string, WeeklySchedule>;
  const sourceSchedule =
    prevNested[sourceSubCourt] ||
    getDefaultWeeklyScheduleForCourt(courtId, sourceSubCourt);
  const otherSubCourts = modalSubCourts.filter((sc) => sc !== sourceSubCourt);
  if (otherSubCourts.length === 0) return null;

  const nextNested: Record<string, WeeklySchedule> = { ...prevNested };
  for (const sc of otherSubCourts) {
    nextNested[sc] = JSON.parse(JSON.stringify(sourceSchedule));
  }
  return {
    nextSchedule: nextNested,
    feedbackMessage: `Đã sao chép toàn bộ lịch tuần của ${sourceSubCourt} sang ${otherSubCourts.join(', ')}!`,
  };
}

export function mergeCourtWeeklyScheduleOnSave(params: {
  formSchedule: CourtWeeklySchedule | undefined;
  existingSchedule: CourtWeeklySchedule | undefined;
  courtId?: string;
  modalSubCourts: string[];
}): CourtWeeklySchedule {
  const { formSchedule, existingSchedule, courtId, modalSubCourts } = params;
  if (modalSubCourts.length > 1) {
    const existingObj =
      existingSchedule && typeof existingSchedule === 'object'
        ? (existingSchedule as Record<string, any>)
        : {};
    const formObj =
      formSchedule && typeof formSchedule === 'object'
        ? (formSchedule as Record<string, any>)
        : {};

    const merged: Record<string, WeeklySchedule> = {};
    for (const sc of modalSubCourts) {
      const scSched =
        formObj[sc] || existingObj[sc] || getDefaultWeeklyScheduleForCourt(courtId, sc);
      merged[sc] = normalizeWeeklySchedule(scSched, courtId, sc);
    }
    return merged;
  }

  return normalizeWeeklySchedule(formSchedule, courtId);
}
