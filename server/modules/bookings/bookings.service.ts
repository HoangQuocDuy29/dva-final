import crypto from 'crypto';
import { env, readJsonFileSafe } from '../../config/env';
import {
  dbCircuitBreaker,
  prisma,
  toBookingDto,
  toClosedSlotDto,
  toCourseDto,
  toCourtDto,
  toGuestSessionDto,
  toRegistrationDto,
} from '../../config/prisma';
import { createHoldReleaseManager, extractConciseErrorMessage } from '../../utils/bookingHolds';
import { getOrSetCache, invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';
import {
  ADDON_PRICES,
  getDefaultWeeklyScheduleForCourt,
  getScheduleSlotsForCourtAndDate,
  normalizeCourtWeeklySchedule,
  parseSlotLabel,
  rangesOverlap,
  toMinutes,
} from '../../../src/shared/schedule';
import {
  generateGuestSessionTransferDescription,
  GuestSessionEmailPayload,
  sendAdminNotification,
  sendBookingConfirmationEmail,
  sendGuestSessionEmail,
  sendTrainingRegistrationEmail,
} from '../../utils/email.service';
import {
  buildShopOrderSheetPayload,
  dispatchGoogleSheetsWebhookAsync,
} from '../integrations/sheets.service';
import { toOrderDto } from '../../config/prisma';

const todayVN = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const nowMinutesVN = () => {
  const [h, m] = new Date()
    .toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23' })
    .split(':')
    .map(Number);
  return h * 60 + m;
};

const holdReleaseManager = createHoldReleaseManager({
  cooldownMs: 15_000,
  runCleanup: async (now) => {
    const result = await prisma.booking.updateMany({
      where: {
        paymentStatus: 'PENDING',
        holdExpiresAt: { lte: now },
      },
      data: {
        paymentStatus: 'CANCELLED',
        holdExpiresAt: null,
      },
    });
    dbCircuitBreaker.markSuccess();
    if (result.count > 0) {
      invalidateCache('bookings');
    }
    return result.count;
  },
  onError: (err, delayMs) => {
    dbCircuitBreaker.trip(err);
    const secs = Math.round(delayMs / 1000);
    console.warn(
      `[Bookings] Skipped expired-hold cleanup (backing off ${secs}s): ${extractConciseErrorMessage(err)}`
    );
  },
});

export async function releaseExpiredHolds(): Promise<void> {
  if (!dbCircuitBreaker.canAttempt().allowed) return;
  await holdReleaseManager.releaseExpiredHolds();
}

// ============================================================================
// Courts & Closed Slots
// ============================================================================
export async function listCourts(staff: boolean) {
  const loader = async () => {
    try {
      const dbCourts = await prisma.court.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      return dbCourts.map(toCourtDto);
    } catch (error) {
      console.error('[API ERROR] GET /api/courts:', error);
      const fileCourts = readJsonFileSafe<any[]>('courts.json', []);
      return fileCourts.filter((c: any) => c.isActive !== false).map(toCourtDto);
    }
  };
  if (!staff) {
    return getOrSetCache('courts:public', 120_000, loader);
  }
  return loader();
}

export async function createCourt(data: Record<string, any>) {
  const courtId = `court-${crypto.randomUUID().slice(0, 8)}`;
  const rawCode = (data.code || data.shortName || data.name)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  let uniqueCode = rawCode || `COURT_${Date.now().toString().slice(-4)}`;
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.court.findUnique({ where: { code: uniqueCode }, select: { id: true } });
    if (!exists) break;
    uniqueCode = `${rawCode || 'COURT'}_${crypto.randomInt(100, 999)}`;
  }

  const rawSubCourts = Array.isArray(data.subCourts) ? data.subCourts : undefined;
  const defaultSchedule = getDefaultWeeklyScheduleForCourt(courtId);
  const resolvedSchedule = data.weeklySchedule
    ? normalizeCourtWeeklySchedule(data.weeklySchedule, courtId, rawSubCourts)
    : rawSubCourts && rawSubCourts.length > 1
      ? normalizeCourtWeeklySchedule(defaultSchedule, courtId, rawSubCourts)
      : defaultSchedule;

  const isMaint = Boolean(data.status === 'MAINTENANCE' || data.isMaintenance === true || data.isAvailable === false);
  const created = await prisma.court.create({
    data: {
      id: courtId,
      code: uniqueCode,
      shortName: data.shortName || uniqueCode.replace(/_/g, ' ').slice(0, 16),
      name: data.name,
      address: data.address || 'DVA Sports Center, Hà Nội',
      description:
        data.description ||
        'Sân bóng chuyền tiêu chuẩn thi đấu FIVB trang bị thảm Taraflex Pro chống chấn thương và hệ thống chiếu sáng tiêu chuẩn.',
      floorType: data.floorType || 'Gerflor Taraflex Sport Pro',
      hourlyRate: data.hourlyRate !== undefined ? Math.round(Number(data.hourlyRate)) : 500000,
      minHours: data.minHours !== undefined ? Number(data.minHours) : 1.5,
      includes:
        Array.isArray(data.includes) && data.includes.length > 0
          ? data.includes
          : [
              '1 Free Official Mikasa V200W Match Ball',
              'Manual/Electronic scoreboard & referee whistle',
              'Airflow cooling & locker rooms',
            ],
      imageUrl: data.imageUrl || '/courts/btl.png',
      status: isMaint ? 'MAINTENANCE' : 'ACTIVE',
      isMaintenance: isMaint,
      isAvailable: !isMaint,
      isActive: true,
      subCourts: rawSubCourts || [],
      weeklySchedule: resolvedSchedule as any,
    },
  });
  invalidateCache(['courts', 'home']);
  return toCourtDto(created);
}

export async function updateCourt(id: string, data: Record<string, any>) {
  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Court not found');
  const { weeklySchedule, status, isMaintenance, isAvailable, ...rest } = data;

  let nextMaintenance: boolean | undefined;
  if (status !== undefined) nextMaintenance = status === 'MAINTENANCE';
  else if (isMaintenance !== undefined) nextMaintenance = Boolean(isMaintenance);
  else if (isAvailable !== undefined) nextMaintenance = !isAvailable;

  const updated = await prisma.court.update({
    where: { id },
    data: {
      ...rest,
      ...(rest.hourlyRate !== undefined ? { hourlyRate: Math.round(Number(rest.hourlyRate)) } : {}),
      ...(nextMaintenance !== undefined
        ? { status: nextMaintenance ? 'MAINTENANCE' : 'ACTIVE', isMaintenance: nextMaintenance, isAvailable: !nextMaintenance }
        : {}),
      ...(weeklySchedule !== undefined
        ? { weeklySchedule: normalizeCourtWeeklySchedule(weeklySchedule, id, rest.subCourts ?? existing.subCourts) as any }
        : {}),
    },
  });
  invalidateCache(['courts', 'home']);
  return toCourtDto(updated);
}

export async function toggleCourtMaintenance(
  id: string,
  input: { status?: 'ACTIVE' | 'MAINTENANCE'; isMaintenance?: boolean }
) {
  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Court not found');

  const currentlyMaintenance = Boolean(
    existing.isMaintenance === true || existing.status === 'MAINTENANCE' || existing.isAvailable === false
  );

  let nextMaintenance: boolean;
  if (input.status === 'MAINTENANCE' || input.status === 'ACTIVE') {
    nextMaintenance = input.status === 'MAINTENANCE';
  } else if (typeof input.isMaintenance === 'boolean') {
    nextMaintenance = input.isMaintenance;
  } else {
    nextMaintenance = !currentlyMaintenance;
  }

  const updated = await prisma.court.update({
    where: { id },
    data: {
      status: nextMaintenance ? 'MAINTENANCE' : 'ACTIVE',
      isMaintenance: nextMaintenance,
      isAvailable: !nextMaintenance,
    },
  });

  invalidateCache(['courts', 'home']);
  return {
    success: true,
    status: nextMaintenance ? 'MAINTENANCE' : 'ACTIVE',
    isMaintenance: nextMaintenance,
    court: toCourtDto(updated),
  };
}

export async function deleteCourt(id: string) {
  const existing = await prisma.court.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Court not found');

  const bookingCount = await prisma.booking.count({ where: { courtId: id } });
  if (bookingCount > 0) {
    const softDeleted = await prisma.court.update({
      where: { id },
      data: { isActive: false, isAvailable: false },
    });
    invalidateCache(['courts', 'home']);
    return {
      success: true,
      softDeleted: true,
      message: 'Court has linked bookings and has been archived (isActive = false).',
      court: toCourtDto(softDeleted),
    };
  }

  await prisma.court.delete({ where: { id } });
  invalidateCache(['courts', 'home']);
  return { success: true, softDeleted: false, message: 'Court permanently deleted.' };
}

export async function listClosedSlots(
  filters: { courtId?: string; date?: string; subCourt?: string },
  staff: boolean
) {
  const loader = async () => {
    const dbSlots = await prisma.closedSlot.findMany({
      where: {
        ...(filters.courtId ? { courtId: filters.courtId } : {}),
        ...(filters.date ? { date: filters.date } : {}),
        ...(filters.subCourt ? { subCourt: filters.subCourt } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return dbSlots.map(toClosedSlotDto);
  };
  if (!staff) {
    const key = `closed-slots:public:${filters.courtId || 'all'}:${filters.date || 'all'}:${filters.subCourt || 'all'}`;
    return getOrSetCache(key, 30_000, loader);
  }
  return loader();
}

export async function toggleClosedSlot(
  input: { courtId: string; date: string; slotLabel: string; reason?: string; subCourt?: string },
  closedBy: string
) {
  const targetCourt = await prisma.court.findUnique({ where: { id: input.courtId }, select: { id: true, name: true } });
  if (!targetCourt) throw new HttpError(400, 'Unknown court');
  if (!parseSlotLabel(input.slotLabel)) {
    throw new HttpError(400, 'slotLabel must contain a "HH:mm - HH:mm" range');
  }

  const resolvedSubCourt = input.subCourt || '';
  const existing = await prisma.closedSlot.findUnique({
    where: {
      courtId_date_slotLabel_subCourt: {
        courtId: input.courtId,
        date: input.date,
        slotLabel: input.slotLabel,
        subCourt: resolvedSubCourt,
      },
    },
  });

  if (existing) {
    await prisma.closedSlot.delete({ where: { id: existing.id } });
    invalidateCache('closed-slots');
    return { success: true, action: 'REOPENED' as const, slot: toClosedSlotDto(existing) };
  }

  const created = await prisma.closedSlot.create({
    data: {
      id: `cs-${crypto.randomUUID()}`,
      courtId: input.courtId,
      courtName: targetCourt.name,
      subCourt: resolvedSubCourt,
      date: input.date,
      slotLabel: input.slotLabel,
      reason:
        input.reason ||
        (resolvedSubCourt ? `Reserved / Maintenance (${resolvedSubCourt}) by Admin` : 'Reserved / Maintenance by Admin'),
      closedBy,
    },
  });
  invalidateCache('closed-slots');
  return { success: true, action: 'CLOSED' as const, slot: toClosedSlotDto(created) };
}

// ============================================================================
// Bookings
// ============================================================================
async function hasBookingConflict(
  courtId: string,
  date: string,
  start: string,
  end: string,
  subCourt?: string | null,
  ignoreId?: string,
  tx?: any
): Promise<boolean> {
  const now = new Date();
  const dbClient = tx?.booking ? tx : prisma;
  const activeBookings = await dbClient.booking.findMany({
    where: {
      courtId,
      bookingDate: date,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      OR: [
        { paymentStatus: 'PAID' },
        {
          paymentStatus: 'PENDING',
          OR: [{ holdExpiresAt: { gt: now } }, { holdExpiresAt: null }],
        },
      ],
    },
    select: { startTime: true, endTime: true, paymentStatus: true, holdExpiresAt: true, subCourt: true },
  });
  return activeBookings.some((b: any) => {
    if (subCourt && b.subCourt && b.subCourt !== subCourt) return false;
    const status = String(b.paymentStatus).toUpperCase();
    const isBookedOrHolding =
      status === 'PAID' ||
      status === 'CONFIRMED' ||
      ((status === 'HOLDING' || status === 'PENDING') && (!b.holdExpiresAt || b.holdExpiresAt > now));
    return isBookedOrHolding && rangesOverlap(start, end, b.startTime, b.endTime);
  });
}

async function hasClosedSlotConflict(
  courtId: string,
  date: string,
  start: string,
  end: string,
  subCourt?: string | null,
  tx?: any
): Promise<boolean> {
  const dbClient = tx?.closedSlot ? tx : prisma;
  const slots = await dbClient.closedSlot.findMany({
    where: { courtId, date },
    select: { slotLabel: true, subCourt: true },
  });
  return slots.some((cs: any) => {
    if (subCourt && cs.subCourt && cs.subCourt !== subCourt) return false;
    const range = parseSlotLabel(cs.slotLabel);
    return !!range && rangesOverlap(start, end, range.start, range.end);
  });
}

export async function listBookings(filters: { date?: string; courtId?: string }, isSuperAdminUser: boolean) {
  await releaseExpiredHolds();

  if (!isSuperAdminUser) {
    const cacheKey = `bookings:public-avail:${filters.date || 'all'}:${filters.courtId || 'all'}`;
    return getOrSetCache(cacheKey, 10_000, async () => {
      const dbBookings = await prisma.booking.findMany({
        where: {
          ...(filters.date ? { bookingDate: filters.date } : {}),
          ...(filters.courtId ? { courtId: filters.courtId } : {}),
          paymentStatus: { not: 'CANCELLED' },
        },
        select: {
          id: true,
          courtId: true,
          subCourt: true,
          bookingDate: true,
          startTime: true,
          endTime: true,
          paymentStatus: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return dbBookings;
    });
  }

  const dbBookings = await prisma.booking.findMany({
    where: {
      ...(filters.date ? { bookingDate: filters.date } : {}),
      ...(filters.courtId ? { courtId: filters.courtId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return dbBookings.map(toBookingDto);
}

export async function createBooking(
  data: Record<string, any>,
  rawAddons: unknown,
  staff: boolean
) {
  await releaseExpiredHolds();
  const { courtId, bookingDate, startTime, endTime } = data;

  const targetCourt = await prisma.court.findUnique({ where: { id: courtId } });
  if (!targetCourt) throw new HttpError(400, 'Unknown court.');
  if (targetCourt.status === 'MAINTENANCE' || targetCourt.isMaintenance === true || targetCourt.isAvailable === false) {
    throw new HttpError(400, 'Sân hiện đang trong thời gian bảo trì, vui lòng chọn sân khác hoặc quay lại sau.');
  }
  if (targetCourt.isActive === false && !staff) {
    throw new HttpError(409, 'This court is currently unavailable for booking.');
  }
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new HttpError(400, 'End time must be after start time.');
  }

  const courtHasSubCourts =
    (Array.isArray(targetCourt.subCourts) && targetCourt.subCourts.length > 0) ||
    courtId === 'court-btl' ||
    targetCourt.code === 'BTL_TT';
  const resolvedSubCourt = data.subCourt || (courtHasSubCourts ? 'Sân A' : undefined);

  if (!staff) {
    const today = todayVN();
    if (bookingDate < today || (bookingDate === today && toMinutes(endTime) <= nowMinutesVN())) {
      throw new HttpError(400, 'This time slot is in the past. Please choose a future slot.');
    }
  }

  const scheduleSlots = getScheduleSlotsForCourtAndDate(
    courtId,
    bookingDate,
    targetCourt.weeklySchedule as any,
    resolvedSubCourt
  );
  const scheduleSlot = scheduleSlots.find((s) => s.start === startTime && s.end === endTime);
  if (!scheduleSlot && !staff) {
    throw new HttpError(400, 'The selected time is not an available session for this court and date.');
  }

  const hourlyRate = Number(targetCourt.hourlyRate);
  const totalHours = scheduleSlot?.durationHours ?? (toMinutes(endTime) - toMinutes(startTime)) / 60;
  const addons = data.addons || { mineralWaterBottles: 0, mikasaBallCrate: false, certifiedReferee: false };
  const addonsPrice =
    Number(addons.mineralWaterBottles || 0) * ADDON_PRICES.mineralWaterBottle +
    (addons.mikasaBallCrate ? ADDON_PRICES.mikasaBallCrate : 0) +
    (addons.certifiedReferee ? ADDON_PRICES.certifiedReferee : 0);
  const courtPrice = Math.round(hourlyRate * totalHours);
  const totalPrice = courtPrice + addonsPrice;

  const slotLabel = `${startTime} - ${endTime}`;
  const courtShort =
    targetCourt.shortName ||
    (courtId === 'court-btl' ? 'BTL TT' : courtId === 'court-thecong' ? 'THE CONG' : 'MY DINH');
  const slotClean = `${startTime.replace(':', 'H')} ${endTime.replace(':', 'H')}`.toUpperCase();
  const dateNum = bookingDate.replace(/-/g, '');

  const subTag = resolvedSubCourt ? (resolvedSubCourt.toUpperCase().includes('B') ? 'B' : 'A') : '';
  const courtTag = courtId === 'court-btl' ? (subTag ? `BTL-${subTag}` : 'BTL') : courtId === 'court-thecong' ? 'TC' : 'MD';
  const subMemo = resolvedSubCourt ? ` ${resolvedSubCourt.replace(/\s+/g, ' ').toUpperCase()}` : '';

  const holdExpiresAt = new Date(Date.now() + env.bookingHoldMinutes * 60 * 1000);

  const createdBooking = await prisma.$transaction(async (tx) => {
    try {
      const lockKey = `booking:${courtId}:${bookingDate}:${resolvedSubCourt || ''}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    } catch (lockErr) {
      console.warn('[Booking Advisory Lock Notice]:', lockErr);
    }

    if (await hasBookingConflict(courtId, bookingDate, startTime, endTime, resolvedSubCourt, undefined, tx)) {
      throw new HttpError(409, 'Khung giờ này vừa có người đặt trước, vui lòng chọn khung giờ khác.');
    }
    if (await hasClosedSlotConflict(courtId, bookingDate, startTime, endTime, resolvedSubCourt, tx)) {
      throw new HttpError(
        409,
        `Ca sân ${resolvedSubCourt ? `(${resolvedSubCourt}) ` : ''}này hiện đang đóng hoặc bảo trì!`
      );
    }

    let bookingCode = '';
    for (let i = 0; i < 8; i++) {
      bookingCode = `DVA-${courtTag}-${dateNum}-${crypto.randomInt(1000, 10000)}`;
      const exists = await tx.booking.findUnique({ where: { bookingCode }, select: { id: true } });
      if (!exists) break;
    }

    const transferContent = `${bookingCode} ${courtShort}${subMemo} ${slotClean}`.toUpperCase();

    return tx.booking.create({
      data: {
        id: `b-${crypto.randomUUID()}`,
        bookingCode,
        courtId,
        courtName: targetCourt.name,
        subCourt: resolvedSubCourt ?? null,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        bookingDate,
        startTime,
        endTime,
        totalHours,
        courtPrice,
        addons: addons as any,
        addonsPrice,
        totalPrice,
        paymentStatus: 'PENDING',
        transferContent,
        notes: data.notes ?? null,
        holdExpiresAt,
      },
    });
  });

  invalidateCache('bookings');
  const dto = toBookingDto(createdBooking);

  const addonsList: string[] = Array.isArray(rawAddons)
    ? rawAddons.map(String).filter(Boolean)
    : [
        ...(addons.mineralWaterBottles > 0 ? [`Nước khoáng (${addons.mineralWaterBottles} chai)`] : []),
        ...(addons.mikasaBallCrate ? ['Thùng bóng Mikasa'] : []),
        ...(addons.certifiedReferee ? ['Trọng tài chuẩn FIVB'] : []),
      ];

  const courtDisplayName = resolvedSubCourt ? `${targetCourt.name} - ${resolvedSubCourt}` : targetCourt.name;
  dispatchGoogleSheetsWebhookAsync('Court_Bookings', 'DatSan', {
    'Mã đặt sân': dto.bookingCode || dto.id,
    'Tên sân': courtDisplayName,
    'Ngày đặt': bookingDate,
    'Khung giờ': slotLabel,
    'Tổng số giờ': totalHours || 1.5,
    'Họ tên khách': dto.customerName,
    'Số điện thoại': dto.customerPhone,
    Email: dto.customerEmail || '',
    'Tổng tiền (VNĐ)': dto.totalPrice,
    'Trạng thái': dto.paymentStatus || 'PENDING',
    'Ghi chú': dto.notes || (addonsList.length ? addonsList.join(', ') : 'Không có'),
  });

  sendAdminNotification({
    type: 'BOOK_COURT',
    title: `Đặt Sân: ${targetCourt.name} (${resolvedSubCourt || dto.subCourt || 'Sân A'})`,
    code: dto.bookingCode || dto.id,
    customerName: dto.customerName,
    phone: dto.customerPhone,
    email: dto.customerEmail || undefined,
    amount: dto.totalPrice,
    transferContent: dto.transferContent,
    details: `Ngày: ${bookingDate} | Khung giờ: ${slotLabel}`,
  }).catch((err) => console.error('[Admin Alert Error - Court Booking]:', err?.message || err));

  return dto;
}

export async function updateBookingStatus(id: string, paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED') {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new HttpError(404, 'Booking not found');

  if (
    booking.paymentStatus === 'CANCELLED' &&
    paymentStatus !== 'CANCELLED' &&
    (await hasBookingConflict(booking.courtId, booking.bookingDate, booking.startTime, booking.endTime, booking.subCourt, booking.id))
  ) {
    throw new HttpError(409, 'This slot has been booked by someone else in the meantime.');
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { paymentStatus, holdExpiresAt: null },
    include: { court: true },
  });
  invalidateCache('bookings');

  if (paymentStatus === 'PAID' && booking.paymentStatus !== 'PAID') {
    await sendBookingConfirmationEmail(
      { ...updated, timeSlot: `${updated.startTime} - ${updated.endTime}` },
      updated.court
    );

    sendAdminNotification({
      type: 'BOOK_COURT',
      title: `Đặt Sân (Đã duyệt PAID): ${updated.court?.name || 'Sân bóng chuyền DVA'} (${updated.subCourt || 'Sân A'})`,
      code: updated.bookingCode || updated.id,
      customerName: updated.customerName,
      phone: updated.customerPhone,
      email: updated.customerEmail || undefined,
      amount: updated.totalPrice,
      transferContent: updated.transferContent || undefined,
      details: `Ngày: ${updated.bookingDate} | Khung giờ: ${updated.startTime} - ${updated.endTime} (Nhân viên xác nhận PAID)`,
    }).catch((err) => console.error('[Admin Alert Error - Court Booking Status PAID]:', err?.message || err));
  }

  return toBookingDto(updated);
}

export async function confirmBookingPayment(id: string) {
  await releaseExpiredHolds();
  let booking = await prisma.booking.findUnique({ where: { id }, include: { court: true } });
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (booking.paymentStatus === 'CANCELLED') {
    throw new HttpError(409, 'This reservation hold has expired or was cancelled. Please create a new booking.');
  }

  const wasAlreadyConfirmed = Boolean(booking.customerConfirmedAt);
  if (booking.paymentStatus === 'PENDING' && !booking.customerConfirmedAt) {
    booking = await prisma.booking.update({
      where: { id },
      data: { customerConfirmedAt: new Date(), holdExpiresAt: null },
      include: { court: true },
    });
    invalidateCache('bookings');
  }

  if (!wasAlreadyConfirmed) {
    await sendBookingConfirmationEmail(
      { ...booking, timeSlot: `${booking.startTime} - ${booking.endTime}` },
      booking.court
    );

    sendAdminNotification({
      type: 'BOOK_COURT',
      title: `Đặt Sân: ${booking.court?.name || 'Sân bóng chuyền DVA'} (${booking.subCourt || 'Sân A'})`,
      code: booking.bookingCode || booking.id,
      customerName: booking.customerName,
      phone: booking.customerPhone,
      email: booking.customerEmail || undefined,
      amount: booking.totalPrice,
      transferContent: booking.transferContent,
      details: `Ngày: ${booking.bookingDate} | Khung giờ: ${booking.startTime} - ${booking.endTime} (Khách đã bấm xác nhận chuyển khoản)`,
    }).catch((err) => console.error('[Admin Alert Error - Court Booking Payment]:', err?.message || err));
  }

  return { success: true, booking: toBookingDto(booking) };
}

export async function updateBooking(id: string, data: Record<string, any>) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Booking not found');

  const nextCourtId = data.courtId ?? existing.courtId;
  const nextDate = data.bookingDate ?? existing.bookingDate;
  const nextStart = data.startTime ?? existing.startTime;
  const nextEnd = data.endTime ?? existing.endTime;
  const nextStatus = data.paymentStatus ?? existing.paymentStatus;
  const nextSubCourt = data.subCourt !== undefined ? data.subCourt : existing.subCourt;

  if (toMinutes(nextEnd) <= toMinutes(nextStart)) {
    throw new HttpError(400, 'End time must be after start time.');
  }
  if (
    nextStatus !== 'CANCELLED' &&
    (await hasBookingConflict(nextCourtId, nextDate, nextStart, nextEnd, nextSubCourt, existing.id))
  ) {
    throw new HttpError(409, 'This court session slot overlaps with another booking.');
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...data,
      ...(data.courtPrice !== undefined ? { courtPrice: Math.round(Number(data.courtPrice)) } : {}),
      ...(data.addonsPrice !== undefined ? { addonsPrice: Math.round(Number(data.addonsPrice)) } : {}),
      ...(data.totalPrice !== undefined ? { totalPrice: Math.round(Number(data.totalPrice)) } : {}),
      ...(data.paymentStatus && data.paymentStatus !== 'PENDING' ? { holdExpiresAt: null } : {}),
    },
  });
  invalidateCache('bookings');
  return toBookingDto(updated);
}

export async function deleteBooking(id: string) {
  const existing = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
  if (existing) {
    await prisma.booking.delete({ where: { id } });
    invalidateCache('bookings');
  }
  return { success: true, message: 'Booking deleted' };
}

// ============================================================================
// Training Courses & Registrations
// ============================================================================
export async function listTrainingCourses(opts: { staff: boolean; all?: string; isActive?: string }) {
  const { staff, all, isActive } = opts;
  const loader = async () => {
    const where: Record<string, any> = {};
    if (!staff || all === 'false') {
      where.isActive = true;
    } else if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    const dbCourses = await prisma.trainingCourse.findMany({ where, orderBy: { createdAt: 'asc' } });
    return dbCourses.map(toCourseDto);
  };
  if (!staff || all === 'false') {
    return getOrSetCache('courses:public', 90_000, loader);
  }
  return loader();
}

export async function createTrainingCourse(data: Record<string, any>) {
  const created = await prisma.trainingCourse.create({
    data: {
      id: `tc-${crypto.randomUUID()}`,
      title: data.title,
      level: data.level || 'JUNIOR',
      tag: data.tag ?? null,
      targetAudience: data.targetAudience || '',
      price: Math.round(Number(data.price) || 0),
      priceUnit: data.priceUnit ?? null,
      schedule: data.schedule || '',
      duration: data.duration || '',
      coachName: data.coachName || '',
      coachTitle: data.coachTitle || '',
      description: data.description || '',
      benefits: data.benefits || [],
      curriculum: data.curriculum || [],
      maxSlots: data.maxSlots || 20,
      enrolledSlots: data.enrolledSlots || 0,
      imageUrl: data.imageUrl ?? null,
    },
  });
  invalidateCache('courses');
  return toCourseDto(created);
}

export async function updateTrainingCourse(id: string, data: Record<string, any>) {
  const existing = await prisma.trainingCourse.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Course not found');
  const updated = await prisma.trainingCourse.update({
    where: { id },
    data: {
      ...data,
      ...(data.price !== undefined ? { price: Math.round(Number(data.price)) } : {}),
    },
  });
  invalidateCache('courses');
  return toCourseDto(updated);
}

export async function toggleTrainingCourseVisibility(id: string, isActive?: boolean) {
  const existing = await prisma.trainingCourse.findUnique({ where: { id }, select: { id: true, isActive: true } });
  if (!existing) throw new HttpError(404, 'Course not found');
  const targetIsActive = typeof isActive === 'boolean' ? isActive : !existing.isActive;
  const updated = await prisma.trainingCourse.update({ where: { id }, data: { isActive: targetIsActive } });
  invalidateCache('courses');
  return toCourseDto(updated);
}

export async function deleteTrainingCourse(id: string) {
  const existing = await prisma.trainingCourse.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Course not found');
  await prisma.trainingCourse.delete({ where: { id } });
  invalidateCache('courses');
  return { success: true, message: 'Course deleted' };
}

export async function listTrainingRegistrations() {
  const dbRegs = await prisma.trainingRegistration.findMany({ orderBy: { createdAt: 'desc' } });
  return dbRegs.map(toRegistrationDto);
}

export async function registerTraining(data: Record<string, any>) {
  const { courseId, fullName, phone, notes } = data;
  const email = (typeof data.email === 'string' ? data.email.trim() : '') || '';
  let course = await prisma.trainingCourse.findUnique({ where: { id: courseId } });
  if (!course) {
    course = await prisma.trainingCourse.findFirst({ orderBy: { createdAt: 'asc' } });
  }
  if (course && course.isActive === false) {
    throw new HttpError(400, 'This training course or scrimmage session is currently inactive and not accepting registrations.');
  }

  const packageName =
    (typeof data.packageName === 'string' && data.packageName.trim()) ||
    (typeof data.courseTitle === 'string' && data.courseTitle.trim()) ||
    course?.title ||
    '';

  const amount = Number(data.amount) || Number(data.price) || Number(course?.price) || 0;

  const rawLevel = (typeof data.level === 'string' && data.level.trim()) || data.experienceLevel || '';
  let level = 'Junior';
  const upperLevel = rawLevel.toUpperCase();
  if (upperLevel.includes('SENIOR')) level = 'Senior';
  else if (upperLevel.includes('YOUTH')) level = 'Youth';
  else if (upperLevel.includes('JUNIOR')) level = 'Junior';
  else if (rawLevel) level = rawLevel;

  const targetSkill = (typeof data.targetSkill === 'string' && data.targetSkill.trim()) || '';
  const position = (typeof data.position === 'string' && data.position.trim()) || '';
  const preferredTime =
    (typeof data.preferredTime === 'string' && data.preferredTime.trim()) ||
    (typeof data.preferredTimeSlot === 'string' && data.preferredTimeSlot.trim()) ||
    '';

  const created = course
    ? await prisma.trainingRegistration.create({
        data: {
          id: `tr-${crypto.randomUUID()}`,
          courseId: course.id,
          courseTitle: packageName || 'Khóa học bóng chuyền DVA',
          fullName: fullName || '',
          email,
          phone: phone || '',
          experienceLevel: level,
          preferredTimeSlot: preferredTime || 'Tối Thứ 2 (19:00 - 21:30)',
          notes: notes ?? null,
          status: 'PENDING',
        },
      })
    : {
        id: `tr-${crypto.randomUUID()}`,
        courseId,
        courseTitle: packageName || 'Khóa học bóng chuyền DVA',
        fullName: fullName || '',
        email,
        phone: phone || '',
        experienceLevel: level,
        preferredTimeSlot: preferredTime || 'Tối Thứ 2 (19:00 - 21:30)',
        notes: notes ?? null,
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

  const cleanPhone = (phone || '').replace(/\D/g, '');
  const code =
    (typeof data.code === 'string' && data.code.trim()) ||
    (typeof data.registrationCode === 'string' && data.registrationCode.trim()) ||
    `TR-${Date.now().toString().slice(-6)}`;

  let packageCode = 'SCRIM';
  const checkLevel = level.toUpperCase();
  const checkTitle = packageName.toUpperCase();
  const checkId = (courseId || '').toLowerCase();
  if (checkLevel.includes('YOUTH') || checkTitle.includes('YOUTH') || checkId.includes('youth')) packageCode = 'YOUTH';
  else if (checkLevel.includes('JUNIOR') || checkTitle.includes('JUNIOR') || checkId.includes('junior')) packageCode = 'JUNIOR';
  else if (checkLevel.includes('SENIOR') || checkTitle.includes('SENIOR') || checkId.includes('senior')) packageCode = 'SENIOR';
  else if (
    checkId.includes('1on1') ||
    checkId.includes('custom') ||
    checkTitle.includes('1-1') ||
    checkTitle.includes('KÈM') ||
    checkTitle.includes('MASTERCLASS') ||
    targetSkill
  ) {
    packageCode = 'SKILL';
  }

  const transferContent =
    (typeof data.transferContent === 'string' && data.transferContent.trim()) ||
    `DVA ${packageCode} ${cleanPhone}`.trim().toUpperCase();

  dispatchGoogleSheetsWebhookAsync('Training_Registrations', 'DangKyKhoaHoc', {
    sheetName: 'DangKyKhoaHoc',
    data: {
      'Mã đăng ký': code,
      'Gói tập / Khóa học': packageName,
      'Cấp độ / Đội': level,
      'Họ và tên học viên': fullName || '',
      'Số điện thoại': phone || '',
      Email: email || '',
      'Vị trí thi đấu / Mục tiêu tập': targetSkill || position || '',
      'Khung giờ mong muốn': preferredTime || '',
      'Mức học phí (VNĐ)': Number(amount) || 0,
      'Nội dung chuyển khoản': transferContent,
      'Trạng thái': 'Pending',
      'Ghi chú': notes || '',
      'Thời gian đăng ký': new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    },
  });

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendTrainingRegistrationEmail({
      orderCode: code,
      code,
      packageName,
      fullName,
      email,
      phone,
      level,
      preferredTime,
      targetSkill,
      position,
      notes,
      amount,
      transferContent,
    }).catch((mailError: any) => {
      console.warn('[Training Mailer Warning]:', mailError?.message || mailError);
    });
  }

  sendAdminNotification({
    type: 'TRAINING',
    title: `Gói Tập: ${packageName}`,
    code,
    customerName: fullName || '',
    phone: phone || '',
    email: email || undefined,
    amount: Number(amount) || 0,
    transferContent,
    details: `Cấp độ: ${level} | Ca: ${preferredTime || 'Linh hoạt'} | Vị trí: ${targetSkill || position || 'N/A'}${notes ? ' | Ghi chú: ' + notes : ''}`,
  }).catch((err) => console.error('[Admin Alert Error - Training]:', err?.message || err));

  return {
    ...toRegistrationDto(created),
    code,
    registrationCode: code,
    transferContent,
  };
}

export async function updateTrainingRegistrationStatus(
  id: string,
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
) {
  const existing = await prisma.trainingRegistration.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Registration not found');
  const updated = await prisma.trainingRegistration.update({ where: { id }, data: { status } });
  return toRegistrationDto(updated);
}

export async function deleteTrainingRegistration(id: string) {
  const existing = await prisma.trainingRegistration.findUnique({ where: { id }, select: { id: true } });
  if (existing) await prisma.trainingRegistration.delete({ where: { id } });
  return { success: true, message: 'Registration deleted' };
}

// ============================================================================
// Guest Sessions (Drop-in Pass)
// ============================================================================
async function generateUniqueGuestSessionTransferContent(
  fullName: string,
  sessionDate: string,
  sessionTime: string,
  position: string
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateGuestSessionTransferDescription(fullName, sessionDate, sessionTime, position);
    const exists = await prisma.guestSession.findUnique({
      where: { transferContent: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${generateGuestSessionTransferDescription(fullName, sessionDate, sessionTime, position)} ${crypto.randomInt(100, 999)}`;
}

export async function listGuestSessions(statusFilter?: string) {
  const where =
    statusFilter && ['PENDING', 'PAID', 'CANCELLED'].includes(statusFilter)
      ? { paymentStatus: statusFilter as 'PENDING' | 'PAID' | 'CANCELLED' }
      : undefined;
  const rows = await prisma.guestSession.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return rows.map(toGuestSessionDto);
}

export async function updateGuestSessionStatus(id: string, paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED') {
  const existing = await prisma.guestSession.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Guest session not found');
  const updated = await prisma.guestSession.update({
    where: { id },
    data: {
      paymentStatus,
      paidAt: paymentStatus === 'PAID' ? (existing.paidAt ?? new Date()) : null,
    },
  });
  return toGuestSessionDto(updated);
}

export async function deleteGuestSession(id: string) {
  const existing = await prisma.guestSession.findUnique({ where: { id }, select: { id: true } });
  if (existing) await prisma.guestSession.delete({ where: { id } });
  return { success: true, message: 'Guest session deleted' };
}

export async function createAndSendGuestSessionEmail(data: Record<string, any>) {
  const guestEmail = data.guestEmail;
  const fullName = data.fullName;
  const phone = data.phone;
  const position = (data.position || 'OH').toUpperCase();
  const positionPrivilege = data.positionPrivilege || 'FIXED';
  const level = data.level || 'All Levels';
  const sessionDate = data.sessionDate;
  const sessionTime = data.sessionTime || '19:30 - 21:30';
  const amount = Math.round(Number(data.amount));
  const alreadyPaid = Boolean(data.alreadyPaid);
  const forceDuplicate = Boolean(data.forceDuplicate);

  if (!forceDuplicate) {
    const existingDuplicate = await prisma.guestSession.findFirst({
      where: { guestEmail, sessionDate, sessionTime, paymentStatus: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
    });
    if (existingDuplicate) {
      return {
        duplicateDetected: true as const,
        existingSession: toGuestSessionDto(existingDuplicate),
        error: `Khách ${guestEmail} đã được gửi email cho ca ${sessionDate} (${sessionTime}). Xác nhận gửi lại nếu bạn muốn tạo thêm lượt mới.`,
      };
    }
  }

  const courtAddress = data.courtAddress || '155 Trường Chinh, Thanh Xuân, Hà Nội';
  const notes = data.notes || undefined;
  const transferContent = await generateUniqueGuestSessionTransferContent(
    fullName,
    sessionDate,
    sessionTime,
    position
  );

  const now = new Date();
  const createdSession = await prisma.guestSession.create({
    data: {
      id: `gs-${crypto.randomUUID()}`,
      guestName: fullName,
      guestEmail,
      phone,
      position,
      positionPrivilege,
      level,
      sessionDate,
      sessionTime,
      courtAddress,
      amount,
      transferContent,
      paymentStatus: alreadyPaid ? 'PAID' : 'PENDING',
      notes: notes || null,
      paidAt: alreadyPaid ? now : null,
      emailSentAt: now,
    },
  });

  const payload: GuestSessionEmailPayload = {
    guestEmail,
    fullName,
    phone,
    height: data.height,
    weight: data.weight,
    position,
    positionPrivilege,
    level,
    sessionDate,
    sessionTime,
    courtAddress,
    amount,
    transferContent,
    notes,
  };

  sendGuestSessionEmail(payload).catch((err: any) => {
    console.warn('[Admin Guest Session Email Fire-and-Forget Error]:', err?.message || err);
  });

  return {
    duplicateDetected: false as const,
    success: true,
    message: alreadyPaid
      ? 'Đã ghi nhận thanh toán PAID và phát hành email session cho khách!'
      : 'Đã lưu Guest Session (PENDING) và gửi email thông tin cho khách thành công!',
    guestSession: toGuestSessionDto(createdSession),
  };
}

// ============================================================================
// VietQR & Bank Payment Webhook Reconciliation
// ============================================================================
export function generateVietQrPayload(amount: number, bookingCode?: string, description?: string) {
  const code = bookingCode || `DVA-TT-${Date.now().toString().slice(-4)}`;
  const qrUrl = `https://img.vietqr.io/image/${env.bank.id}-${env.bank.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(env.bank.accountName)}`;
  return {
    bankId: env.bank.id,
    bankName: 'Ngân hàng Quân Đội (MB Bank)',
    accountNo: env.bank.accountNo,
    accountName: env.bank.accountName,
    amount,
    bookingCode: code,
    description: description || `Thanh toán đặt sân ${code}`,
    qrUrl,
  };
}

export async function processPaymentWebhook(rawBody: any) {
  const rawPayload =
    Array.isArray(rawBody?.data) && rawBody.data.length > 0 ? rawBody.data[0] : (rawBody ?? {});
  const content = String(rawPayload.content ?? rawPayload.description ?? rawPayload.addInfo ?? '').trim();
  const amount = Number(rawPayload.amount ?? rawPayload.transferAmount ?? 0);
  const transactionDate = rawPayload.transactionDate ?? rawPayload.when ?? new Date().toISOString();

  const hyphenMatch = content.match(/DVA-[A-Z0-9]+(?:-[A-Z0-9]+)*/i);
  const spacedCodeMatch = content.match(/DVA[\s-]*([A-Z]{2,3})[\s-]*(\d{8})[\s-]*(\d{4})/i);
  const extractedBookingCode = spacedCodeMatch
    ? `DVA-${spacedCodeMatch[1].toUpperCase()}-${spacedCodeMatch[2]}-${spacedCodeMatch[3]}`
    : hyphenMatch
      ? hyphenMatch[0].toUpperCase()
      : null;

  const hasDvaKeyword = /\b(DVA|SCRIM)\b/i.test(content) || Boolean(extractedBookingCode);
  if (!hasDvaKeyword) {
    return { statusCode: 200, body: { success: true, message: 'Transaction ignored' } };
  }

  await releaseExpiredHolds();
  let booking = extractedBookingCode
    ? await prisma.booking.findFirst({
        where: { bookingCode: { equals: extractedBookingCode, mode: 'insensitive' } },
        include: { court: true },
      })
    : null;

  const normalizedContent = content.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (!booking) {
    const pendingBookings = await prisma.booking.findMany({
      where: { paymentStatus: 'PENDING' },
      select: { id: true, bookingCode: true, transferContent: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const matchedBookingId = pendingBookings.find((b) => {
      const cleanCode = b.bookingCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const cleanTransfer = (b.transferContent || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return (cleanCode && normalizedContent.includes(cleanCode)) || (cleanTransfer && normalizedContent.includes(cleanTransfer));
    })?.id;

    if (matchedBookingId) {
      booking = await prisma.booking.findUnique({ where: { id: matchedBookingId }, include: { court: true } });
    }
  }

  if (!booking) {
    // Fallback 1: DVA Shop Order
    const pendingOrders = await prisma.order.findMany({
      where: { status: 'PENDING' },
      select: { id: true, orderCode: true, transferContent: true, totalAmount: true, customerConfirmedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const matchedOrder = pendingOrders.find((o) => {
      const cleanCode = o.orderCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const cleanTransfer = (o.transferContent || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return (cleanCode && normalizedContent.includes(cleanCode)) || (cleanTransfer && normalizedContent.includes(cleanTransfer));
    });

    if (matchedOrder) {
      if (!Number.isFinite(amount) || amount < matchedOrder.totalAmount) {
        return { statusCode: 200, body: { success: false, message: 'Insufficient payment amount for Shop order' } };
      }
      const parsedTxDate = transactionDate ? new Date(transactionDate) : new Date();
      const confirmedAt = Number.isNaN(parsedTxDate.getTime()) ? new Date() : parsedTxDate;

      const updatedOrderRaw = await prisma.order.update({
        where: { id: matchedOrder.id },
        data: { status: 'PAID', customerConfirmedAt: matchedOrder.customerConfirmedAt ?? confirmedAt },
        include: { items: true },
      });
      dispatchGoogleSheetsWebhookAsync(
        'Store_Orders',
        'DonHang_Shop',
        buildShopOrderSheetPayload(toOrderDto(updatedOrderRaw), 'PAID (Đã thanh toán tự động qua Webhook)')
      );
      return { statusCode: 200, body: { success: true, message: 'Shop order payment processed automatically via webhook' } };
    }

    // Fallback 2: Guest Session Drop-in Pass
    const pendingGuestSessions = await prisma.guestSession.findMany({
      where: { paymentStatus: 'PENDING' },
      select: { id: true, transferContent: true, amount: true, paidAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const matchedGuest = pendingGuestSessions.find((g) => {
      const cleanTransfer = (g.transferContent || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return Boolean(cleanTransfer && normalizedContent.includes(cleanTransfer));
    });

    if (matchedGuest) {
      if (!Number.isFinite(amount) || amount < matchedGuest.amount) {
        return { statusCode: 200, body: { success: false, message: 'Insufficient payment amount for Guest Session' } };
      }
      const parsedTxDate = transactionDate ? new Date(transactionDate) : new Date();
      const confirmedAt = Number.isNaN(parsedTxDate.getTime()) ? new Date() : parsedTxDate;
      await prisma.guestSession.update({
        where: { id: matchedGuest.id },
        data: { paymentStatus: 'PAID', paidAt: matchedGuest.paidAt ?? confirmedAt },
      });
      return { statusCode: 200, body: { success: true, message: 'Guest session payment processed automatically via webhook' } };
    }

    // Fallback 3: Tournament Team Entry Fee (HOSTED)
    const pendingTourneyTeams = await prisma.tournamentTeam.findMany({
      where: { paymentStatus: 'PENDING', transferContent: { not: null } },
      select: {
        id: true,
        transferContent: true,
        entryFeeAmount: true,
        paidAt: true,
        customerConfirmedAt: true,
        tournament: { select: { mode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const matchedTeam = pendingTourneyTeams.find((tm) => {
      const cleanTransfer = (tm.transferContent || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return Boolean(cleanTransfer && normalizedContent.includes(cleanTransfer));
    });

    if (matchedTeam && matchedTeam.tournament?.mode === 'HOSTED') {
      const dueAmount = Number(matchedTeam.entryFeeAmount) || 0;
      if (!Number.isFinite(amount) || amount < dueAmount) {
        return {
          statusCode: 200,
          body: { success: false, message: 'Insufficient payment amount for Tournament team registration' },
        };
      }
      const parsedTxDate = transactionDate ? new Date(transactionDate) : new Date();
      const confirmedAt = Number.isNaN(parsedTxDate.getTime()) ? new Date() : parsedTxDate;
      await prisma.tournamentTeam.update({
        where: { id: matchedTeam.id },
        data: {
          paymentStatus: 'PAID',
          paidAt: matchedTeam.paidAt ?? confirmedAt,
          customerConfirmedAt: matchedTeam.customerConfirmedAt ?? confirmedAt,
        },
      });
      invalidateCache('tournaments');
      return {
        statusCode: 200,
        body: { success: true, message: 'Tournament team entry fee processed automatically via webhook' },
      };
    }

    return { statusCode: 200, body: { success: true, message: 'Transaction ignored' } };
  }

  if (booking.paymentStatus === 'PAID') {
    return { statusCode: 200, body: { success: true, message: 'Booking already paid, transaction ignored' } };
  }

  if (!Number.isFinite(amount) || amount < booking.totalPrice) {
    return { statusCode: 200, body: { success: false, message: 'Insufficient payment amount' } };
  }

  const parsedTxDate = transactionDate ? new Date(transactionDate) : new Date();
  const confirmedAt = Number.isNaN(parsedTxDate.getTime()) ? new Date() : parsedTxDate;

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: 'PAID',
      holdExpiresAt: null,
      customerConfirmedAt: booking.customerConfirmedAt ?? confirmedAt,
    },
  });
  invalidateCache('bookings');

  sendBookingConfirmationEmail(
    { ...updatedBooking, timeSlot: `${updatedBooking.startTime} - ${updatedBooking.endTime}` },
    booking.court
  ).catch((mailErr: any) => {
    console.error('[Webhook Mailer Fire-and-Forget Error]:', mailErr?.message || mailErr);
  });

  return { statusCode: 200, body: { success: true, message: 'Payment processed and email queued' } };
}
