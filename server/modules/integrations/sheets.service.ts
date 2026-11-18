import { env } from '../../config/env';
import {
  BANK_BENEFICIARY_LABEL,
} from '../../config/env';
import {
  dbCircuitBreaker,
  fromRotationEnum,
  normalizeSquad,
  prisma,
  toBookingDto,
  toGuestSessionDto,
  toOrderDto,
  toRegistrationDto,
} from '../../config/prisma';
import { isDatabaseUnavailableError } from '../../utils/bookingHolds';
import { getShopCategoryLabel, StoreOrder } from '../../../src/types';

export const isAllowedScriptUrl = (url: string) =>
  /^https:\/\/script\.google(usercontent)?\.com\//i.test(url);

export async function getGoogleScriptUrl(): Promise<string> {
  const envUrl = env.googleSheetsWebhookUrl;
  if (!dbCircuitBreaker.canAttempt().allowed) return envUrl;
  try {
    const cfg = await prisma.appConfig.findUnique({ where: { id: 'default' } });
    return cfg?.googleScriptUrl || envUrl;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      dbCircuitBreaker.trip(error);
    } else {
      console.error('[Sheets] getGoogleScriptUrl error:', error);
    }
    return envUrl;
  }
}

export async function saveGoogleScriptUrl(scriptUrl: string, actorEmail?: string): Promise<string> {
  try {
    const saved = await prisma.appConfig.upsert({
      where: { id: 'default' },
      update: { googleScriptUrl: scriptUrl },
      create: { id: 'default', googleScriptUrl: scriptUrl },
    });
    console.log(`[Google Sheets] Webhook URL updated in PostgreSQL by ${actorEmail || 'admin'}`);
    return saved.googleScriptUrl;
  } catch (error) {
    console.error('[Sheets] saveGoogleScriptUrl error:', error);
    return scriptUrl;
  }
}

export async function forwardToGoogleSheetsWebhook(
  sheetName: string,
  payloadOrData: Record<string, any>
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const url = await getGoogleScriptUrl();
    if (!url) {
      return { success: false, error: 'Google Script URL is not configured' };
    }
    if (!isAllowedScriptUrl(url)) {
      console.warn('[Google Sheets Remote Webhook] Blocked non-Google Apps Script URL');
      return { success: false, error: 'Blocked non-Google Apps Script URL (SSRF protection)' };
    }
    const resolvedSheetName =
      typeof payloadOrData?.sheetName === 'string' && payloadOrData.sheetName.trim()
        ? payloadOrData.sheetName.trim()
        : sheetName;
    const resolvedData =
      payloadOrData &&
      typeof payloadOrData.data === 'object' &&
      payloadOrData.data !== null &&
      !Array.isArray(payloadOrData.data)
        ? payloadOrData.data
        : payloadOrData;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          sheetName: resolvedSheetName,
          data: resolvedData,
          timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorText = `Google Apps Script returned HTTP ${response.status} ${response.statusText}`;
        console.warn(`[Google Sheets Remote Webhook] Failed: ${errorText}`);
        return { success: false, status: response.status, error: errorText };
      }
      return { success: true, status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    const errMsg = err?.name === 'AbortError' ? 'Request timed out after 10 seconds' : err?.message || String(err);
    console.warn(`[Google Sheets Remote Webhook Notice] ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

export async function logGoogleSheetsSync(
  tabName: 'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations' | 'Store_Orders' | 'DonHang_Shop',
  rowData: Record<string, any>,
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
  errorMessage?: string
): Promise<void> {
  try {
    const rowPayload = errorMessage ? { ...rowData, _errorMessage: errorMessage } : rowData;
    await prisma.googleSheetsSyncLog.create({
      data: {
        tabName,
        action: 'APPEND_ROW',
        rowData: rowPayload as any,
        status,
      },
    });
  } catch (err) {
    console.warn('[Google Sheets Sync Log] Could not write sync log:', err);
  }
}

export function dispatchGoogleSheetsWebhookAsync(
  tabName: 'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations' | 'Store_Orders',
  sheetName: 'DatSan' | 'TuyenThanhVien' | 'DangKyKhoaHoc' | 'DonHang_Shop',
  rowData: Record<string, any>
): void {
  void (async () => {
    try {
      const result = await forwardToGoogleSheetsWebhook(sheetName, rowData);
      await logGoogleSheetsSync(
        tabName,
        rowData,
        result.success ? 'SUCCESS' : 'FAILED',
        result.success ? undefined : result.error
      );
    } catch (err: any) {
      console.warn(`[Google Sheets Webhook Fire-and-Forget] Error syncing to ${sheetName}:`, err?.message || err);
      await logGoogleSheetsSync(tabName, rowData, 'FAILED', err?.message || String(err));
    }
  })();
}

export function buildShopOrderSheetPayload(
  order: StoreOrder,
  statusOverride?: string,
  shippingExtra?: { trackingCode?: string | null; carrier?: string | null; shippingNotes?: string | null }
): Record<string, any> {
  const firstItem = order.items[0];
  const categoryLabel = firstItem ? getShopCategoryLabel(firstItem.category) : 'DVA Shop';
  const productNames =
    order.items.map((it) => `${it.productName}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(' + ') ||
    order.productName ||
    'DVA Merchandise';
  const sizes = order.items.map((it) => it.size || 'M').join(', ') || 'M';
  const totalQuantity = order.items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0) || 1;
  const heightWeightList = order.items
    .map((it) => (it.height || it.weight ? `${it.height || '?'}cm / ${it.weight || '?'}kg` : ''))
    .filter(Boolean)
    .join('; ');
  const customNames = order.items.map((it) => it.customName).filter(Boolean).join(', ');
  const customNumbers = order.items.map((it) => it.customNumber).filter(Boolean).join(', ');

  const statusMap: Record<string, string> = {
    PENDING: 'PENDING (Chờ thanh toán)',
    PAID: 'PAID (Đã xác nhận TT)',
    SHIPPED: 'SHIPPED (Đang giao / Sẵn sàng nhận tại sân)',
    COMPLETED: 'COMPLETED (Hoàn tất)',
    CANCELLED: 'CANCELLED (Đã hủy)',
  };

  const resolvedStatus =
    statusOverride ||
    (order.status === 'PENDING' && order.customerConfirmedAt
      ? 'PENDING (Khách báo đã CK - Chờ đối soát)'
      : statusMap[order.status] || order.status);

  const notesParts = [
    order.notes,
    shippingExtra?.trackingCode
      ? `[Mã vận đơn: ${shippingExtra.carrier ? shippingExtra.carrier + ' - ' : ''}${shippingExtra.trackingCode}]`
      : '',
    shippingExtra?.shippingNotes ? `[Ghi chú ship: ${shippingExtra.shippingNotes}]` : '',
  ].filter(Boolean);

  return {
    'Mã đơn hàng': order.orderCode,
    'Phân loại danh mục': categoryLabel,
    'Tên sản phẩm': productNames,
    Size: sizes,
    'Số lượng': totalQuantity,
    'Họ tên khách': order.customerName,
    SĐT: order.customerPhone || order.phone || '',
    Email: order.customerEmail || order.email || '',
    'Instagram/Facebook': order.socialLink || 'Không có',
    'Hình thức nhận':
      order.deliveryMethod === 'HOME_DELIVERY'
        ? 'Ship tận nơi (Người nhận trả phí COD)'
        : 'Nhận tại Sân BTL Thông Tin (Miễn phí)',
    'Địa chỉ nhận':
      order.deliveryMethod === 'HOME_DELIVERY'
        ? order.shippingAddress || 'Chưa cung cấp'
        : '155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)',
    'Chiều cao/Cân nặng': heightWeightList || 'Không áp dụng',
    'Tên in áo': customNames || 'Không in',
    'Số áo in': customNumbers || 'Không in',
    'Tổng tiền (VNĐ)': order.totalAmount,
    'Nội dung CK': order.transferContent,
    'Trạng thái đơn': resolvedStatus,
    'Ghi chú': notesParts.join(' | ') || '',
  };
}

export async function getSheetsInspectorData() {
  const [apps, bookingsList, regs, ordersList] = await Promise.all([
    prisma.memberApplication.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.trainingRegistration.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);

  const formatTimestamp = (d: any) => {
    if (!d) return new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (d instanceof Date) return d.toISOString().replace('T', ' ').substring(0, 19);
    return String(d).replace('T', ' ').substring(0, 19);
  };

  return {
    spreadsheetId: env.spreadsheetId,
    spreadsheetTitle: 'DVA Volleyball Club - Master Data Sheet (Live Sync)',
    tabs: {
      Member_Registrations: apps.map((a) => ({
        Timestamp: formatTimestamp(a.createdAt),
        Application_ID: a.id,
        Full_Name: a.fullName,
        DOB: a.dob,
        Position: a.position,
        Level: normalizeSquad(a.level).toUpperCase(),
        Height_cm: a.height,
        Weight_kg: a.weight,
        Spike_Reach_cm: a.spikeReach,
        Block_Reach_cm: a.blockReach,
        Gmail: a.gmail,
        Zalo: a.zalo,
        Instagram: a.instagram,
        Rotation_Knowledge: fromRotationEnum(a.rotationKnowledge),
        Status: a.status,
        Payment_Status: (a as any).paymentStatus || 'PENDING',
        Scheduled_Tryout: (a as any).scheduledDate
          ? `${(a as any).scheduledDate} ${(a as any).scheduledTime || ''}`.trim()
          : '',
      })),
      Court_Bookings: bookingsList.map((b) => ({
        Timestamp: formatTimestamp(b.createdAt),
        Booking_Code: b.bookingCode,
        Court_Name: b.courtName,
        Customer_Name: b.customerName,
        Phone: b.customerPhone,
        Email: b.customerEmail,
        Date: b.bookingDate,
        Time_Slot: `${b.startTime} - ${b.endTime}`,
        Total_Hours: b.totalHours,
        Total_VND: b.totalPrice,
        Payment_Status:
          b.paymentStatus === 'PENDING' && b.customerConfirmedAt
            ? 'PENDING (Customer reported transfer)'
            : b.paymentStatus,
        Bank_Beneficiary: BANK_BENEFICIARY_LABEL,
      })),
      Training_Registrations: regs.map((r) => ({
        Timestamp: formatTimestamp(r.createdAt),
        Course: r.courseTitle,
        Full_Name: r.fullName,
        Email: r.email,
        Phone: r.phone,
        Experience: r.experienceLevel,
        Status: r.status,
      })),
      Store_Orders: ordersList.map((raw) => {
        const o = toOrderDto(raw);
        return {
          Timestamp: formatTimestamp(raw.createdAt),
          Order_Code: o.orderCode,
          Category: o.items[0] ? getShopCategoryLabel(o.items[0].category) : 'DVA Shop',
          Products: o.productName || 'DVA Merchandise',
          Size: o.size || 'M',
          Quantity: o.items.reduce((sum, it) => sum + it.quantity, 0) || 1,
          Customer_Name: o.customerName,
          Phone: o.phone,
          Email: o.email,
          Delivery_Method: o.deliveryMethod,
          Shipping_Address: o.shippingAddress || 'Pick up at BTL Thông Tin',
          Jersey_Print: o.customName || o.customNumber ? `${o.customName || ''} #${o.customNumber || ''}`.trim() : 'None',
          Total_VND: o.totalAmount,
          Transfer_Content: o.transferContent,
          Status: o.status,
        };
      }),
    },
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_MONTHS = 6;

function toMonthKey(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  const str = String(value);
  const plain = /^(\d{4})-(\d{2})-\d{2}$/.exec(str);
  if (plain) return `${plain[1]}-${plain[2]}`;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Lightweight Overview Summary:
 * - For ADMIN: strictly fast `prisma.*.count()` queries with ZERO financial/revenue/PII data exposed.
 * - For SUPERADMIN: uses `count()` + targeted revenue queries + top 5 recent activity + guest sessions
 *   so OverviewTab renders completely in 1 single API call.
 */
export async function getAdminOverviewSummary(isSuperAdminUser: boolean) {
  if (!isSuperAdminUser) {
    const [
      playersCount,
      activePlayersCount,
      newsCount,
      tournamentsCount,
    ] = await Promise.all([
      prisma.player.count(),
      prisma.player.count({ where: { isActive: true } }),
      prisma.newsPost.count(),
      prisma.tournament.count(),
    ]);

    const [
      hostedTournamentsCount,
      applicationsCount,
      pendingApplicationsCount,
      scheduledApplicationsCount,
    ] = await Promise.all([
      prisma.tournament.count({ where: { mode: 'HOSTED' } }),
      prisma.memberApplication.count(),
      prisma.memberApplication.count({ where: { status: 'PENDING' } }),
      prisma.memberApplication.count({ where: { status: 'SCHEDULED' } }),
    ]);

    const [approvedTryoutsCount, coachesCount, coursesCount] = await Promise.all([
      prisma.memberApplication.count({ where: { status: 'APPROVED' } }),
      prisma.coachProfile.count(),
      prisma.trainingCourse.count(),
    ]);

    // Strictly PII-free & finance-free payload for ADMIN
    return {
      restrictedFinance: true,
      playersCount,
      activePlayersCount,
      newsCount,
      tournamentsCount,
      hostedTournamentsCount,
      applicationsCount,
      pendingApplicationsCount,
      scheduledApplicationsCount,
      approvedTryoutsCount,
      coachesCount,
      coursesCount,
    };
  }

  // SUPERADMIN: fast bounded batches respecting Supabase pg.Pool max=5
  const now = new Date();
  const monthlyRevenue = Array.from({ length: CHART_MONTHS }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (CHART_MONTHS - 1 - idx), 1);
    return {
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTH_LABELS[d.getMonth()],
      court: 0,
      training: 0,
      store: 0,
      guest: 0,
      tryout: 0,
      tournament: 0,
    };
  });
  const bucketByKey = new Map(monthlyRevenue.map((b) => [b.monthKey, b]));

  const [
    totalBookingsCount,
    pendingBookingsCount,
    paidBookingsRows,
    totalStoreOrdersCount,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { paymentStatus: 'PENDING' } }),
    prisma.booking.findMany({
      where: { paymentStatus: 'PAID' },
      select: { totalPrice: true, bookingDate: true },
    }),
    prisma.order.count(),
  ]);

  const [
    pendingStoreOrdersCount,
    paidOrderRows,
    totalGuestSessionsCount,
    pendingGuestSessionsCount,
  ] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({
      where: { status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      select: { totalAmount: true, createdAt: true },
    }),
    prisma.guestSession.count(),
    prisma.guestSession.count({ where: { paymentStatus: 'PENDING' } }),
  ]);

  const [
    totalTrainingRegsCount,
    pendingTrainingCount,
    confirmedRegRows,
    coursesRows,
  ] = await Promise.all([
    prisma.trainingRegistration.count(),
    prisma.trainingRegistration.count({ where: { status: 'PENDING' } }),
    prisma.trainingRegistration.findMany({
      where: { status: 'CONFIRMED' },
      select: { courseId: true, createdAt: true },
    }),
    prisma.trainingCourse.findMany({ select: { id: true, price: true } }),
  ]);

  const [
    playersCount,
    activePlayersCount,
    coachesCount,
    newsCount,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { isActive: true } }),
    prisma.coachProfile.count(),
    prisma.newsPost.count(),
  ]);

  const [
    storeProductsCount,
    tournamentsCount,
    hostedTours,
    applicationsCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.tournament.count(),
    prisma.tournament.findMany({
      where: { mode: 'HOSTED' },
      select: {
        entryFeePerTeam: true,
        teams: { select: { paymentStatus: true, entryFeeAmount: true, paidAt: true, createdAt: true } },
      },
    }),
    prisma.memberApplication.count(),
  ]);

  const [
    pendingApplicationsCount,
    scheduledApplicationsCount,
    approvedTryoutsCount,
    paidTryoutsCount,
  ] = await Promise.all([
    prisma.memberApplication.count({ where: { status: 'PENDING' } }),
    prisma.memberApplication.count({ where: { status: 'SCHEDULED' } }),
    prisma.memberApplication.count({ where: { status: 'APPROVED' } }),
    prisma.memberApplication.count({ where: { paymentStatus: 'PAID' } }),
  ]);

  const [revenueTryoutRows, recentBookingsRaw, recentTrainingRaw, guestSessionsRaw] = await Promise.all([
    prisma.memberApplication.findMany({
      where: {
        OR: [{ paymentStatus: 'PAID' }, { status: 'APPROVED', paymentStatus: { not: 'FREE' } }],
      },
      select: { paymentStatus: true, entryFee: true, paidAt: true, approvedAt: true, updatedAt: true, createdAt: true },
    }),
    prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.trainingRegistration.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.guestSession.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
  ]);

  const courtRevenue = paidBookingsRows.reduce((s, b) => s + (Number(b.totalPrice) || 0), 0);
  for (const b of paidBookingsRows) {
    const bucket = bucketByKey.get(toMonthKey(b.bookingDate) ?? '');
    if (bucket) bucket.court += Number(b.totalPrice) || 0;
  }

  const storeRevenue = paidOrderRows.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  for (const o of paidOrderRows) {
    const bucket = bucketByKey.get(toMonthKey(o.createdAt) ?? '');
    if (bucket) bucket.store += Number(o.totalAmount) || 0;
  }

  const paidGuests = guestSessionsRaw.filter((g) => g.paymentStatus === 'PAID');
  const guestSessionRevenue = paidGuests.reduce((s, g) => s + (Number(g.amount) || 0), 0);
  for (const g of paidGuests) {
    const bucket = bucketByKey.get(toMonthKey(g.paidAt ?? g.sessionDate) ?? '');
    if (bucket) bucket.guest += Number(g.amount) || 0;
  }

  const coursePriceMap = new Map(coursesRows.map((c) => [c.id, Number(c.price) || 0]));
  let trainingRevenue = 0;
  for (const r of confirmedRegRows) {
    const amt = coursePriceMap.get(r.courseId) ?? 0;
    trainingRevenue += amt;
    const bucket = bucketByKey.get(toMonthKey(r.createdAt) ?? '');
    if (bucket) bucket.training += amt;
  }

  let tryoutRevenue = 0;
  for (const a of revenueTryoutRows) {
    const pay = String(a.paymentStatus || 'PENDING').toUpperCase();
    const fee = pay === 'FREE' ? 0 : a.entryFee !== null && a.entryFee !== undefined ? Number(a.entryFee) : 100000;
    tryoutRevenue += fee;
    const bucket = bucketByKey.get(toMonthKey(a.paidAt ?? a.approvedAt ?? a.updatedAt ?? a.createdAt) ?? '');
    if (bucket) bucket.tryout += fee;
  }

  let tournamentRevenue = 0;
  let paidTournamentTeamsCount = 0;
  let pendingTournamentFeesCount = 0;
  for (const tour of hostedTours) {
    for (const tm of tour.teams) {
      if (tm.paymentStatus === 'PAID') {
        paidTournamentTeamsCount += 1;
        const amt = Number(tm.entryFeeAmount ?? tour.entryFeePerTeam) || 0;
        tournamentRevenue += amt;
        const bucket = bucketByKey.get(toMonthKey(tm.paidAt ?? tm.createdAt) ?? '');
        if (bucket) bucket.tournament += amt;
      } else if (tm.paymentStatus === 'PENDING') {
        pendingTournamentFeesCount += 1;
      }
    }
  }

  return {
    restrictedFinance: false,
    totalBookingsCount,
    paidBookingsCount: paidBookingsRows.length,
    pendingBookingsCount,
    totalStoreOrdersCount,
    paidStoreOrdersCount: paidOrderRows.length,
    pendingStoreOrdersCount,
    totalGuestSessionsCount,
    paidGuestSessionsCount: paidGuests.length,
    pendingGuestSessionsCount,
    totalTrainingRegsCount,
    confirmedTrainingCount: confirmedRegRows.length,
    pendingTrainingCount,
    playersCount,
    activePlayersCount,
    coursesCount: coursesRows.length,
    coachesCount,
    newsCount,
    storeProductsCount,
    tournamentsCount,
    hostedTournamentsCount: hostedTours.length,
    paidTournamentTeamsCount,
    pendingTournamentFeesCount,
    applicationsCount,
    pendingApplicationsCount,
    scheduledApplicationsCount,
    approvedTryoutsCount,
    paidTryoutsCount,
    courtRevenue,
    trainingRevenue,
    storeRevenue,
    guestSessionRevenue,
    tryoutRevenue,
    tournamentRevenue,
    monthlyRevenue,
    recentBookings: recentBookingsRaw.map(toBookingDto),
    recentTrainingRegs: recentTrainingRaw.map(toRegistrationDto),
    guestSessions: guestSessionsRaw.map(toGuestSessionDto),
  };
}
