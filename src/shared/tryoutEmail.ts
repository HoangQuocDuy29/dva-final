export const TRYOUT_COURT_ADDRESS = '155 Trường Chinh, Thanh Xuân, Hà Nội';
export const TRYOUT_COURT_MAPS_URL = 'https://maps.app.goo.gl/hkqofjzojcUoE39M7';
export const TRYOUT_COURT_GATE_IMAGE =
  'https://res.cloudinary.com/dsezvx7xf/image/upload/v1793177550/4855e108-747c-4517-8f29-eb130796805b.png';
export const TRYOUT_COURT_GUIDE_IMAGE =
  'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792751386/dcf3e900-0bc9-4d37-9bce-045b3f7df0f3.png';

export const TRYOUT_TIME_PRESETS = ['18:00 - 19:00', '13:30 - 14:30'] as const;

export interface TryoutDayInfo {
  valid: boolean;
  dayIndex: number;
  viDay: string;
  enDay: string;
  combinedLabel: string;
  formattedDate: string;
  isSunday: boolean;
  isStandardTryoutDay: boolean;
  recommendedSlot: '18:00 - 19:00' | '13:30 - 14:30';
}

const VI_DAY_NAMES = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

const EN_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const STANDARD_TRYOUT_DAY_INDICES = new Set([0, 1, 3, 5, 6]); // Sun, Mon, Wed, Fri, Sat

/**
 * Timezone-safe YYYY-MM-DD parser returning Vietnamese/English weekday info
 * and the matching DVA Try-Out preset slot.
 */
export function getTryoutDayInfo(dateStr?: string): TryoutDayInfo {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || '').trim());
  if (!m) {
    return {
      valid: false,
      dayIndex: -1,
      viDay: 'Chưa chọn ngày',
      enDay: 'Not selected',
      combinedLabel: '—',
      formattedDate: dateStr || '—',
      isSunday: false,
      isStandardTryoutDay: false,
      recommendedSlot: '18:00 - 19:00',
    };
  }

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const valid =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;

  if (!valid) {
    return {
      valid: false,
      dayIndex: -1,
      viDay: 'Ngày không hợp lệ',
      enDay: 'Invalid date',
      combinedLabel: '—',
      formattedDate: dateStr || '—',
      isSunday: false,
      isStandardTryoutDay: false,
      recommendedSlot: '18:00 - 19:00',
    };
  }

  const dayIndex = utc.getUTCDay();
  const viDay = VI_DAY_NAMES[dayIndex];
  const enDay = EN_DAY_NAMES[dayIndex];
  const isSunday = dayIndex === 0;

  return {
    valid: true,
    dayIndex,
    viDay,
    enDay,
    combinedLabel: `${viDay} (${enDay})`,
    formattedDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    isSunday,
    isStandardTryoutDay: STANDARD_TRYOUT_DAY_INDICES.has(dayIndex),
    recommendedSlot: isSunday ? '13:30 - 14:30' : '18:00 - 19:00',
  };
}

/** Returns the next upcoming Mon/Wed/Fri/Sat/Sun date in YYYY-MM-DD (local time). */
export function getNextTryoutDateString(baseDate: Date = new Date()): string {
  const cursor = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
  for (let i = 0; i < 7; i++) {
    if (STANDARD_TRYOUT_DAY_INDICES.has(cursor.getDay())) {
      break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  const y = cursor.getFullYear();
  const m = String(cursor.getMonth() + 1).padStart(2, '0');
  const d = String(cursor.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function escapeTryoutHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPositionLabel(pos?: string): string {
  switch ((pos || '').toUpperCase()) {
    case 'OH':
      return 'OH — Chủ công (Outside Hitter)';
    case 'OP':
      return 'OP — Đối chuyền (Opposite Spiker)';
    case 'MB':
      return 'MB — Phụ công (Middle Blocker)';
    case 'S':
      return 'S — Chuyền hai (Setter)';
    case 'L':
      return 'L — Libero';
    default:
      return pos || 'OH';
  }
}

function computeWarmupCheckInTime(timeSlot?: string): string {
  const match = (timeSlot || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '15 phút trước giờ test / 15 mins prior';
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10) - 15;
  if (m < 0) {
    m += 60;
    h = (h + 23) % 24;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface TryoutEmailRenderInput {
  fullName: string;
  position: string;
  level?: string;
  phone?: string;
  toEmail?: string;
  date: string; // YYYY-MM-DD
  dayLabel?: string;
  timeSlot: string;
  notes?: string;
  paymentStatus?: 'PENDING' | 'PAID' | string;
  courtAddress?: string;
  hotline?: string;
}

/**
 * Shared HTML generator for Try-Out Schedule Invitation email.
 * Used identically by Resend (server) and Live Email Preview (Admin modal).
 */
export function buildTryoutInvitationEmailHtml(input: TryoutEmailRenderInput): string {
  const dayInfo = getTryoutDayInfo(input.date);
  const displayDay = input.dayLabel?.trim() || dayInfo.combinedLabel;
  const displayDate = dayInfo.valid ? dayInfo.formattedDate : input.date || '—';
  const fullTimeDisplay = dayInfo.valid
    ? `${displayDay} · ${displayDate}`
    : displayDate;

  const checkInTime = computeWarmupCheckInTime(input.timeSlot);
  const addressText = (input.courtAddress || '').trim() || TRYOUT_COURT_ADDRESS;
  const hotline = (input.hotline || '').trim() || '0768 299 329';
  const isPaid = String(input.paymentStatus || '').toUpperCase() === 'PAID';
  const feeBadgeText = isPaid
    ? 'ĐÃ ĐÓNG LỆ PHÍ / PAID ✓'
    : 'CHƯA ĐÓNG / PENDING (Thanh toán tại sân hoặc chuyển khoản theo hướng dẫn)';
  const feeBadgeColor = isPaid ? '#4ade80' : '#fbbf24';

  const trimmedNotes = (input.notes || '').trim();
  const formattedNotesHtml = trimmedNotes
    ? escapeTryoutHtml(trimmedNotes).replace(/\r?\n/g, '<br />')
    : 'Vui lòng mang giày bóng chuyền indoor đế bằng (không để lại vết đen trên thảm Taraflex), trang phục thi đấu thoải mái và có mặt trước 15 phút để khởi động cùng HLV.<br /><span style="font-size:12px;color:#94a3b8;font-style:italic;">Please wear clean non-marking indoor volleyball shoes, athletic sportswear, and arrive 15 minutes early for warm-up with the Coaching Staff.</span>';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thư Mời Tham Gia Try-Out / Try-Out Invitation - ${escapeTryoutHtml(input.fullName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#111827;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">

          <!-- Header Banner (Gradient Đỏ - Cam Thể Thao DVA) -->
          <tr>
            <td style="background:linear-gradient(135deg, #b91c1c 0%, #ea580c 55%, #f97316 100%);padding:28px 28px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:#ffedd5;margin-bottom:6px;">
                DVA VOLLEYBALL CLUB · HANOI
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.4px;">
                THƯ MỜI THAM GIA TRY-OUT
              </h1>
              <div style="font-size:13px;font-weight:700;color:#fed7aa;margin-top:4px;letter-spacing:0.6px;">
                OFFICIAL SQUAD TRY-OUT INVITATION
              </div>
              <div style="margin-top:14px;">
                <span style="display:inline-block;background:rgba(11,15,25,0.45);padding:7px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.28);font-family:monospace;font-size:13px;color:#ffffff;font-weight:700;">
                  📅 ${escapeTryoutHtml(fullTimeDisplay)} · ⏰ ${escapeTryoutHtml(input.timeSlot)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:26px 24px;">
              <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#f8fafc;">
                Xin chào / Dear <strong>${escapeTryoutHtml(input.fullName)}</strong>,
              </p>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                Ban chuyên môn &amp; Huấn luyện viên trưởng <strong style="color:#fb923c;">DVA Volleyball Club</strong> trân trọng mời bạn đến tham dự buổi kiểm tra năng lực (Try-Out) tuyển chọn thành viên chính thức của CLB theo lịch hẹn dưới đây:
              </p>
              <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#94a3b8;font-style:italic;">
                <strong style="color:#fb923c;">DVA Volleyball Club</strong> Coaching Staff cordially invites you to attend our official squad Try-Out evaluation session as scheduled below:
              </p>

              <!-- Bảng thông tin lịch hẹn Try-Out (Song ngữ) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:14px;padding:18px;margin-bottom:20px;">
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Họ tên VĐV<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Athlete Name</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                    ${escapeTryoutHtml(input.fullName)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Vị trí đăng ký<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Registered Position</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#fb923c;text-align:right;">
                    ${escapeTryoutHtml(formatPositionLabel(input.position))}
                  </td>
                </tr>
                ${
                  input.level
                    ? `<tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Nhóm trình độ dự kiến<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Target Division</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#38bdf8;text-align:right;">
                    ${escapeTryoutHtml(input.level)}
                  </td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Ngày &amp; Thứ hẹn Try-Out<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Try-Out Date &amp; Day</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:800;color:#f8fafc;text-align:right;">
                    ${escapeTryoutHtml(fullTimeDisplay)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Khung giờ đánh giá<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Session Time</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:800;color:#fb923c;text-align:right;font-family:monospace;">
                    ${escapeTryoutHtml(input.timeSlot)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Giờ có mặt khởi động<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Warm-Up Check-In</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#38bdf8;text-align:right;font-family:monospace;">
                    ${escapeTryoutHtml(checkInTime)} (Trước 15 phút)
                  </td>
                </tr>
                <tr>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                    Địa điểm sân tập<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Training Venue</span>
                  </td>
                  <td style="padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                    Nhà thi đấu ${escapeTryoutHtml(addressText)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0 2px;font-size:13px;color:#94a3b8;">
                    Trạng thái lệ phí Try-Out<br /><span style="font-size:11px;color:#64748b;font-style:italic;">Try-Out Fee Status</span>
                  </td>
                  <td style="padding:10px 0 2px;font-size:12px;font-weight:800;color:${feeBadgeColor};text-align:right;">
                    ${escapeTryoutHtml(feeBadgeText)}
                  </td>
                </tr>
              </table>

              <!-- GHI CHÚ RIÊNG CỦA HLV / ADMIN -->
              <div style="background-color:rgba(249,115,22,0.12);border-left:4px solid #f97316;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#fdba74;margin-bottom:8px;">
                  📝 LỜI NHẮN TỪ HLV / COACH &amp; ADMIN NOTES
                </div>
                <p style="margin:0;font-size:13.5px;line-height:1.65;color:#fff7ed;">
                  ${formattedNotesHtml}
                </p>
              </div>

              <!-- QUY ĐỊNH & CHUẨN BỊ BUỔI TRY-OUT -->
              <div style="background-color:rgba(14,165,233,0.1);border-left:4px solid #38bdf8;border-radius:12px;padding:16px 20px;margin-bottom:22px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#7dd3fc;margin-bottom:8px;">
                  🏐 NỘI DUNG ĐÁNH GIÁ &amp; CHUẨN BỊ / ASSESSMENT &amp; PREPARATION
                </div>
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.65;color:#e0f2fe;">
                  <li><strong>Nội dung test (60 phút):</strong> Đo tầm bật nhảy &amp; thể lực · Đệm bước 1, chuyền 2 &amp; phát bóng · Đánh giá thực chiến theo vị trí (${escapeTryoutHtml(input.position)}) · Tinh thần đồng đội.</li>
                  <li><strong>Trang phục &amp; giày sân thảm:</strong> Bắt buộc mang giày bóng chuyền chuyên dụng đế cao su sạch (non-marking) để bảo vệ mặt thảm Taraflex 7.5mm.</li>
                  <li><strong>Giờ giấc:</strong> Vui lòng có mặt trước giờ hẹn <strong>15 phút</strong> (${escapeTryoutHtml(checkInTime)}) để điểm danh và khởi động kỹ tránh chấn thương.</li>
                </ul>
                <p style="margin:10px 0 0;font-size:12px;line-height:1.55;color:#94a3b8;font-style:italic;">
                  <strong>EN:</strong> Please arrive 15 mins early (${escapeTryoutHtml(checkInTime)}) wearing indoor non-marking volleyball shoes for the 60-minute assessment (vertical reach &amp; agility, ball control, position play, and team discipline).
                </p>
              </div>

              <!-- MỤC CHỈ ĐƯỜNG, GỬI XE & HƯỚNG DẪN VÀO NHÀ THI ĐẤU (GIỐNG CẤU TRÚC GUEST SESSION EMAIL) -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:22px;">
                <h3 style="margin:0 0 4px;font-size:15px;font-weight:800;color:#f8fafc;letter-spacing:0.4px;">
                  📍 HƯỚNG DẪN DI CHUYỂN, GỬI XE &amp; VÀO NHÀ THI ĐẤU
                </h3>
                <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:12px;font-style:italic;">
                  VENUE DIRECTIONS, PARKING &amp; ENTRANCE GUIDE
                </div>

                <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  🏢 <strong>Địa chỉ sân tập / Venue Address:</strong> <span style="color:#fb923c;font-weight:700;">Nhà thi đấu ${escapeTryoutHtml(addressText)}</span>
                </p>

                <!-- Hướng dẫn từng bước: Chỉ đường, Gửi xe, Vào nhà thi đấu -->
                <div style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:13px;line-height:1.65;color:#cbd5e1;">
                  <div style="margin-bottom:6px;">
                    <strong>1. Chỉ đường đến cổng:</strong> Di chuyển đến số <strong>155 Trường Chinh, Thanh Xuân, Hà Nội</strong> (Cổng Khu Thể Thao / Nhà thi đấu Bộ Tư Lệnh Thông Tin).
                  </div>
                  <div style="margin-bottom:6px;">
                    <strong>2. Gửi xe:</strong> Đi thẳng qua cổng bảo vệ vào bãi gửi xe ngay trong khuôn viên nhà thi đấu (làm theo hướng dẫn của nhân viên bảo vệ).
                  </div>
                  <div>
                    <strong>3. Vào nhà thi đấu:</strong> Từ bãi xe đi theo sơ đồ chỉ dẫn bên dưới để vào thẳng sân bóng chuyền thảm Taraflex DVA và báo danh với HLV Quốc Duy.
                  </div>
                  <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #1e293b;font-size:12px;color:#94a3b8;font-style:italic;">
                    <strong>EN:</strong> Enter Gate <strong>155 Truong Chinh</strong>, park inside the arena parking lot per security guidance, then follow the court route diagram below to enter the indoor volleyball hall.
                  </div>
                </div>

                <!-- Nút bấm Google Maps -->
                <div style="text-align:center;margin:14px 0 18px 0;">
                  <a href="${escapeTryoutHtml(TRYOUT_COURT_MAPS_URL)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #dc2626 0%, #f97316 100%);color:#ffffff;font-weight:800;font-size:14px;padding:13px 26px;border-radius:10px;text-decoration:none;box-shadow:0 4px 14px rgba(249,115,22,0.4);">
                    🗺️ Mở Chỉ Đường Trên Google Maps / Open in Google Maps
                  </a>
                </div>

                <!-- Khối ảnh 1: Cổng vào sân 155 Trường Chinh -->
                <div style="margin:14px 0;background:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:12px;text-align:center;">
                  <a href="${escapeTryoutHtml(TRYOUT_COURT_GATE_IMAGE)}" target="_blank" style="text-decoration:none;display:block;">
                    <img src="${escapeTryoutHtml(TRYOUT_COURT_GATE_IMAGE)}" alt="Cổng vào sân 155 Trường Chinh" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;border:0;" />
                  </a>
                  <p style="font-size:12.5px;color:#cbd5e1;margin-top:10px;margin-bottom:2px;font-weight:600;">
                    🚪 Hình ảnh cổng vào địa điểm thi đấu: 155 Trường Chinh, Thanh Xuân, Hà Nội
                  </p>
                  <p style="font-size:11.5px;color:#94a3b8;margin:0;font-style:italic;">
                    Main Entrance Gate: 155 Truong Chinh, Thanh Xuan, Hanoi
                  </p>
                </div>

                <!-- Khối ảnh 2: Sơ đồ chi tiết lối vào sân -->
                <div style="margin:14px 0 0;background:#0b0f19;border:1px solid #1e293b;border-radius:10px;padding:12px;text-align:center;">
                  <a href="${escapeTryoutHtml(TRYOUT_COURT_GUIDE_IMAGE)}" target="_blank" style="text-decoration:none;display:block;">
                    <img src="${escapeTryoutHtml(TRYOUT_COURT_GUIDE_IMAGE)}" alt="Sơ đồ lối vào sân bóng" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;border:0;" />
                  </a>
                  <p style="font-size:12.5px;color:#cbd5e1;margin-top:10px;margin-bottom:2px;font-weight:600;">
                    🗺️ Sơ đồ chi tiết lối di chuyển từ cổng vào thẳng sân bóng
                  </p>
                  <p style="font-size:11.5px;color:#94a3b8;margin:0;font-style:italic;">
                    Detailed route diagram from the main gate to the volleyball court
                  </p>
                </div>
              </div>

              <!-- KÊNH HỖ TRỢ TRỰC TIẾP (QUỐC DUY / NATHAN) -->
              <div style="background-color:rgba(249,115,22,0.08);border-left:4px solid #ea580c;border-radius:12px;padding:16px 20px;margin-bottom:22px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#fdba74;margin-bottom:10px;">
                  ℹ️ XÁC NHẬN LỊCH &amp; HỖ TRỢ TRỰC TIẾP / CONFIRMATION &amp; SUPPORT
                </div>
                <p style="margin:0 0 8px;font-size:13.5px;line-height:1.6;color:#ffedd5;">
                  <strong>VI:</strong> Nếu bạn có thay đổi lịch đột xuất hoặc cần hỗ trợ tìm đường vào nhà thi đấu, vui lòng nhắn trực tiếp cho HLV <strong>Hoàng Quốc Duy (Nathan)</strong>:
                </p>
                <ul style="margin:0 0 10px;padding-left:20px;font-size:13px;line-height:1.7;color:#fed7aa;">
                  <li>Zalo / Hotline: <a href="tel:${escapeTryoutHtml(hotline.replace(/\s+/g, ''))}" style="color:#fb923c;font-weight:700;text-decoration:none;">${escapeTryoutHtml(hotline)}</a></li>
                  <li>WhatsApp: <a href="https://wa.me/84768299329" target="_blank" style="color:#fb923c;font-weight:700;text-decoration:none;">+84 768 299 329</a></li>
                  <li>Instagram: <a href="https://instagram.com/_nathan.hq_" target="_blank" style="color:#fb923c;font-weight:700;text-decoration:none;">@_nathan.hq_</a></li>
                </ul>
                <p style="margin:0;font-size:12px;line-height:1.55;color:#94a3b8;font-style:italic;">
                  <strong>EN:</strong> If you need to reschedule or require directions upon arrival, please contact Coach Quoc Duy (Nathan) via the channels above.
                </p>
              </div>

              <!-- Lời chúc -->
              <div style="margin:0;padding:14px;background:#0b0f19;border-radius:12px;text-align:center;border:1px dashed #334155;">
                <p style="margin:0 0 6px;font-size:13.5px;line-height:1.6;color:#cbd5e1;font-weight:600;">
                  Chúc bạn tự tin thể hiện hết phong độ và bùng nổ trên sân trong buổi Try-Out cùng DVA Volleyball Club! 🏐🔥
                </p>
                <p style="margin:0;font-size:12.5px;line-height:1.6;color:#94a3b8;font-style:italic;">
                  Give it your best shot on the court — we look forward to seeing you at DVA Try-Out! 🏐🔥
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#090d16;padding:20px 28px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} DVA Volleyball Club · ${escapeTryoutHtml(addressText)}<br />
              Hotline / Zalo: ${escapeTryoutHtml(hotline)} · Instagram: @_nathan.hq_
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
// TRY-OUT RESULT EMAIL (APPROVED WITH LEVEL-BASED GROUP LINK / REJECTED WITH COACH NOTES)
// ============================================================================
export const TRYOUT_ZALO_JUNIOR_URL = 'https://zalo.me/g/lzwxat128';
export const TRYOUT_ZALO_SENIOR_URL = 'https://zalo.me/g/ixgpvs546';
export const TRYOUT_IG_COACH_HANDLE = '@_nathan.hq_';
export const TRYOUT_IG_COACH_URL = 'https://instagram.com/_nathan.hq_';

export const TRYOUT_CRITERIA_LABELS = [
  { key: 'physical', vi: 'Thể lực & Sức bật', en: 'Physical & Vertical Jump' },
  { key: 'technique', vi: 'Kỹ thuật cơ bản (Đệm / Chuyền / Phát)', en: 'Fundamental Ball Control' },
  { key: 'tactical', vi: 'Tư duy chiến thuật & Vị trí sở trường', en: 'Tactical IQ & Position Play' },
  { key: 'attitude', vi: 'Thái độ & Tinh thần đồng đội', en: 'Discipline & Team Spirit' },
] as const;

export interface TryoutResultEmailRenderInput {
  fullName: string;
  position: string;
  level: 'SENIOR' | 'JUNIOR' | 'YOUTH' | string;
  outcome: 'APPROVED' | 'REJECTED';
  scores?: {
    physical?: number;
    technique?: number;
    tactical?: number;
    attitude?: number;
    total?: number;
  } | null;
  coachNotes?: string;
  hotline?: string;
}

function renderScorecardRowsHtml(scores?: TryoutResultEmailRenderInput['scores']): string {
  if (!scores) return '';
  const vals = TRYOUT_CRITERIA_LABELS.map((c) => {
    const v = Number((scores as Record<string, unknown>)[c.key]) || 0;
    return { ...c, val: v };
  });
  const total = Number(scores.total) || vals.reduce((s, r) => s + r.val, 0);
  if (total <= 0) return '';

  return `
    <div style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:14px;padding:18px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#38bdf8;">
          📊 BẢNG ĐIỂM ĐÁNH GIÁ CHUYÊN MÔN / TRY-OUT SCORECARD
        </span>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${vals
          .map(
            (r) => `
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:12.5px;color:#cbd5e1;">
              ${escapeTryoutHtml(r.vi)}<br /><span style="font-size:11px;color:#64748b;font-style:italic;">${escapeTryoutHtml(r.en)}</span>
            </td>
            <td style="padding:7px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:800;color:#fbbf24;text-align:right;font-family:monospace;">
              ${r.val > 0 ? `${r.val} / 5` : '—'}
            </td>
          </tr>`
          )
          .join('')}
        <tr>
          <td style="padding:10px 0 2px;font-size:13px;font-weight:800;color:#ffffff;">
            Tổng điểm đánh giá / Total Score
          </td>
          <td style="padding:10px 0 2px;font-size:16px;font-weight:900;color:#4ade80;text-align:right;font-family:monospace;">
            ${total} / 20
          </td>
        </tr>
      </table>
    </div>
  `.trim();
}

function renderApprovedGroupBoxHtml(levelRaw: string): string {
  const lvl = (levelRaw || 'JUNIOR').toUpperCase();

  if (lvl === 'SENIOR') {
    return `
      <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.45);border-radius:16px;padding:20px;margin-bottom:20px;text-align:center;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#6ee7b7;margin-bottom:6px;">
          💬 NHÓM ZALO CHÍNH THỨC — ĐỘI HÌNH SENIOR DVA
        </div>
        <div style="font-size:12px;color:#cbd5e1;margin-bottom:14px;line-height:1.55;">
          Vui lòng tham gia nhóm Zalo đội hình <strong>SENIOR</strong> để cập nhật lịch tập luyện, chia đội thi đấu và thông báo nội bộ từ Ban Huấn luyện:<br />
          <span style="font-size:11px;color:#94a3b8;font-style:italic;">Please join our official SENIOR squad Zalo group for training schedules and team announcements:</span>
        </div>
        <a href="${TRYOUT_ZALO_SENIOR_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0284c7 0%,#2563eb 100%);color:#ffffff;font-weight:800;font-size:14px;padding:13px 26px;border-radius:10px;text-decoration:none;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
          🏐 Tham Gia Nhóm Zalo Senior / Join Senior Zalo Group
        </a>
        <div style="margin-top:10px;font-size:11px;font-family:monospace;color:#7dd3fc;">
          ${TRYOUT_ZALO_SENIOR_URL}
        </div>
      </div>
    `.trim();
  }

  if (lvl === 'YOUTH') {
    return `
      <div style="background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.45);border-radius:16px;padding:20px;margin-bottom:20px;text-align:center;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#d8b4fe;margin-bottom:6px;">
          📸 THAM GIA NHÓM ĐỘI HÌNH YOUTH TRÊN INSTAGRAM
        </div>
        <div style="font-size:13px;color:#e2e8f0;margin-bottom:14px;line-height:1.6;">
          Vui lòng <strong>follow Instagram ${TRYOUT_IG_COACH_HANDLE}</strong> và <strong>nhắn tin trực tiếp (DM)</strong> họ tên của bạn để <strong>Coach Nathan</strong> thêm bạn vào nhóm chat chính thức của đội hình <strong>YOUTH</strong> trên Instagram!<br />
          <span style="font-size:11.5px;color:#cbd5e1;font-style:italic;">Please follow Instagram <strong>${TRYOUT_IG_COACH_HANDLE}</strong> and send a Direct Message with your full name so Coach Nathan can add you to the official YOUTH squad group chat!</span>
        </div>
        <a href="${TRYOUT_IG_COACH_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#9333ea 0%,#e11d48 60%,#f59e0b 100%);color:#ffffff;font-weight:800;font-size:14px;padding:13px 26px;border-radius:10px;text-decoration:none;box-shadow:0 4px 14px rgba(225,29,72,0.35);">
          📲 Follow &amp; Nhắn Tin Instagram ${TRYOUT_IG_COACH_HANDLE}
        </a>
      </div>
    `.trim();
  }

  // Default: JUNIOR
  return `
    <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.45);border-radius:16px;padding:20px;margin-bottom:20px;text-align:center;">
      <div style="font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#6ee7b7;margin-bottom:6px;">
        💬 NHÓM ZALO CHÍNH THỨC — ĐỘI HÌNH JUNIOR DVA
      </div>
      <div style="font-size:12px;color:#cbd5e1;margin-bottom:14px;line-height:1.55;">
        Vui lòng tham gia nhóm Zalo đội hình <strong>JUNIOR</strong> để cập nhật lịch tập luyện, ghép đội giao lưu và thông báo nội bộ từ Ban Huấn luyện:<br />
        <span style="font-size:11px;color:#94a3b8;font-style:italic;">Please join our official JUNIOR squad Zalo group for training schedules and match announcements:</span>
      </div>
      <a href="${TRYOUT_ZALO_JUNIOR_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0284c7 0%,#2563eb 100%);color:#ffffff;font-weight:800;font-size:14px;padding:13px 26px;border-radius:10px;text-decoration:none;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
        🏐 Tham Gia Nhóm Zalo Junior / Join Junior Zalo Group
      </a>
      <div style="margin-top:10px;font-size:11px;font-family:monospace;color:#7dd3fc;">
        ${TRYOUT_ZALO_JUNIOR_URL}
      </div>
    </div>
  `.trim();
}

export function buildTryoutResultEmailHtml(input: TryoutResultEmailRenderInput): string {
  const isApproved = input.outcome === 'APPROVED';
  const hotline = (input.hotline || '').trim() || '0768 299 329';
  const levelUpper = (input.level || 'JUNIOR').toUpperCase();
  const cleanNotes = (input.coachNotes || '').trim();
  const formattedNotes = cleanNotes
    ? escapeTryoutHtml(cleanNotes).replace(/\r?\n/g, '<br />')
    : isApproved
      ? 'Thể hiện tinh thần thi đấu tích cực và đạt chuẩn chuyên môn gia nhập đội hình DVA.'
      : 'Tiếp tục trau dồi kỹ thuật bước 1, kiểm soát bóng và thể lực để sẵn sàng cho đợt tuyển chọn tiếp theo cùng CLB.';

  const headerGradient = isApproved
    ? 'linear-gradient(135deg, #059669 0%, #10b981 55%, #047857 100%)'
    : 'linear-gradient(135deg, #334155 0%, #1e293b 60%, #0f172a 100%)';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kết Quả Đánh Giá Try-Out / Try-Out Evaluation Result - ${escapeTryoutHtml(input.fullName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#111827;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">

          <!-- Header -->
          <tr>
            <td style="background:${headerGradient};padding:28px 26px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:#e2e8f0;margin-bottom:6px;">
                DVA VOLLEYBALL CLUB · HANOI
              </div>
              <h1 style="margin:0;font-size:21px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">
                ${isApproved ? '🎉 CHÚC MỪNG! BẠN ĐÃ TRÚNG TUYỂN DVA' : '🏐 THÔNG BÁO KẾT QUẢ BUỔI TRY-OUT'}
              </h1>
              <div style="font-size:12.5px;font-weight:700;color:#f1f5f9;margin-top:5px;">
                ${isApproved ? `OFFICIAL SQUAD ACCEPTANCE · ${escapeTryoutHtml(levelUpper)} DIVISION` : 'THANK YOU & COACHING EVALUATION FEEDBACK'}
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:26px 24px;">
              <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#f8fafc;">
                Xin chào / Dear <strong>${escapeTryoutHtml(input.fullName)}</strong>,
              </p>

              ${
                isApproved
                  ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.65;color:#cbd5e1;">
                      Chúc mừng bạn đã chính thức vượt qua vòng đánh giá năng lực và được tiếp nhận vào đội hình <strong style="color:#4ade80;">${escapeTryoutHtml(levelUpper)}</strong> của <strong>DVA Volleyball Club</strong> (Vị trí: <strong>${escapeTryoutHtml(formatPositionLabel(input.position))}</strong>)!
                    </p>
                    <p style="margin:0 0 20px;font-size:12.5px;line-height:1.6;color:#94a3b8;font-style:italic;">
                      Congratulations! You have officially been accepted into the <strong>${escapeTryoutHtml(levelUpper)}</strong> squad at DVA Volleyball Club.
                    </p>`
                  : `<p style="margin:0 0 8px;font-size:14px;line-height:1.65;color:#cbd5e1;">
                      Ban Huấn luyện <strong>DVA Volleyball Club</strong> chân thành cảm ơn bạn đã dành thời gian tham gia buổi đánh giá Try-Out vừa qua. Sau khi tổng hợp kết quả chuyên môn, hiện tại bạn chưa đạt đủ điểm chuẩn để gia nhập đội hình chính thức ở đợt này.
                    </p>
                    <p style="margin:0 0 20px;font-size:12.5px;line-height:1.6;color:#94a3b8;font-style:italic;">
                      Thank you for attending the DVA Volleyball Club Try-Out session. While you were not selected for the active squad in this cycle, please review our coaching staff's evaluation feedback below to keep improving.
                    </p>`
              }

              ${renderScorecardRowsHtml(input.scores)}

              <!-- Coach Evaluation Notes -->
              <div style="background-color:${isApproved ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.1)'};border-left:4px solid ${isApproved ? '#10b981' : '#f59e0b'};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                <div style="font-size:12.5px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:${isApproved ? '#6ee7b7' : '#fcd34d'};margin-bottom:8px;">
                  📝 ${isApproved ? 'NHẬN XÉT CỦA HLV / COACH EVALUATION' : 'NHẬN XÉT CHUYÊN MÔN & ĐIỂM CẦN CẢI THIỆN / COACH FEEDBACK'}
                </div>
                <p style="margin:0;font-size:13.5px;line-height:1.65;color:#f8fafc;">
                  ${formattedNotes}
                </p>
              </div>

              ${isApproved ? renderApprovedGroupBoxHtml(levelUpper) : ''}

              ${
                !isApproved
                  ? `<div style="background-color:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:13px;line-height:1.6;color:#cbd5e1;">
                      🏐 <strong>Gợi ý từ DVA:</strong> Bạn vẫn có thể tham gia các khóa <strong>Huấn luyện Kỹ thuật &amp; Giao lưu Scrimmage</strong> hàng tuần tại DVA (155 Trường Chinh) để nâng cao cảm giác bóng và đăng ký Try-Out lại ở đợt tiếp theo!
                    </div>`
                  : ''
              }

              <!-- Support Box -->
              <div style="padding:14px 18px;background:#0b0f19;border-radius:12px;border:1px solid #1e293b;font-size:12.5px;line-height:1.6;color:#94a3b8;text-align:center;">
                📞 Hotline / Zalo Hỗ trợ: <strong style="color:#f8fafc;">${escapeTryoutHtml(hotline)}</strong> · Instagram: <a href="${TRYOUT_IG_COACH_URL}" target="_blank" style="color:#fb923c;font-weight:700;text-decoration:none;">${TRYOUT_IG_COACH_HANDLE}</a><br />
                📍 Địa điểm sân tập: ${escapeTryoutHtml(TRYOUT_COURT_ADDRESS)}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#090d16;padding:18px 26px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} DVA Volleyball Club · ${escapeTryoutHtml(TRYOUT_COURT_ADDRESS)}
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
