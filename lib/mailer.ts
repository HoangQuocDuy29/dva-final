import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CẤU HÌNH RESEND EMAIL CLIENT (OFFICIAL DOMAIN: dva-volleyball-hanoi.com)
// ============================================================================
export const resend = new Resend(process.env.RESEND_API_KEY);

export const DEFAULT_SENDER_EMAIL = 'DVA Volleyball <contact@dva-volleyball-hanoi.com>';
export const DEFAULT_ADMIN_EMAIL = 'quocduyhoang42@gmail.com';

export function getResendApiKey(): string {
  return (process.env.RESEND_API_KEY || '').trim();
}

export function getSenderEmail(): string {
  const envFrom = (process.env.EMAIL_FROM || '').trim();
  if (envFrom) {
    if (!envFrom.includes('<') && envFrom.includes('@')) {
      return `DVA Volleyball <${envFrom}>`;
    }
    return envFrom;
  }
  return DEFAULT_SENDER_EMAIL;
}

export function getAdminEmail(): string {
  return (
    process.env.ADMIN_NOTIFY_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    DEFAULT_ADMIN_EMAIL
  ).trim();
}

export function getResendClient(): Resend {
  return new Resend(getResendApiKey());
}

export const SENDER_EMAIL = getSenderEmail();
export const ADMIN_EMAIL = getAdminEmail();
export const ADMIN_ALERT_EMAIL = ADMIN_EMAIL;

// ============================================================================
// HÌNH ẢNH & THÔNG TIN HỖ TRỢ SÂN (155 TRƯỜNG CHINH, HÀ NỘI)
// ============================================================================
export const DEFAULT_COURT_GUIDE_IMAGE =
  'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792751386/dcf3e900-0bc9-4d37-9bce-045b3f7df0f3.png';

export const COURT_GATE_IMAGE =
  'https://res.cloudinary.com/dsezvx7xf/image/upload/v1793177550/4855e108-747c-4517-8f29-eb130796805b.png';

export const COURT_DEFAULT_ADDRESS = '155 Trường Chinh, Thanh Xuân, Hà Nội';
export const COURT_DEFAULT_MAPS_URL = 'https://maps.app.goo.gl/hkqofjzojcUoE39M7';

// ============================================================================
// THÔNG TIN TÀI KHOẢN THỤ HƯỞNG & VIETQR CHUẨN (MBBANK - HOANG QUOC DUY)
// ============================================================================
export const VIETQR_BANK_ID = 'MB'; // MBBank (Ngân hàng Quân Đội)
export const VIETQR_ACCOUNT_NO = '0002090671521';
export const VIETQR_ACCOUNT_NAME = 'HOANG QUOC DUY';

export const EMAIL_CUSTOM_CONFIG = {
  defaultGuideImageUrl: process.env.COURT_GUIDE_IMAGE_URL || DEFAULT_COURT_GUIDE_IMAGE,
  gateImageUrl: COURT_GATE_IMAGE,
  courtGuideImages: {
    'court-btl': DEFAULT_COURT_GUIDE_IMAGE,
    'court-thecong': DEFAULT_COURT_GUIDE_IMAGE,
    'court-mydinh': DEFAULT_COURT_GUIDE_IMAGE,
  } as Record<string, string>,
  courtMapsUrls: {
    'court-btl': COURT_DEFAULT_MAPS_URL,
    'court-thecong': COURT_DEFAULT_MAPS_URL,
    'court-mydinh': COURT_DEFAULT_MAPS_URL,
  } as Record<string, string>,
  introMessageVi:
    'Cảm ơn bạn đã lựa chọn DVA Volleyball Club! Đơn đặt sân của bạn đã được ghi nhận trên hệ thống. Dưới đây là thông tin chi tiết về ca sân và hướng dẫn check-in nhận sân:',
  introMessageEn:
    'Thank you for choosing DVA Volleyball Club! Your court booking has been recorded on our system. Below are your booking details and check-in instructions:',
  wishMessageVi:
    'Chúc bạn và đồng đội có những pha bóng đẹp mắt, tràn đầy năng lượng và một buổi thi đấu bùng nổ tại DVA Volleyball Club! 🏐🔥',
  wishMessageEn:
    'Wishing you and your team energetic, high-flying spikes and a fantastic match at DVA Volleyball Club! 🏐🔥',
};

// ============================================================================
// DATA INTERFACES
// ============================================================================
export interface BookingEmailPayload {
  id?: string;
  bookingCode: string;
  courtId?: string;
  courtName?: string;
  subCourt?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  timeSlot?: string;
  totalHours?: number;
  totalPrice: number;
  paymentStatus?: string | null;
  transferContent?: string | null;
  vietqrUrl?: string | null;
  notes?: string | null;
}

export interface CourtEmailPayload {
  id?: string;
  name: string;
  address?: string | null;
  floorType?: string | null;
  imageUrl?: string | null;
}

export interface TrainingEmailPayload {
  orderCode?: string;
  code?: string;
  packageName: string;
  fullName: string;
  email: string;
  phone: string;
  level?: string;
  preferredTime?: string | null;
  targetSkill?: string | null;
  position?: string | null;
  notes?: string | null;
  amount: number | string;
  transferContent?: string;
}

export interface MemberEmailPayload {
  id?: string;
  passId?: string;
  fullName: string;
  dob?: string;
  position: string;
  level: string;
  desiredJerseyNumber?: number | string;
  height: number | string;
  weight: number | string;
  spikeReach: number | string;
  blockReach: number | string;
  gmail?: string;
  email?: string;
  zalo: string;
  instagram?: string;
  rotationKnowledge?: string;
  hometownCountry?: string;
}

export interface AdminNotificationDetail {
  label: string;
  value: string | number | null | undefined;
}

export interface AdminNotificationPayload {
  type: 'BOOK_COURT' | 'TRAINING' | 'MEMBER' | string;
  title?: string;
  code?: string;
  customerName?: string;
  phone: string;
  email?: string | null;
  amount?: number | string | null;
  transferContent?: string | null;
  details?: string | AdminNotificationDetail[] | null;
  // Compatibility fields
  moduleName?: string;
  bookingCode?: string;
  fullName?: string;
  notes?: string | null;
  sheetsUrl?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
export function calculateCheckInTime(timeSlotOrStart?: string, fallbackStartTime?: string): string {
  let start = fallbackStartTime || '';
  if (!start && timeSlotOrStart) {
    const parts = timeSlotOrStart.split(/[-–—]/);
    if (parts.length > 0) start = parts[0].trim();
  }
  const match = (start || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '15 phút trước giờ nhận sân / 15 mins prior';

  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  m -= 15;
  if (m < 0) {
    m += 60;
    h -= 1;
    if (h < 0) h = 23;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function extractStartAndEndTime(
  timeSlot?: string,
  rawStart?: string,
  rawEnd?: string
): { startTime: string; endTime: string } {
  let startTime = (rawStart || '').trim();
  let endTime = (rawEnd || '').trim();
  if ((!startTime || !endTime) && timeSlot) {
    const parts = timeSlot.split(/[-–—]/);
    if (parts.length === 2) {
      if (!startTime) startTime = parts[0].trim();
      if (!endTime) endTime = parts[1].trim();
    }
  }
  return { startTime: startTime || '17:30', endTime: endTime || '19:00' };
}

export function removeVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function formatBookingDateDDMM(rawDate?: string): string {
  const str = (rawDate || '').trim();
  if (!str) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  // YYYY-MM-DD hoặc YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const d = ymdMatch[3].padStart(2, '0');
    const m = ymdMatch[2].padStart(2, '0');
    return `${d}${m}`;
  }
  // DD-MM-YYYY hoặc DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    return `${d}${m}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${d}${m}`;
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  return '2910';
}

export function formatBookingCourtTag(
  courtName?: string,
  subCourt?: string | null,
  courtId?: string
): string {
  const combined = `${courtId || ''} ${courtName || ''}`.toUpperCase();
  const sub = removeVietnameseTones(subCourt || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let subTag = '';
  if (sub.includes('B')) subTag = 'B';
  else if (sub.includes('A')) subTag = 'A';

  if (combined.includes('BTL') || combined.includes('THONG TIN')) {
    return subTag ? `BTL${subTag}` : 'BTLA';
  }
  if (combined.includes('THE CONG') || combined.includes('THECONG')) {
    return subTag ? `TC${subTag}` : 'TC';
  }
  if (combined.includes('MY DINH') || combined.includes('MYDINH')) {
    return subTag ? `MD${subTag}` : 'MD';
  }
  if (subTag) return `155TC${subTag}`;
  return '155TC';
}

export function formatBookingTimeTag(timeSlot?: string, rawStart?: string, rawEnd?: string): string {
  const { startTime, endTime } = extractStartAndEndTime(timeSlot, rawStart, rawEnd);
  const toCompactTime = (t: string): string => {
    const digits = t.replace(/\D/g, '');
    if (digits.length === 4) return digits;
    if (t.includes(':')) {
      const [h, m] = t.split(':');
      return `${(h || '00').padStart(2, '0')}${(m || '00').padEnd(2, '0').slice(0, 2)}`;
    }
    return digits.padEnd(4, '0').slice(0, 4);
  };
  return `${toCompactTime(startTime)} ${toCompactTime(endTime)}`;
}

export function generateBookingTransferDescription(
  booking: {
    customerName?: string;
    bookingDate?: string;
    date?: string;
    subCourt?: string | null;
    courtName?: string;
    courtId?: string;
    startTime?: string;
    endTime?: string;
    timeSlot?: string;
    bookingCode?: string;
    transferContent?: string | null;
  },
  court?: { id?: string; name?: string } | null
): string {
  const rawName = booking.customerName || 'KHACH';
  const cleanName =
    removeVietnameseTones(rawName)
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase() || 'KHACH';

  const dateStr = formatBookingDateDDMM(booking.bookingDate || booking.date);
  const courtTag = formatBookingCourtTag(
    court?.name || booking.courtName,
    booking.subCourt,
    court?.id || booking.courtId
  );
  const timeTag = formatBookingTimeTag(booking.timeSlot, booking.startTime, booking.endTime);

  return `DVA ${cleanName} ${dateStr} ${courtTag} ${timeTag}`.trim();
}

export function buildBookingVietQrUrl(
  amount: number,
  transferContent: string,
  accountName = VIETQR_ACCOUNT_NAME,
  accountNo = VIETQR_ACCOUNT_NO,
  bankId = VIETQR_BANK_ID
): string {
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${Number(amount) || 0}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`;
}

export function formatMemberPosition(pos: string): string {
  const p = (pos || '').toUpperCase().trim();
  const map: Record<string, string> = {
    OH: 'Outside Hitter (Chủ công - OH)',
    OP: 'Opposite (Đối chuyền - OP)',
    OPP: 'Opposite (Đối chuyền - OPP)',
    MB: 'Middle Blocker (Phụ công - MB)',
    S: 'Setter (Chuyền hai - S)',
    SETTER: 'Setter (Chuyền hai - S)',
    L: 'Libero (Chuyên gia phòng thủ - L)',
    LIBERO: 'Libero (Chuyên gia phòng thủ - L)',
  };
  return map[p] || pos;
}

export function formatMemberLevel(lvl: string): string {
  const l = (lvl || '').toUpperCase().trim();
  if (l === 'SENIOR') return 'Senior (Đội 1 / Advanced 3+ năm)';
  if (l === 'JUNIOR') return 'Junior (Bán chuyên / Intermediate)';
  if (l === 'YOUTH') return 'Youth (Tuyến trẻ / Development)';
  return lvl;
}

export function formatMemberTactics(tactic?: string): string {
  if (!tactic) return 'Hệ thống cơ bản / Basic system';
  const t = tactic.trim().toUpperCase();
  if (t === '5-1') return 'Chiến thuật 5-1 / 5-1 System';
  if (t === '6-2') return 'Chiến thuật 6-2 / 6-2 System';
  if (t === '4-2') return 'Chiến thuật 4-2 / 4-2 System';
  if (t === 'ADVANCED') return 'Thành thạo 5-1 & 6-2 / Advanced 5-1 & 6-2';
  if (t === 'BASIC') return 'Cơ bản / Basic system';
  return tactic;
}

export function getMailSender(): { name: string; email: string; from: string } {
  return {
    name: 'DVA Volleyball Club',
    email: SENDER_EMAIL,
    from: SENDER_EMAIL,
  };
}

export function getAdminNotificationEmail(): string {
  return ADMIN_EMAIL;
}

export function getSpreadsheetUrl(): string {
  if (process.env.GOOGLE_SHEETS_URL) return process.env.GOOGLE_SHEETS_URL;
  const sheetId =
    process.env.SPREADSHEET_ID ||
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const recentAdminAlerts = new Map<string, number>();

function isRecentDuplicateAlert(key: string, cooldownMs = 5000): boolean {
  const now = Date.now();
  const lastTime = recentAdminAlerts.get(key);
  if (lastTime && now - lastTime < cooldownMs) {
    return true;
  }
  recentAdminAlerts.set(key, now);
  if (recentAdminAlerts.size > 300) {
    for (const [k, time] of recentAdminAlerts.entries()) {
      if (now - time > 60_000) {
        recentAdminAlerts.delete(k);
      }
    }
  }
  return false;
}

// ============================================================================
// HTML GENERATOR 1: ĐẶT SÂN (COURT BOOKING CONFIRMATION) - SONG NGỮ ANH - VIỆT
// ============================================================================
export function getBookingConfirmationHtml(data: {
  booking_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  court_name: string;
  court_address: string;
  booking_date: string;
  time_slot: string;
  start_time: string;
  end_time: string;
  check_in_time: string;
  total_hours: number;
  total_price: number;
  formatted_price: string;
  payment_status: string;
  transfer_content?: string;
  vietqr_url?: string;
  guide_image_url: string;
  gate_image_url?: string;
  maps_url: string;
  notes: string;
}): string {
  const hotline = process.env.HOTLINE || '0768 299 329';
  const gateImg =
    data.gate_image_url && (data.gate_image_url.startsWith('http://') || data.gate_image_url.startsWith('https://'))
      ? data.gate_image_url.trim()
      : COURT_GATE_IMAGE;
  const rawGuide = data.guide_image_url;
  const guideImg =
    rawGuide && (rawGuide.startsWith('http://') || rawGuide.startsWith('https://'))
      ? rawGuide.trim()
      : DEFAULT_COURT_GUIDE_IMAGE;
  const mapsLink = data.maps_url || COURT_DEFAULT_MAPS_URL;
  const addressText = data.court_address || COURT_DEFAULT_ADDRESS;

  const cleanTransfer = (data.transfer_content || `DVA ${data.booking_code}`).trim();
  const vietQrUrl =
    data.vietqr_url ||
    buildBookingVietQrUrl(Number(data.total_price) || 0, cleanTransfer);

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xác nhận đặt sân / Court Booking Confirmation - ${escapeHtml(data.booking_code)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#111827;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          
          <!-- Header Banner (Gradient Cam - Đỏ Thể Thao DVA) -->
          <tr>
            <td style="background:linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #9a3412 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#ffedd5;margin-bottom:6px;">
                DVA VOLLEYBALL CLUB
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                XÁC NHẬN ĐẶT SÂN
              </h1>
              <div style="font-size:13px;font-weight:700;color:#ffedd5;margin-top:4px;letter-spacing:0.5px;">
                COURT BOOKING CONFIRMATION
              </div>
              <div style="margin-top:12px;">
                <span style="display:inline-block;background:rgba(0,0,0,0.35);padding:6px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);font-family:monospace;font-size:13px;color:#ffedd5;font-weight:700;">
                  MÃ ĐƠN / CODE: ${escapeHtml(data.booking_code)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#f8fafc;">
                Xin chào / Dear <strong>${escapeHtml(data.customer_name)}</strong>,
              </p>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                ${escapeHtml(EMAIL_CUSTOM_CONFIG.introMessageVi)}
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#94a3b8;font-style:italic;">
                ${escapeHtml(EMAIL_CUSTOM_CONFIG.introMessageEn)}
              </p>

              <!-- Thông tin chi tiết ca sân (Song ngữ) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:14px;padding:18px;margin-bottom:24px;">
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Mã đơn đặt sân<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Booking Code</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#38bdf8;text-align:right;font-family:monospace;">
                    ${escapeHtml(data.booking_code)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Họ và tên khách<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Customer Name</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:600;color:#f8fafc;text-align:right;">
                    ${escapeHtml(data.customer_name)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Số điện thoại<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Phone Number</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(data.customer_phone || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Email<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Email Address</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(data.customer_email || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Sân thi đấu<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Court Name</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:700;color:#f97316;text-align:right;">
                    ${escapeHtml(data.court_name)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Địa chỉ sân<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Court Address</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(addressText)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Ngày thi đấu<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Date</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                    ${escapeHtml(data.booking_date)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Khung giờ thuê sân<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Time Slot</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#38bdf8;text-align:right;font-family:monospace;">
                    ${escapeHtml(data.time_slot)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Giờ check-in đề xuất<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Recommended Check-in</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f97316;text-align:right;font-family:monospace;">
                    ${escapeHtml(data.check_in_time)} <span style="font-size:11px;color:#fed7aa;font-weight:normal;">(15 mins prior / trước 15p)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Ghi chú / Add-on<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Notes &amp; Add-ons</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#cbd5e1;text-align:right;">
                    ${escapeHtml(data.notes || 'None / Không có')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0 4px;font-size:13px;color:#94a3b8;">
                    Tổng thanh toán<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Total Amount</span>
                  </td>
                  <td style="padding:12px 0 4px;font-size:16px;font-weight:800;color:#4ade80;text-align:right;font-family:monospace;">
                    ${escapeHtml(data.formatted_price)} <span style="font-size:12px;color:#94a3b8;font-weight:600;">(${escapeHtml(data.payment_status)})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0 4px;font-size:13px;color:#94a3b8;">
                    Nội dung chuyển khoản<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Transfer Content</span>
                  </td>
                  <td style="padding:9px 0 4px;font-size:13px;font-family:monospace;font-weight:700;color:#facc15;text-align:right;">
                    ${escapeHtml(cleanTransfer)}
                  </td>
                </tr>
              </table>

              <!-- Callout nhắc nhở giờ vào sân (Song ngữ) -->
              <div style="background-color:rgba(249,115,22,0.1);border-left:4px solid #f97316;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#fed7aa;line-height:1.5;">
                  ⏰ Vui lòng có mặt lúc <span style="color:#f97316;text-decoration:underline;">${escapeHtml(data.check_in_time)}</span> để hoàn tất thủ tục nhận sân và khởi động.
                </p>
                <p style="margin:0 0 8px;font-size:12.5px;color:#ffedd5;line-height:1.5;font-style:italic;">
                  Please arrive at <span style="color:#f97316;font-weight:700;">${escapeHtml(data.check_in_time)}</span> (15 minutes prior) for warm-up and court check-in.
                </p>
                <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;">
                  • Giờ nhận sân chính thức / Official Start: <strong>${escapeHtml(data.start_time)}</strong> — Giờ kết thúc / End: <strong>${escapeHtml(data.end_time)}</strong>.
                </p>
              </div>

              <!-- DÒNG GHI CHÚ QUAN TRỌNG VỀ THANH TOÁN (NOTICE BOX SONG NGỮ BẮT BUỘC) -->
              <div style="background-color:rgba(239,68,68,0.12);border-left:4px solid #ef4444;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#fca5a5;margin-bottom:8px;">
                  ⚠️ LƯU Ý THANH TOÁN QUAN TRỌNG / IMPORTANT PAYMENT NOTICE
                </div>
                <p style="margin:0 0 10px;font-size:13.5px;line-height:1.6;color:#fecaca;">
                  <strong>VI:</strong> Nếu bạn chưa chuyển khoản thành công, vui lòng mở ứng dụng ngân hàng quét mã VietQR bên dưới hoặc liên hệ ngay hotline/Zalo/WhatsApp: <a href="tel:0768299329" style="color:#ffffff;font-weight:800;text-decoration:none;">0768 299 329</a>. Lịch đặt sân chỉ được tính là hợp lệ và giữ chỗ chính thức khi bạn đã thực sự chuyển khoản thành công và được Quốc Duy xác nhận.
                </p>
                <p style="margin:0;font-size:12.5px;line-height:1.6;color:#e2e8f0;font-style:italic;">
                  <strong>EN:</strong> If you have not completed the bank transfer, please scan the VietQR code below or immediately contact Hotline/Zalo/WhatsApp: <a href="tel:+84768299329" style="color:#ffffff;font-weight:700;text-decoration:none;">+84 768 299 329</a>. Your booking is only officially secured once the payment has been completed and verified by Quoc Duy.
                </p>
              </div>

              <!-- KHỐI MÃ VIETQR THANH TOÁN TỰ ĐỘNG (QR PAYMENT BOX) -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#f97316;margin-bottom:4px;">
                  💳 MÃ VIETQR THANH TOÁN TIỀN SÂN TỰ ĐỘNG
                </div>
                <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:14px;font-style:italic;">
                  AUTOMATED VIETQR COURT PAYMENT
                </div>

                <!-- Dòng nhắc nhở thân thiện (Song ngữ) -->
                <div style="margin:0 auto 16px auto;padding:12px 16px;background:rgba(249,115,22,0.1);border-radius:10px;border-left:3px solid #f97316;text-align:left;max-width:520px;">
                  <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#ffedd5;">
                    💬 <strong>VI:</strong> Quét mã QR bằng ứng dụng ngân hàng để được điền sẵn số tiền và nội dung chuyển khoản tự động chính xác nhất.
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#cbd5e1;font-style:italic;">
                    💬 <strong>EN:</strong> Scan the QR code using any banking app to automatically fill in the exact amount and transfer reference.
                  </p>
                </div>

                <!-- Ảnh VietQR -->
                <div style="margin:12px auto;display:inline-block;">
                  <img src="${escapeHtml(vietQrUrl)}" alt="Mã VietQR thanh toán tiền sân" style="max-width:100%;width:240px;height:auto;border-radius:12px;display:block;margin:0 auto;border:1px solid #334155;box-shadow:0 4px 14px rgba(0,0,0,0.4);" />
                </div>
                <p style="margin:6px 0 16px 0;font-size:12px;color:#94a3b8;line-height:1.4;">
                  (Mở app ngân hàng bất kỳ để quét mã VietQR tự động điền số tiền và nội dung)<br />
                  <span style="font-size:11px;font-style:italic;">Open any banking app to scan VietQR with auto-filled amount and reference</span>
                </p>

                <!-- Bảng chi tiết chuyển khoản rõ ràng bên dưới ảnh QR -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin:0 auto;max-width:520px;text-align:left;">
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Ngân hàng thụ hưởng / Bank
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                      MBBank (Ngân hàng Quân Đội)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Số tài khoản / Account Number
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:800;color:#38bdf8;text-align:right;font-family:monospace;">
                      0002090671521
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Chủ tài khoản / Account Name
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                      HOANG QUOC DUY
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Số tiền / Amount
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:800;color:#4ade80;text-align:right;font-family:monospace;">
                      ${escapeHtml(data.formatted_price)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0 2px 0;font-size:12.5px;color:#94a3b8;">
                      Nội dung chuyển khoản / Transfer Content
                    </td>
                    <td style="padding:8px 0 2px 0;text-align:right;">
                      <strong style="color: #facc15;font-family:monospace;font-size:13px;background:rgba(250,204,21,0.15);padding:3px 8px;border-radius:6px;display:inline-block;">
                        ${escapeHtml(cleanTransfer)}
                      </strong>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- MỤC CHỈ ĐƯỜNG & HƯỚNG DẪN VÀO SÂN (ĐẦY ĐỦ 2 KHỐI ẢNH + GOOGLE MAPS BUTTON) -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;">
                <h3 style="margin:0 0 4px;font-size:15px;font-weight:800;color:#f8fafc;letter-spacing:0.5px;">
                  📍 HƯỚNG DẪN ĐƯỜNG ĐI &amp; LỐI VÀO SÂN THI ĐẤU
                </h3>
                <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:12px;font-style:italic;">
                  VENUE LOCATION &amp; ENTRANCE GUIDE
                </div>
                
                <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  🏢 <strong>Địa chỉ sân / Venue Address:</strong> <span style="color:#fb923c;font-weight:700;">${escapeHtml(addressText)}</span>
                </p>
                
                <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#94a3b8;">
                  Nhấn vào nút bên dưới để mở Google Maps dẫn đường trực tiếp đến cổng sân bóng:<br />
                  <span style="font-size:12px;font-style:italic;">Click the button below to open directions on Google Maps:</span>
                </p>

                <!-- Nút bấm chỉ đường trực quan Google Maps -->
                <div style="text-align:center;margin:16px 0 20px 0;">
                  <a href="${escapeHtml(mapsLink)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #ea580c 0%, #f97316 100%);color:#ffffff;font-weight:800;font-size:14px;padding:13px 28px;border-radius:8px;text-decoration:none;box-shadow:0 4px 14px rgba(249,115,22,0.4);">
                    🗺️ Mở Chỉ Đường Trên Google Maps / Open in Google Maps
                  </a>
                </div>

                <!-- Khối ảnh 1: Cổng vào sân 155 Trường Chinh -->
                <div style="margin:16px 0;background:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:12px;text-align:center;">
                  <a href="${escapeHtml(gateImg)}" target="_blank" style="text-decoration:none;display:block;">
                    <img src="${escapeHtml(gateImg)}" alt="Cổng vào sân 155 Trường Chinh" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;border:0;" />
                  </a>
                  <p style="font-size:12.5px;color:#cbd5e1;margin-top:10px;margin-bottom:2px;font-weight:600;">
                    🚪 Hình ảnh cổng vào địa điểm thi đấu: 155 Trường Chinh, Thanh Xuân, Hà Nội
                  </p>
                  <p style="font-size:11.5px;color:#94a3b8;margin:0;font-style:italic;">
                    Main Entrance Gate: 155 Truong Chinh, Thanh Xuan, Hanoi
                  </p>
                </div>

                <!-- Khối ảnh 2: Sơ đồ chi tiết lối vào sân -->
                <div style="margin:16px 0;background:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:12px;text-align:center;">
                  <a href="${escapeHtml(guideImg)}" target="_blank" style="text-decoration:none;display:block;">
                    <img src="${escapeHtml(guideImg)}" alt="Sơ đồ lối vào sân bóng" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;border:0;" />
                  </a>
                  <p style="font-size:12.5px;color:#cbd5e1;margin-top:10px;margin-bottom:2px;font-weight:600;">
                    🗺️ Sơ đồ chi tiết lối di chuyển từ cổng vào thẳng sân bóng
                  </p>
                  <p style="font-size:11.5px;color:#94a3b8;margin:0;font-style:italic;">
                    Detailed route diagram from the main gate to the volleyball court
                  </p>
                </div>

                <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#cbd5e1;">
                  📞 <strong>Hotline hỗ trợ nhận sân / Support:</strong> <a href="tel:${escapeHtml(hotline.replace(/\s+/g, ''))}" style="color:#f97316;font-weight:700;text-decoration:none;">${escapeHtml(hotline)}</a> (Quốc Duy)
                </p>
              </div>

              <!-- Lời chúc (Song ngữ) -->
              <div style="margin:24px 0 0;padding:14px;background:#0b0f19;border-radius:12px;text-align:center;border:1px dashed #334155;">
                <p style="margin:0 0 6px;font-size:13.5px;line-height:1.6;color:#cbd5e1;font-weight:600;">
                  ${escapeHtml(EMAIL_CUSTOM_CONFIG.wishMessageVi)}
                </p>
                <p style="margin:0;font-size:12.5px;line-height:1.6;color:#94a3b8;font-style:italic;">
                  ${escapeHtml(EMAIL_CUSTOM_CONFIG.wishMessageEn)}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#090d16;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} DVA Volleyball Club · 155 Trường Chinh, Thanh Xuân, Hà Nội<br />
              Hotline / Zalo: ${escapeHtml(hotline)} · Instagram: @_nathan.hq_
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// HTML GENERATOR 2: ĐĂNG KÝ GÓI TẬP (TRAINING & SCRIMMAGE) - SONG NGỮ ANH - VIỆT
// ============================================================================
export function getTrainingRegistrationHtml(payload: {
  order_code: string;
  package_name: string;
  full_name: string;
  phone: string;
  email: string;
  level: string;
  preferred_time: string;
  target_skill: string;
  amount: number;
  formatted_amount: string;
  transfer_content: string;
  vietqr_url?: string;
  notes: string;
}): string {
  const hotline = process.env.HOTLINE || '0768 299 329';
  const gateImg = COURT_GATE_IMAGE;
  const mapsLink = COURT_DEFAULT_MAPS_URL;
  const addressText = COURT_DEFAULT_ADDRESS;

  const cleanTransfer = (payload.transfer_content || `DVA_${payload.order_code}`).trim();
  const trainingQrUrl =
    payload.vietqr_url ||
    `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=${Number(payload.amount) || 0}&addInfo=${encodeURIComponent(cleanTransfer)}&accountName=HOANG%20QUOC%20DUY`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tiếp nhận đăng ký khóa tập / Training Registration - ${escapeHtml(payload.order_code)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#111827;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          
          <!-- Header Banner (Gradient Xanh Dương Thể Thao #0284c7) -->
          <tr>
            <td style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#e0f2fe;margin-bottom:6px;">
                DVA VOLLEYBALL CLUB
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                TIẾP NHẬN ĐĂNG KÝ KHÓA TẬP
              </h1>
              <div style="font-size:13px;font-weight:700;color:#bae6fd;margin-top:4px;letter-spacing:0.5px;">
                TRAINING ENROLLMENT &amp; SCRIMMAGE
              </div>
              <div style="margin-top:12px;">
                <span style="display:inline-block;background:rgba(0,0,0,0.35);padding:6px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);font-family:monospace;font-size:13px;color:#e0f2fe;font-weight:700;">
                  MÃ ĐĂNG KÝ / CODE: ${escapeHtml(payload.order_code)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#f8fafc;">
                Xin chào / Dear <strong>${escapeHtml(payload.full_name)}</strong>,
              </p>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                Chào mừng bạn đến với chương trình đào tạo của <strong style="color:#38bdf8;">DVA Volleyball Club</strong>! Chúng tôi đã ghi nhận thông tin đăng ký khóa tập của bạn thành công.
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#94a3b8;font-style:italic;">
                Welcome to <strong style="color:#38bdf8;">DVA Volleyball Club</strong> training program! We have successfully received your training/scrimmage registration.
              </p>

              <!-- Thông tin chi tiết gói tập (Song ngữ) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:14px;padding:18px;margin-bottom:24px;">
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Mã đơn đăng ký<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Order Code</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#38bdf8;text-align:right;font-family:monospace;">
                    ${escapeHtml(payload.order_code)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Gói tập / Khóa học<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Training Package</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:700;color:#38bdf8;text-align:right;">
                    ${escapeHtml(payload.package_name)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Họ tên học viên<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Trainee Name</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:600;color:#f8fafc;text-align:right;">
                    ${escapeHtml(payload.full_name)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Số điện thoại<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Phone Number</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(payload.phone)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Email<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Email Address</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(payload.email || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Cấp độ / Đội<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Skill Level</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#e0f2fe;text-align:right;font-weight:600;">
                    ${escapeHtml(payload.level)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Khung giờ tập<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Training Schedule</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#38bdf8;text-align:right;font-weight:600;">
                    ${escapeHtml(payload.preferred_time || 'Linh hoạt theo lịch CLB / Flexible per Club schedule')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Mục tiêu / Vị trí<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Target Skill &amp; Position</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#cbd5e1;text-align:right;">
                    ${escapeHtml(payload.target_skill || 'Linh hoạt / Flexible')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Ghi chú<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Notes</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#cbd5e1;text-align:right;">
                    ${escapeHtml(payload.notes || 'None / Không có')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Nội dung chuyển khoản<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Transfer Note</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-family:monospace;font-weight:700;color:#facc15;text-align:right;">
                    ${escapeHtml(payload.transfer_content || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0 4px;font-size:13px;color:#94a3b8;">
                    Mức học phí<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Training Fee</span>
                  </td>
                  <td style="padding:12px 0 4px;font-size:16px;font-weight:800;color:#4ade80;text-align:right;font-family:monospace;">
                    ${escapeHtml(payload.formatted_amount)}
                  </td>
                </tr>
              </table>

              <!-- KHỐI MÃ VIETQR THANH TOÁN TỰ ĐỘNG (QR PAYMENT BOX) -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;margin-bottom:4px;">
                  💳 MÃ VIETQR THANH TOÁN HỌC PHÍ TỰ ĐỘNG
                </div>
                <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:14px;font-style:italic;">
                  AUTOMATED VIETQR TUITION PAYMENT
                </div>

                <!-- Dòng nhắc nhở thân thiện (Song ngữ) -->
                <div style="margin:0 auto 16px auto;padding:12px 16px;background:rgba(2,132,199,0.1);border-radius:10px;border-left:3px solid #38bdf8;text-align:left;max-width:520px;">
                  <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#e0f2fe;">
                    💬 <strong>VI:</strong> Nếu bạn chưa kịp thanh toán trên website, bạn có thể mở ứng dụng ngân hàng và quét mã QR phía trên để hoàn tất học phí bất kỳ lúc nào.
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;font-style:italic;">
                    💬 <strong>EN:</strong> If you haven&#39;t completed the payment on the website, you can scan the QR code above using your banking app to finalize your tuition anytime.
                  </p>
                </div>

                <!-- Ảnh VietQR -->
                <div style="margin:12px auto;display:inline-block;">
                  <img src="${escapeHtml(trainingQrUrl)}" alt="Mã VietQR thanh toán học phí" style="max-width:100%;width:240px;height:auto;border-radius:12px;display:block;margin:0 auto;border:1px solid #334155;box-shadow:0 4px 14px rgba(0,0,0,0.4);" />
                </div>
                <p style="margin:6px 0 16px 0;font-size:12px;color:#94a3b8;line-height:1.4;">
                  (Mở app ngân hàng bất kỳ để quét mã VietQR tự động điền số tiền và nội dung)<br />
                  <span style="font-size:11px;font-style:italic;">Open any banking app to scan VietQR with auto-filled amount and reference</span>
                </p>

                <!-- Bảng chi tiết chuyển khoản bên dưới ảnh -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin:0 auto;max-width:520px;text-align:left;">
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Ngân hàng / Bank
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                      MBBank (Ngân hàng Quân Đội)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Số tài khoản / Account Number
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:800;color:#38bdf8;text-align:right;font-family:monospace;">
                      0002090671521
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Chủ tài khoản / Account Name
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                      HOANG QUOC DUY
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#94a3b8;">
                      Số tiền học phí / Tuition Fee
                    </td>
                    <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:800;color:#4ade80;text-align:right;font-family:monospace;">
                      ${escapeHtml(payload.formatted_amount)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0 2px 0;font-size:12.5px;color:#94a3b8;">
                      Cú pháp chuyển khoản / Transfer Content
                    </td>
                    <td style="padding:8px 0 2px 0;text-align:right;">
                      <strong style="color:#facc15;font-family:monospace;font-size:13px;background:rgba(250,204,21,0.15);padding:3px 8px;border-radius:6px;display:inline-block;">
                        ${escapeHtml(payload.transfer_content)}
                      </strong>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- THÔNG BÁO LIÊN HỆ & KÊNH HỖ TRỢ TRỰC TIẾP (NOTICE BOX SONG NGỮ BẮT BUỘC) -->
              <div style="background-color:rgba(14,165,233,0.12);border-left:4px solid #0284c7;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#7dd3fc;margin-bottom:10px;">
                  ℹ️ THÔNG BÁO XẾP LỊCH &amp; HỖ TRỢ TRỰC TIẾP / DIRECT SUPPORT
                </div>
                
                <div style="font-size:13.5px;line-height:1.6;color:#e0f2fe;margin-bottom:12px;">
                  <p style="margin:0 0 6px;">
                    <strong>VI:</strong> Chúng tôi sẽ sớm liên hệ lại với bạn để xếp lịch tập. Nếu cần hỗ trợ gấp hoặc tư vấn thêm, bạn có thể chủ động liên hệ trực tiếp với Quốc Duy qua:
                  </p>
                  <ul style="margin:0;padding-left:20px;line-height:1.7;">
                    <li>Instagram: <a href="https://instagram.com/_nathan.hq_" target="_blank" style="color:#38bdf8;font-weight:700;text-decoration:none;">@_nathan.hq_</a></li>
                    <li>WhatsApp: <a href="https://wa.me/84768299329" target="_blank" style="color:#38bdf8;font-weight:700;text-decoration:none;">+84 768 299 329</a></li>
                    <li>Zalo / Hotline: <a href="tel:0768299329" style="color:#38bdf8;font-weight:700;text-decoration:none;">0768 299 329</a></li>
                  </ul>
                </div>

                <div style="font-size:12.5px;line-height:1.6;color:#cbd5e1;font-style:italic;">
                  <p style="margin:0 0 6px;">
                    <strong>EN:</strong> We will contact you shortly to schedule your session. If you need urgent assistance, feel free to reach out directly to Quoc Duy via:
                  </p>
                  <ul style="margin:0;padding-left:20px;line-height:1.7;">
                    <li>Instagram: <a href="https://instagram.com/_nathan.hq_" target="_blank" style="color:#38bdf8;font-weight:700;text-decoration:none;">@_nathan.hq_</a></li>
                    <li>WhatsApp: <a href="https://wa.me/84768299329" target="_blank" style="color:#38bdf8;font-weight:700;text-decoration:none;">+84 768 299 329</a></li>
                    <li>Zalo / Hotline: <a href="tel:0768299329" style="color:#38bdf8;font-weight:700;text-decoration:none;">0768 299 329</a></li>
                  </ul>
                </div>
              </div>

              <!-- HƯỚNG DẪN ĐẾN SÂN TẬP (VENUE GUIDE BỔ SUNG: ĐỊA CHỈ, GOOGLE MAPS & ẢNH CỔNG) -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;">
                <h3 style="margin:0 0 4px;font-size:15px;font-weight:800;color:#f8fafc;letter-spacing:0.5px;">
                  📍 ĐỊA ĐIỂM SÂN TẬP &amp; HƯỚNG DẪN ĐẾN SÂN
                </h3>
                <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:12px;font-style:italic;">
                  TRAINING VENUE &amp; LOCATION GUIDE
                </div>
                
                <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  🏢 <strong>Địa chỉ sân tập / Training Venue:</strong> <span style="color:#38bdf8;font-weight:700;">${escapeHtml(addressText)}</span>
                </p>

                <!-- Nút chỉ đường Google Maps -->
                <div style="text-align:center;margin:16px 0 18px 0;">
                  <a href="${escapeHtml(mapsLink)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);color:#ffffff;font-weight:800;font-size:14px;padding:13px 28px;border-radius:8px;text-decoration:none;box-shadow:0 4px 14px rgba(2,132,199,0.4);">
                    🗺️ Mở Chỉ Đường Trên Google Maps / Open in Google Maps
                  </a>
                </div>

                <!-- Ảnh cổng vào sân tập -->
                <div style="margin:16px 0;background:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:12px;text-align:center;">
                  <a href="${escapeHtml(gateImg)}" target="_blank" style="text-decoration:none;display:block;">
                    <img src="${escapeHtml(gateImg)}" alt="Cổng vào sân 155 Trường Chinh" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;border:0;" />
                  </a>
                  <p style="font-size:12.5px;color:#cbd5e1;margin-top:10px;margin-bottom:2px;font-weight:600;">
                    🚪 Hình ảnh cổng vào CLB: 155 Trường Chinh, Thanh Xuân, Hà Nội
                  </p>
                  <p style="font-size:11.5px;color:#94a3b8;margin:0;font-style:italic;">
                    Main Entrance Gate: 155 Truong Chinh, Thanh Xuan, Hanoi
                  </p>
                </div>
              </div>

              <!-- Lưu ý khi đi tập (Song ngữ) -->
              <div style="background-color:rgba(2,132,199,0.1);border-left:4px solid #0284c7;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#e0f2fe;line-height:1.5;">
                  ℹ️ Lưu ý dành cho học viên khi tham gia buổi tập / Important Notes:
                </p>
                <p style="margin:0 0 4px;font-size:13px;color:#cbd5e1;line-height:1.5;">
                  • Vui lòng có mặt trước giờ tập <strong>10–15 phút</strong> để khởi động kĩ càng.
                </p>
                <p style="margin:0 0 8px;font-size:12.5px;color:#94a3b8;line-height:1.5;font-style:italic;">
                  Please arrive <strong>10–15 minutes early</strong> for proper warm-up.
                </p>
                <p style="margin:0 0 4px;font-size:13px;color:#cbd5e1;line-height:1.5;">
                  • Mang theo giày bóng chuyền chuyên dụng, trang phục tập thoải mái và bình nước cá nhân.
                </p>
                <p style="margin:0;font-size:12.5px;color:#94a3b8;line-height:1.5;font-style:italic;">
                  Bring specialized volleyball shoes, comfortable training apparel, and a personal water bottle.
                </p>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">
                📞 Hotline / Zalo tư vấn lớp tập / Support: <a href="tel:${escapeHtml(hotline.replace(/\s+/g, ''))}" style="color:#38bdf8;font-weight:700;text-decoration:none;">${escapeHtml(hotline)}</a> (Quốc Duy)
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#090d16;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} DVA Volleyball Club · 155 Trường Chinh, Thanh Xuân, Hà Nội<br />
              Hotline / Zalo: ${escapeHtml(hotline)} · Instagram: @_nathan.hq_
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// HTML GENERATOR 3: ĐĂNG KÝ THÀNH VIÊN MỚI (NEW MEMBER APPLICATION) - SONG NGỮ
// ============================================================================
export function getMemberRegistrationHtml(member: {
  pass_id: string;
  full_name: string;
  dob: string;
  position: string;
  formatted_position: string;
  level: string;
  jersey_number: string | number;
  height: string | number;
  weight: string | number;
  spike_reach: string | number;
  block_reach: string | number;
  zalo: string;
  email: string;
  instagram: string;
  rotation_knowledge: string;
  hometown_country: string;
  transfer_content: string;
  vietqr_url: string;
}): string {
  const hotline = process.env.HOTLINE || '0768 299 329';
  const jerseyDisplay =
    member.jersey_number !== undefined && member.jersey_number !== null && member.jersey_number !== ''
      ? `#${member.jersey_number}`
      : 'Tự do / Any';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tiếp nhận hồ sơ thành viên mới / New Member Application - ${escapeHtml(member.pass_id)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#111827;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          
          <!-- Header Banner (Gradient Xanh Lá Thể Thao #16a34a) -->
          <tr>
            <td style="background:linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#dcfce7;margin-bottom:6px;">
                DVA VOLLEYBALL CLUB
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                TIẾP NHẬN HỒ SƠ THÀNH VIÊN MỚI
              </h1>
              <div style="font-size:13px;font-weight:700;color:#bbf7d0;margin-top:4px;letter-spacing:0.5px;">
                NEW MEMBER APPLICATION
              </div>
              <div style="margin-top:12px;">
                <span style="display:inline-block;background:rgba(0,0,0,0.35);padding:6px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);font-family:monospace;font-size:13px;color:#dcfce7;font-weight:700;">
                  MÃ HỘI VIÊN / MEMBER PASS ID: ${escapeHtml(member.pass_id)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#f8fafc;">
                Xin chào / Dear <strong>${escapeHtml(member.full_name)}</strong>,
              </p>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                Chào mừng bạn đến với cộng đồng <strong style="color:#4ade80;">DVA Volleyball Club</strong>! Ban chuyên môn đã tiếp nhận hồ sơ đăng ký thành viên mới của bạn.
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#94a3b8;font-style:italic;">
                Welcome to <strong style="color:#4ade80;">DVA Volleyball Club</strong> community! We have successfully received your new member registration application.
              </p>

              <!-- Thông tin hồ sơ thành viên (Song ngữ) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:14px;padding:18px;margin-bottom:24px;">
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Mã hội viên<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Member Pass ID</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#4ade80;text-align:right;font-family:monospace;">
                    ${escapeHtml(member.pass_id)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Họ và tên<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Full Name</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:600;color:#f8fafc;text-align:right;">
                    ${escapeHtml(member.full_name)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Ngày sinh<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Date of Birth</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(member.dob || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Vị trí thi đấu<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Playing Position</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#4ade80;text-align:right;">
                    ${escapeHtml(member.formatted_position)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Số áo mong muốn<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Desired Jersey Number</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#facc15;text-align:right;font-family:monospace;">
                    ${escapeHtml(jerseyDisplay)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Cấp độ đăng ký<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Skill Level</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#dcfce7;text-align:right;font-weight:600;">
                    ${escapeHtml(member.level)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Chiều cao / Cân nặng<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Height / Weight</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(member.height)} cm / ${escapeHtml(member.weight)} kg
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Tầm bật đập / chắn<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Spike / Block Reach</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    Đập ${escapeHtml(member.spike_reach)} cm | Chắn ${escapeHtml(member.block_reach)} cm
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Chiến thuật 5-1<br /><span style="font-size:11px;color:#64748b;font-style:italic;">5-1 System Knowledge</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#cbd5e1;text-align:right;">
                    ${escapeHtml(member.rotation_knowledge)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Quê quán / Quốc gia<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Nationality / Country</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(member.hometown_country || 'Việt Nam')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Số điện thoại / Zalo<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Phone / Zalo</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#38bdf8;text-align:right;">
                    ${escapeHtml(member.zalo)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Email<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Email Address</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#f8fafc;text-align:right;">
                    ${escapeHtml(member.email || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0 4px;font-size:13px;color:#94a3b8;">
                    Instagram<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Instagram Handle</span>
                  </td>
                  <td style="padding:9px 0 4px;font-size:13px;color:#cbd5e1;text-align:right;">
                    ${escapeHtml(member.instagram || 'None')}
                  </td>
                </tr>
              </table>

              <!-- DÒNG LƯU Ý ĐỐI VỚI THÀNH VIÊN CŨ (PHÂN LOẠI CHUYỂN KHOẢN - SONG NGỮ BẮT BUỘC - ĐẶT NGAY TRÊN KHỐI PHÍ/QR) -->
              <div style="background-color:rgba(234,179,8,0.12);border-left:4px solid #eab308;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#fde047;margin-bottom:8px;">
                  📌 LƯU Ý PHÂN LOẠI HỘI VIÊN / NOTICE FOR EXISTING MEMBERS
                </div>
                <p style="margin:0 0 10px;font-size:13.5px;line-height:1.6;color:#fef08a;">
                  <strong>VI:</strong> 📌 <strong>Lưu ý:</strong> Nếu bạn là thành viên cũ điền form theo yêu cầu của Quốc Duy (Nathan) để cập nhật thông tin hồ sơ lên website, bạn <strong>KHÔNG CẦN</strong> chuyển khoản theo nội dung bên dưới. Nếu bạn là thành viên mới đăng ký gia nhập, sau khi chuyển khoản thành công bạn sẽ được thêm vào cộng đồng DVA.
                </p>
                <p style="margin:0;font-size:12.5px;line-height:1.6;color:#e2e8f0;font-style:italic;">
                  <strong>EN:</strong> 📌 <strong>Notice:</strong> If you are an existing member filling out this form at Quoc Duy's (Nathan) request to update your profile on the website, you <strong>DO NOT</strong> need to transfer the entry fee below. If you are a new applicant, you will be invited into the DVA Community once the payment is completed.
                </p>
              </div>

              <!-- Khối Lệ Phí & Quét Mã VietQR 100k -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4ade80;margin-bottom:6px;">
                  💳 THÔNG TIN LỆ PHÍ GIA NHẬP CLB
                </div>
                <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:12px;font-style:italic;">
                  CLUB ENTRY FEE &amp; VIETQR PAYMENT
                </div>
                
                <p style="margin:0 0 8px;font-size:14px;color:#cbd5e1;">
                  Lệ phí gia nhập / Entry Fee: <strong style="color:#4ade80;font-size:16px;">100.000 VNĐ / 100,000 VND</strong>
                </p>
                <p style="margin:0 0 14px;font-size:13px;color:#94a3b8;">
                  Cú pháp chuyển khoản / Transfer Note:<br />
                  <span style="font-family:monospace;font-weight:bold;color:#facc15;background:rgba(250,204,21,0.15);padding:4px 10px;border-radius:6px;display:inline-block;margin-top:4px;">${escapeHtml(member.transfer_content)}</span>
                </p>

                <!-- Ảnh VietQR -->
                <div style="margin:16px auto;display:inline-block;">
                  <img src="${escapeHtml(member.vietqr_url)}" alt="Mã VietQR nộp lệ phí 100k" style="max-width:100%;width:220px;height:auto;border-radius:12px;display:block;margin:0 auto;border:1px solid #334155;" />
                </div>
                <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                  (Mở app ngân hàng bất kỳ để quét mã VietQR tự động điền số tiền và nội dung)<br />
                  <span style="font-size:11px;font-style:italic;">Open any banking app to scan VietQR with auto-filled amount and reference</span>
                </p>
              </div>

              <!-- HAI DÒNG GHI CHÚ QUAN TRỌNG VỀ ẢNH THẺ & QUYỀN LỢI HỘI VIÊN (SONG NGỮ BẮT BUỘC) -->
              <div style="background-color:rgba(16,185,129,0.12);border-left:4px solid #10b981;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:left;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#86efac;margin-bottom:10px;">
                  📸 GỬI ẢNH CHÂN DUNG &amp; QUYỀN LỢI HỘI VIÊN / PHOTO SUBMISSION &amp; BENEFITS
                </div>
                
                <div style="font-size:13px;line-height:1.6;color:#dcfce7;margin-bottom:12px;">
                  <p style="margin:0 0 6px;"><strong>VI:</strong></p>
                  <ul style="margin:0;padding-left:20px;line-height:1.6;">
                    <li style="margin-bottom:6px;">
                      Khi bạn đóng xong lệ phí, hãy gửi ảnh chân dung (ảnh nửa người/toàn thân rõ mặt) của bạn cho Quốc Duy qua một trong các kênh liên hệ (Zalo/WhatsApp: <a href="tel:0768299329" style="color:#4ade80;font-weight:700;text-decoration:none;">0768 299 329</a>, Instagram: <a href="https://instagram.com/_nathan.hq_" target="_blank" style="color:#4ade80;font-weight:700;text-decoration:none;">@_nathan.hq_</a>) để được cập nhật hồ sơ vào đội sớm nhất.
                    </li>
                    <li>
                      ⚠️ <em>Lưu ý: Đây chỉ là phí gia nhập CLB một lần duy nhất. Sau khi gia nhập CLB, bạn có quyền tự do lựa chọn các buổi chơi/tập trong tương lai, đi buổi nào đóng phí sân buổi đó.</em>
                    </li>
                  </ul>
                </div>

                <div style="font-size:12.5px;line-height:1.6;color:#cbd5e1;font-style:italic;">
                  <p style="margin:0 0 6px;"><strong>EN:</strong></p>
                  <ul style="margin:0;padding-left:20px;line-height:1.6;">
                    <li style="margin-bottom:6px;">
                      After completing the entry fee, please send your portrait photo (headshot/action photo) to Quoc Duy via Zalo/WhatsApp (<a href="tel:+84768299329" style="color:#4ade80;font-weight:700;text-decoration:none;">+84 768 299 329</a>) or Instagram (<a href="https://instagram.com/_nathan.hq_" target="_blank" style="color:#4ade80;font-weight:700;text-decoration:none;">@_nathan.hq_</a>) to get your player profile published on our squad roster promptly.
                    </li>
                    <li>
                      ⚠️ <em>Please note: This is a one-time club entry fee. As a member, you have the flexibility to sign up for future games/sessions and only pay per-session court fees.</em>
                    </li>
                  </ul>
                </div>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">
                📞 Hotline / Zalo tuyển sinh CLB / Support: <a href="tel:${escapeHtml(hotline.replace(/\s+/g, ''))}" style="color:#4ade80;font-weight:700;text-decoration:none;">${escapeHtml(hotline)}</a> (Quốc Duy)
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#090d16;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} DVA Volleyball Club · 155 Trường Chinh, Thanh Xuân, Hà Nội<br />
              Hotline / Zalo: ${escapeHtml(hotline)} · Instagram: @_nathan.hq_
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// 1. LUỒNG GỬI EMAIL ĐẶT SÂN (COURT BOOKING)
// ============================================================================
export async function sendBookingConfirmationEmail(
  booking: BookingEmailPayload,
  court?: CourtEmailPayload | null
): Promise<boolean> {
  try {
    if (!booking?.customerEmail) {
      console.warn('[Resend Mailer] Bỏ qua gửi email vì đơn đặt sân không có customerEmail.');
      return false;
    }

    if (!getResendApiKey()) {
      console.warn(
        '[Resend Mailer Warning] RESEND_API_KEY chưa được cấu hình. Vui lòng thêm RESEND_API_KEY vào .env hoặc biến môi trường Render.'
      );
      return false;
    }

    const client = getResendClient();
    const sender = getSenderEmail();
    const admin = getAdminEmail();

    const baseCourtName = court?.name || booking.courtName || 'Sân bóng chuyền DVA';
    const courtDisplayName = booking.subCourt ? `${baseCourtName} - ${booking.subCourt}` : baseCourtName;
    const courtAddress = court?.address || COURT_DEFAULT_ADDRESS;

    const bookingDate = booking.bookingDate || booking.date || '';
    const { startTime, endTime } = extractStartAndEndTime(
      booking.timeSlot,
      booking.startTime,
      booking.endTime
    );
    const resolvedTimeSlot = booking.timeSlot || `${startTime} - ${endTime}`;
    const checkInTime = calculateCheckInTime(resolvedTimeSlot, startTime);
    const totalHours = booking.totalHours || 1.5;

    const formattedTotalPrice = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(booking.totalPrice) || 0);

    // Chuẩn hóa Cú pháp chuyển khoản VietQR: DVA [TênKhôngDấu] [Ngày] [Sân/SânCon] [KhungGiờ]
    const transferContent = generateBookingTransferDescription(
      {
        ...booking,
        bookingDate,
        startTime,
        endTime,
        timeSlot: resolvedTimeSlot,
      },
      court
    );

    // Tạo URL mã VietQR tự động qua Quicklink API của VietQR
    const vietQrUrl =
      booking.vietqrUrl ||
      buildBookingVietQrUrl(Number(booking.totalPrice) || 0, transferContent);

    // Sơ đồ lối di chuyển từ cổng vào sân thi đấu (155 Trường Chinh)
    // Luôn ưu tiên dùng DEFAULT_COURT_GUIDE_IMAGE tuyệt đối trên Cloudinary.
    // Nếu court?.imageUrl trong database là đường dẫn tương đối (ví dụ '/courts/btl.png')
    // thì không dùng để tránh làm hỏng hiển thị thẻ img trong email client.
    const guideImageUrl =
      court?.imageUrl && (court.imageUrl.startsWith('http://') || court.imageUrl.startsWith('https://'))
        ? court.imageUrl.trim()
        : DEFAULT_COURT_GUIDE_IMAGE;

    const customerHtml = getBookingConfirmationHtml({
      booking_code: booking.bookingCode,
      customer_name: booking.customerName,
      customer_email: booking.customerEmail,
      customer_phone: booking.customerPhone || '',
      court_name: courtDisplayName,
      court_address: courtAddress,
      booking_date: bookingDate,
      time_slot: resolvedTimeSlot,
      start_time: startTime,
      end_time: endTime,
      check_in_time: checkInTime,
      total_hours: totalHours,
      total_price: Number(booking.totalPrice) || 0,
      formatted_price: formattedTotalPrice,
      payment_status: booking.paymentStatus || 'PENDING',
      transfer_content: transferContent,
      vietqr_url: vietQrUrl,
      guide_image_url: guideImageUrl,
      gate_image_url: COURT_GATE_IMAGE,
      maps_url: COURT_DEFAULT_MAPS_URL,
      notes: booking.notes || 'Không có',
    });

    let customerMailSent = false;
    try {
      const { data, error } = await client.emails.send({
        from: sender,
        to: booking.customerEmail.trim(),
        subject: `[DVA Volleyball] Xác nhận đặt sân / Court Booking Confirmation - ${booking.bookingCode}`,
        html: customerHtml,
        replyTo: admin,
      });

      if (error) {
        console.warn(
          `[Resend Mailer Warning] Không thể gửi email đặt sân cho ${booking.customerEmail}:`,
          error.message
        );
      } else {
        console.log(
          `[Resend Mailer] ✅ Đã gửi email xác nhận đặt sân tới ${booking.customerEmail} (ID: ${data?.id})`
        );
        customerMailSent = true;
      }
    } catch (sendErr: any) {
      console.warn(
        `[Resend Mailer Warning] Lỗi ngoại lệ khi gửi email đặt sân cho ${booking.customerEmail}:`,
        sendErr?.message || sendErr
      );
    }

    // Tự động gửi email thông báo ngắn về hòm thư Admin (non-blocking)
    try {
      const adminSubject = `[DVA Admin] Có đơn đặt sân mới: ${booking.bookingCode} - ${booking.customerName}`;
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #f97316; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">
            🚨 [DVA Admin] Có đơn đặt sân mới
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 15px;">
            <tr><td style="padding: 6px 0; color: #94a3b8; width: 140px;">Mã đơn:</td><td style="padding: 6px 0; font-weight: bold; color: #38bdf8;">${escapeHtml(booking.bookingCode)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Khách hàng:</td><td style="padding: 6px 0; font-weight: bold; color: #ffffff;">${escapeHtml(booking.customerName)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Số điện thoại:</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(booking.customerPhone || '')}" style="color: #38bdf8; text-decoration: none;">${escapeHtml(booking.customerPhone || 'N/A')}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Email:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(booking.customerEmail || 'N/A')}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Sân đặt:</td><td style="padding: 6px 0; font-weight: bold; color: #fb923c;">${escapeHtml(courtDisplayName)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Ngày chơi:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(bookingDate)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Khung giờ:</td><td style="padding: 6px 0; color: #38bdf8;">${escapeHtml(resolvedTimeSlot)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Tổng tiền:</td><td style="padding: 6px 0; font-weight: bold; color: #4ade80; font-size: 16px;">${escapeHtml(formattedTotalPrice)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Nội dung CK:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #facc15;">${escapeHtml(transferContent)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Ghi chú:</td><td style="padding: 6px 0; color: #cbd5e1;">${escapeHtml(booking.notes || 'Không có')}</td></tr>
          </table>
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center;">
            Hệ thống Quản lý DVA Volleyball Club • Gửi tự động qua Resend
          </div>
        </div>
      `.trim();

      const { error: adminError } = await client.emails.send({
        from: sender,
        to: admin,
        subject: adminSubject,
        html: adminHtml,
        replyTo: booking.customerEmail.trim(),
      });

      if (adminError) {
        console.warn(
          `[Resend Mailer Warning] Không thể gửi thông báo Admin cho đơn ${booking.bookingCode}:`,
          adminError.message
        );
      } else {
        console.log(`[Resend Mailer] 📢 Đã gửi thông báo Admin cho đơn đặt sân: ${booking.bookingCode}`);
      }
    } catch (adminErr: any) {
      console.warn(
        `[Resend Mailer Warning] Lỗi ngoại lệ khi gửi thông báo Admin cho đơn ${booking.bookingCode}:`,
        adminErr?.message || adminErr
      );
    }

    return customerMailSent;
  } catch (err: any) {
    console.warn(`[Resend Mailer General Warning] Lỗi xử lý gửi email đặt sân:`, err?.message || err);
    return false;
  }
}

// ============================================================================
// 2. LUỒNG GỬI EMAIL ĐĂNG KÝ TẬP LUYỆN (TRAINING & SCRIMMAGE)
// ============================================================================
export async function sendTrainingRegistrationEmail(
  payload: TrainingEmailPayload
): Promise<boolean> {
  const recipientEmail = (payload.email || '').trim();
  const orderCode = (payload.orderCode || payload.code || `TR-${Date.now().toString().slice(-6)}`).trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!recipientEmail || !emailRegex.test(recipientEmail)) {
    console.warn('[Resend Mailer Warning] Bỏ qua gửi email vì email học viên không hợp lệ:', recipientEmail);
    return false;
  }

  if (!getResendApiKey()) {
    console.warn(
      '[Resend Mailer Warning] RESEND_API_KEY chưa được cấu hình. Vui lòng thêm RESEND_API_KEY vào .env hoặc biến môi trường Render.'
    );
    return false;
  }

  const client = getResendClient();
  const sender = getSenderEmail();
  const admin = getAdminEmail();

  try {
    const formattedAmount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(payload.amount) || 0);

    const cleanName = removeVietnameseTones(payload.fullName || '')
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    const cleanPhone = (payload.phone || '').replace(/\D/g, '').trim();
    const fallbackTransfer = `DVA_${orderCode}_${cleanName || 'HV'}${cleanPhone ? '_' + cleanPhone : ''}`;
    const rawTransfer = (payload.transferContent || fallbackTransfer).trim();
    const cleanTransfer = removeVietnameseTones(rawTransfer)
      .replace(/[^A-Za-z0-9_\-\s]/g, '')
      .trim();

    const trainingQrUrl = `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=${Number(payload.amount) || 0}&addInfo=${encodeURIComponent(cleanTransfer)}&accountName=HOANG%20QUOC%20DUY`;

    const traineeHtml = getTrainingRegistrationHtml({
      order_code: orderCode,
      package_name: payload.packageName || 'Gói tập DVA Volleyball',
      full_name: payload.fullName || 'Học viên',
      phone: payload.phone || '',
      email: recipientEmail,
      level: payload.level || 'Junior',
      preferred_time: payload.preferredTime || '',
      target_skill: payload.targetSkill || payload.position || '',
      amount: Number(payload.amount) || 0,
      formatted_amount: formattedAmount,
      transfer_content: cleanTransfer,
      vietqr_url: trainingQrUrl,
      notes: payload.notes || 'Không có',
    });

    let traineeMailSent = false;
    try {
      const { data, error } = await client.emails.send({
        from: sender,
        to: recipientEmail,
        subject: `[DVA Volleyball] Tiếp nhận đăng ký khóa tập / Training Registration - ${payload.packageName || 'Khóa học DVA'}`,
        html: traineeHtml,
        replyTo: admin,
      });

      if (error) {
        console.warn(
          `[Resend Mailer Warning] Không thể gửi email gói tập tới ${recipientEmail}:`,
          error.message
        );
      } else {
        console.log(
          `[Resend Mailer] ✅ Đã gửi email xác nhận đăng ký gói tập tới ${recipientEmail} (ID: ${data?.id})`
        );
        traineeMailSent = true;
      }
    } catch (sendErr: any) {
      console.warn(
        `[Resend Mailer Warning] Lỗi ngoại lệ khi gửi email gói tập tới ${recipientEmail}:`,
        sendErr?.message || sendErr
      );
    }

    // Tự động gửi email thông báo ngắn về hòm thư Admin (non-blocking)
    try {
      const adminSubject = `[DVA Admin] Đăng ký gói tập mới: ${payload.packageName || 'Gói tập'} - ${payload.fullName}`;
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #0284c7; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">
            🚨 [DVA Admin] Đăng ký gói tập mới
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 15px;">
            <tr><td style="padding: 6px 0; color: #94a3b8; width: 140px;">Mã đăng ký:</td><td style="padding: 6px 0; font-weight: bold; color: #38bdf8;">${escapeHtml(orderCode)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Học viên:</td><td style="padding: 6px 0; font-weight: bold; color: #ffffff;">${escapeHtml(payload.fullName)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Gói tập:</td><td style="padding: 6px 0; font-weight: bold; color: #38bdf8;">${escapeHtml(payload.packageName)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Số điện thoại:</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(payload.phone)}" style="color: #38bdf8; text-decoration: none;">${escapeHtml(payload.phone)}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Email:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(recipientEmail)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Cấp độ:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(payload.level || 'Junior')}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Khung giờ:</td><td style="padding: 6px 0; color: #38bdf8;">${escapeHtml(payload.preferredTime || 'Linh hoạt')}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Học phí:</td><td style="padding: 6px 0; font-weight: bold; color: #4ade80; font-size: 16px;">${escapeHtml(formattedAmount)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Nội dung CK:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #facc15;">${escapeHtml(cleanTransfer)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Ghi chú:</td><td style="padding: 6px 0; color: #cbd5e1;">${escapeHtml(payload.notes || 'Không có')}</td></tr>
          </table>
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center;">
            Hệ thống Quản lý DVA Volleyball Club • Gửi tự động qua Resend
          </div>
        </div>
      `.trim();

      const { error: adminError } = await client.emails.send({
        from: sender,
        to: admin,
        subject: adminSubject,
        html: adminHtml,
        replyTo: recipientEmail || undefined,
      });

      if (adminError) {
        console.warn(
          `[Resend Mailer Warning] Không thể gửi thông báo Admin cho gói tập ${orderCode}:`,
          adminError.message
        );
      } else {
        console.log(`[Resend Mailer] 📢 Đã gửi thông báo Admin cho gói tập: ${orderCode}`);
      }
    } catch (adminErr: any) {
      console.warn(
        `[Resend Mailer Warning] Lỗi ngoại lệ khi gửi thông báo Admin cho gói tập ${orderCode}:`,
        adminErr?.message || adminErr
      );
    }

    return traineeMailSent;
  } catch (err: any) {
    console.warn(`[Resend Mailer General Warning] Lỗi xử lý gửi email gói tập:`, err?.message || err);
    return false;
  }
}

// ============================================================================
// 3. LUỒNG GỬI EMAIL ĐĂNG KÝ THÀNH VIÊN MỚI (NEW MEMBER APPLICATION)
// ============================================================================
export async function sendMemberRegistrationEmail(
  member: MemberEmailPayload
): Promise<boolean> {
  const recipientEmail = (member.gmail || member.email || '').trim();
  const passId = (member.passId || member.id || 'DVA-PASS').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!recipientEmail || !emailRegex.test(recipientEmail)) {
    console.warn('[Resend Mailer Warning] Bỏ qua gửi email thành viên vì địa chỉ email không hợp lệ:', recipientEmail);
    return false;
  }

  if (!getResendApiKey()) {
    console.warn(
      '[Resend Mailer Warning] RESEND_API_KEY chưa được cấu hình. Vui lòng thêm RESEND_API_KEY vào .env hoặc biến môi trường Render.'
    );
    return false;
  }

  const client = getResendClient();
  const sender = getSenderEmail();
  const admin = getAdminEmail();

  try {
    const formattedPosition = formatMemberPosition(member.position);
    const cleanName = removeVietnameseTones(member.fullName).replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanPhone = (member.zalo || '').replace(/\D/g, '').trim() || (member.zalo || '').trim();
    const transferContent = `register_${cleanName}_clubentry_${cleanPhone}`;
    const vietQrUrl = `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=100000&addInfo=${encodeURIComponent(transferContent)}&accountName=HOANG%20QUOC%20DUY`;

    const memberHtml = getMemberRegistrationHtml({
      pass_id: passId,
      full_name: member.fullName,
      dob: member.dob || '',
      position: member.position,
      formatted_position: formattedPosition,
      level: member.level,
      jersey_number:
        member.desiredJerseyNumber !== undefined && member.desiredJerseyNumber !== null
          ? member.desiredJerseyNumber
          : '',
      height: member.height,
      weight: member.weight,
      spike_reach: member.spikeReach,
      block_reach: member.blockReach,
      zalo: member.zalo,
      email: recipientEmail,
      instagram: member.instagram || 'None',
      rotation_knowledge: member.rotationKnowledge || '',
      hometown_country: member.hometownCountry || '',
      transfer_content: transferContent,
      vietqr_url: vietQrUrl,
    });

    let memberMailSent = false;
    try {
      const { data, error } = await client.emails.send({
        from: sender,
        to: recipientEmail,
        subject: `[DVA Volleyball] Tiếp nhận hồ sơ thành viên mới / New Member Application - ${member.fullName}`,
        html: memberHtml,
        replyTo: admin,
      });

      if (error) {
        console.warn(
          `[Resend Mailer Warning] Không thể gửi email thành viên tới ${recipientEmail}:`,
          error.message
        );
      } else {
        console.log(
          `[Resend Mailer] ✅ Đã gửi email xác nhận thành viên tới ${recipientEmail} (ID: ${data?.id})`
        );
        memberMailSent = true;
      }
    } catch (sendErr: any) {
      console.warn(
        `[Resend Mailer Warning] Lỗi ngoại lệ khi gửi email thành viên tới ${recipientEmail}:`,
        sendErr?.message || sendErr
      );
    }

    // Tự động gửi email thông báo ngắn về hòm thư Admin (non-blocking)
    try {
      const jerseyDisplay =
        member.desiredJerseyNumber !== undefined && member.desiredJerseyNumber !== null && member.desiredJerseyNumber !== ''
          ? `#${member.desiredJerseyNumber}`
          : 'Chưa chọn';
      const adminSubject = `[DVA Admin] Đơn gia nhập CLB mới: ${member.fullName} (${jerseyDisplay})`;
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #16a34a; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">
            🚨 [DVA Admin] Đơn gia nhập CLB mới
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 15px;">
            <tr><td style="padding: 6px 0; color: #94a3b8; width: 140px;">Pass ID:</td><td style="padding: 6px 0; font-weight: bold; color: #38bdf8;">${escapeHtml(passId)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Thành viên:</td><td style="padding: 6px 0; font-weight: bold; color: #ffffff;">${escapeHtml(member.fullName)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Vị trí:</td><td style="padding: 6px 0; font-weight: bold; color: #4ade80;">${escapeHtml(formattedPosition)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Số áo mong muốn:</td><td style="padding: 6px 0; font-weight: bold; color: #ffffff;">${escapeHtml(jerseyDisplay)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Cấp độ:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(member.level)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Chiều cao / Cân nặng:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(member.height)}cm / ${escapeHtml(member.weight)}kg</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Tầm bật:</td><td style="padding: 6px 0; color: #ffffff;">Đập: ${escapeHtml(member.spikeReach)}cm | Chắn: ${escapeHtml(member.blockReach)}cm</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Số Zalo:</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(member.zalo)}" style="color: #38bdf8; text-decoration: none;">${escapeHtml(member.zalo)}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Email:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(recipientEmail)}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Quốc gia:</td><td style="padding: 6px 0; color: #ffffff;">${escapeHtml(member.hometownCountry || 'Việt Nam')}</td></tr>
          </table>
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center;">
            Hệ thống Quản lý DVA Volleyball Club • Gửi tự động qua Resend
          </div>
        </div>
      `.trim();

      const { error: adminError } = await client.emails.send({
        from: sender,
        to: admin,
        subject: adminSubject,
        html: adminHtml,
        replyTo: recipientEmail || undefined,
      });

      if (adminError) {
        console.warn(
          `[Resend Mailer Warning] Không thể gửi thông báo Admin cho thành viên ${member.fullName}:`,
          adminError.message
        );
      } else {
        console.log(`[Resend Mailer] 📢 Đã gửi thông báo Admin cho thành viên: ${member.fullName}`);
      }
    } catch (adminErr: any) {
      console.warn(
        `[Resend Mailer Warning] Lỗi ngoại lệ khi gửi thông báo Admin cho thành viên ${member.fullName}:`,
        adminErr?.message || adminErr
      );
    }

    return memberMailSent;
  } catch (err: any) {
    console.warn(`[Resend Mailer General Warning] Lỗi xử lý gửi mail thành viên:`, err?.message || err);
    return false;
  }
}

// ============================================================================
// 4. HÀM GỬI THÔNG BÁO TỔNG QUÁT TỚI ADMIN (SEND ADMIN NOTIFICATION)
// ============================================================================
export async function sendAdminNotification(
  payload: AdminNotificationPayload
): Promise<boolean> {
  if (!getResendApiKey()) {
    console.warn(
      '[Resend Mailer Warning] RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email Admin.'
    );
    return false;
  }

  const client = getResendClient();
  const sender = getSenderEmail();
  const adminEmail = getAdminEmail();

  const type = payload.type || 'BOOK_COURT';
  const code = (payload.code || payload.bookingCode || 'N/A').trim();
  const title = (payload.title || payload.moduleName || 'Đơn đăng ký mới').trim();
  const customerName = (payload.customerName || payload.fullName || 'Khách hàng').trim();
  const phone = (payload.phone || '').trim();
  const email = (payload.email || '').trim() || undefined;
  const rawAmount = payload.amount;
  const amount =
    rawAmount !== undefined && rawAmount !== null && rawAmount !== ''
      ? Number(rawAmount)
      : undefined;
  const transferContent = (payload.transferContent || '').trim() || undefined;
  const details =
    typeof payload.details === 'string'
      ? payload.details.trim()
      : Array.isArray(payload.details)
        ? payload.details.map((d) => `${d.label}: ${d.value}`).join(' | ')
        : (payload.notes || '').trim() || undefined;

  const dedupKey = `${type}:${code}`;
  if (code && code !== 'N/A' && isRecentDuplicateAlert(dedupKey, 5000)) {
    console.log(`[Resend Mailer] ℹ️ Đã gửi thông báo cho đơn ${code} gần đây, bỏ qua trùng lặp.`);
    return true;
  }

  try {
    const formattedAmount =
      amount !== undefined && !Number.isNaN(amount)
        ? `${Number(amount).toLocaleString('vi-VN')} đ`
        : '';
    const subject = `🚨 [DVA ADMIN ALERT] ${title} - ${customerName}${formattedAmount ? ' - ' + formattedAmount : ''}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px;">
        <h2 style="color: #f97316; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-top: 0;">
          🚨 CÓ ĐƠN ĐĂNG KÝ MỚI
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; width: 140px;">Dịch vụ:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #ffffff;">${escapeHtml(title)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Mã đơn:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #38bdf8;">${escapeHtml(code)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Họ và tên:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #ffffff;">${escapeHtml(customerName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Số điện thoại:</td>
            <td style="padding: 8px 0;"><a href="tel:${escapeHtml(phone)}" style="color: #38bdf8; text-decoration: none; font-weight: bold;">${escapeHtml(phone)}</a></td>
          </tr>
          ${
            email
              ? `
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Email:</td>
            <td style="padding: 8px 0; color: #ffffff;">${escapeHtml(email)}</td>
          </tr>`
              : ''
          }
          ${
            formattedAmount
              ? `
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Số tiền:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #4ade80; font-size: 16px;">${escapeHtml(formattedAmount)}</td>
          </tr>`
              : ''
          }
          ${
            transferContent
              ? `
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Nội dung CK:</td>
            <td style="padding: 8px 0; font-family: monospace; font-weight: bold; color: #facc15;">${escapeHtml(transferContent)}</td>
          </tr>`
              : ''
          }
          ${
            details
              ? `
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Thông tin thêm:</td>
            <td style="padding: 8px 0; color: #ffffff;">${escapeHtml(details)}</td>
          </tr>`
              : ''
          }
        </table>
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center;">
          Hệ thống Quản lý DVA Volleyball Club • Gửi tự động qua Resend
        </div>
      </div>
    `.trim();

    const { error } = await client.emails.send({
      from: sender,
      to: adminEmail,
      subject,
      html: htmlContent,
      replyTo: email || undefined,
    });

    if (error) {
      console.warn(`[Resend Mailer Warning] Lỗi gửi email tới Admin (${adminEmail}):`, error.message);
      return false;
    }

    console.log(`[Resend Mailer] ✅ Đã gửi email thông báo tới Admin (${adminEmail}) thành công!`);
    return true;
  } catch (error: any) {
    console.warn(
      `[Resend Mailer Warning] Lỗi ngoại lệ khi gửi email tới Admin (${adminEmail}):`,
      error?.message || error
    );
    return false;
  }
}

export const sendAdminNotificationEmail = sendAdminNotification;
export const notifyAdminNewSubmission = sendAdminNotification;
