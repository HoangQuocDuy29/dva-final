import nodemailer from 'nodemailer';

// ============================================================================
// KHU VỰC TÙY CHỈNH NỘI DUNG EMAIL & ẢNH HƯỚNG DẪN VÀO SÂN (CHỈNH SỬA TẠI ĐÂY)
// ============================================================================
export const EMAIL_CUSTOM_CONFIG = {
  /**
   * Link ảnh sơ đồ / hướng dẫn đường vào sân (dán link ảnh Cloudinary hoặc link ảnh online vào đây).
   * Nếu để chuỗi rỗng '', phần ảnh hướng dẫn sẽ tự động ẩn đi.
   * Bạn cũng có thể cấu hình riêng từng sân theo mã sân ở bên dưới.
   */
  defaultGuideImageUrl: process.env.COURT_GUIDE_IMAGE_URL || '',

  courtGuideImages: {
    'court-btl': 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792751386/dcf3e900-0bc9-4d37-9bce-045b3f7df0f3.png', // Ảnh hướng dẫn vào sân BTL Thông Tin
    'court-thecong': '', // Dán link ảnh hướng dẫn vào sân Thể Công (nếu có)
    'court-mydinh': '',  // Dán link ảnh hướng dẫn vào sân Mỹ Đình (nếu có)
  } as Record<string, string>,

  /**
   * Link Google Maps chỉ đường riêng cho từng sân
   */
  courtMapsUrls: {
    'court-btl': 'https://maps.app.goo.gl/medo3LwqDRUS5zNc7', // Link Google Maps sân BTL Thông Tin
    'court-thecong': '', // Dán link Google Maps sân Thể Công (nếu có)
    'court-mydinh': '',  // Dán link Google Maps sân Mỹ Đình (nếu có)
  } as Record<string, string>,

  /**
   * Lời chào / lời dẫn mở đầu email
   */
  introMessage:
    'Cảm ơn bạn đã tin tưởng và lựa chọn hệ thống sân bóng chuyền tiêu chuẩn thi đấu của DVA Volleyball Club. Hệ thống đã nhận được khoản thanh toán của bạn và xác nhận giữ sân thành công với thông tin chi tiết dưới đây:',

  /**
   * Lời chúc gửi tới khách hàng ở cuối bức thư
   */
  wishMessage:
    'Chúc bạn và đồng đội có những pha bóng đẹp mắt, tràn đầy năng lượng và một buổi thi đấu bùng nổ tại DVA Volleyball Club! 🏐🔥',
};

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
  transferContent?: string | null;
  notes?: string | null;
}

export interface CourtEmailPayload {
  id?: string;
  name: string;
  address?: string | null;
  floorType?: string | null;
  imageUrl?: string | null;
}

/**
 * Extracts the start time (HH:mm) from `timeSlot` (e.g. "17:30 - 19:30") or `startTime`
 * and subtracts 15 minutes to compute the recommended check-in time (e.g. "17:15").
 */
export function calculateCheckInTime(timeSlotOrStart?: string, fallbackStartTime?: string): string {
  const source = (timeSlotOrStart || fallbackStartTime || '').trim();
  const match = source.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return 'trước giờ ca tập 15 phút';
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 'trước giờ ca tập 15 phút';
  }

  const totalMinutes = (hours * 60 + minutes - 15 + 24 * 60) % (24 * 60);
  const checkInHour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const checkInMinute = String(totalMinutes % 60).padStart(2, '0');
  return `${checkInHour}:${checkInMinute}`;
}

/**
 * Trích xuất động giờ bắt đầu (`startTime`) và giờ kết thúc (`endTime`) từ `timeSlot` hoặc từ các trường của đơn đặt sân.
 */
export function extractStartAndEndTime(
  timeSlot?: string,
  fallbackStart?: string,
  fallbackEnd?: string
): { startTime: string; endTime: string } {
  const matches = (timeSlot || '').match(/(\d{1,2}:\d{2})/g);
  const startTime = fallbackStart || (matches && matches[0]) || '17:30';
  const endTime = fallbackEnd || (matches && matches[1]) || '19:30';
  return { startTime, endTime };
}

function createMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
      : port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gửi email xác nhận đặt sân thành công kèm hướng dẫn check-in.
 * Được bọc hoàn toàn trong try/catch bất đồng bộ để đảm bảo không bao giờ
 * làm gián đoạn hoặc crash luồng xử lý thanh toán của server.
 */
export async function sendBookingConfirmationEmail(
  booking: BookingEmailPayload,
  court?: CourtEmailPayload | null
): Promise<boolean> {
  try {
    if (!booking?.customerEmail) {
      console.warn('[Mailer] Bỏ qua gửi email vì đơn đặt sân không có customerEmail.');
      return false;
    }

    const smtpUser = process.env.SMTP_USER || 'no-reply@dvavolleyball.vn';
    const transporter = createMailTransporter();
    const fromName = process.env.EMAIL_FROM_NAME || 'DVA Volleyball Club';
    const hotline =
      process.env.HOTLINE ||
      process.env.SUPPORT_HOTLINE ||
      process.env.CLUB_HOTLINE ||
      '0768 299 329';

    const baseCourtName = court?.name || booking.courtName || 'Sân bóng chuyền DVA';
    const courtName = booking.subCourt ? `${baseCourtName} - ${booking.subCourt}` : baseCourtName;
    const courtAddress =
      court?.address ||
      process.env.CLUB_ADDRESS ||
      'DVA Sports Center, Hà Nội (BTL Thông Tin / Thể Công / Mỹ Đình)';

    const rawCourtId = (court?.id || booking.courtId || '').toLowerCase();
    const isBtlCourt =
      rawCourtId === 'court-btl' ||
      /btl|thông tin|thong tin/i.test(courtName) ||
      /^DVA-BTL-/i.test(booking.bookingCode || '');
    const resolvedCourtKey = isBtlCourt ? 'court-btl' : rawCourtId;

    const mapsQuery = encodeURIComponent(`${baseCourtName} ${courtAddress}`);
    const mapsUrl =
      (resolvedCourtKey && EMAIL_CUSTOM_CONFIG.courtMapsUrls[resolvedCourtKey]) ||
      process.env.CLUB_MAPS_URL ||
      `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    const resolvedDate = booking.bookingDate || booking.date || '';
    const { startTime, endTime } = extractStartAndEndTime(
      booking.timeSlot,
      booking.startTime,
      booking.endTime
    );
    const resolvedTimeSlot = booking.timeSlot || `${startTime} - ${endTime}`;
    const checkInTime = calculateCheckInTime(resolvedTimeSlot, startTime);

    const formattedTotalPrice = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(booking.totalPrice) || 0);

    const guideImageUrl =
      (resolvedCourtKey && EMAIL_CUSTOM_CONFIG.courtGuideImages[resolvedCourtKey]) ||
      EMAIL_CUSTOM_CONFIG.defaultGuideImageUrl ||
      '';

    const guideImageSectionHtml = guideImageUrl
      ? `
              <!-- Ảnh hướng dẫn đường vào sân -->
              <div style="margin-top:16px;border-radius:12px;overflow:hidden;border:1px solid #334155;">
                <div style="background-color:#1e293b;padding:8px 12px;font-size:12px;font-weight:700;color:#f8fafc;">
                  🗺️ Hình ảnh hướng dẫn lối vào sân (${escapeHtml(courtName)})
                </div>
                <img src="${escapeHtml(guideImageUrl)}" alt="Hướng dẫn vào sân ${escapeHtml(courtName)}" style="display:block;width:100%;max-width:100%;height:auto;" />
              </div>
      `
      : '';

    const subject = `[DVA Volleyball] Xác nhận đặt sân thành công: ${courtName} (${resolvedTimeSlot}) - Mã đơn: ${booking.bookingCode}`;

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#121826;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626 0%,#ea580c 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#fee2e2;margin-bottom:6px;">
                DVA VOLLEYBALL CLUB
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">
                XÁC NHẬN ĐẶT SÂN THÀNH CÔNG
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#ffedd5;">
                Mã đơn đặt sân: <strong style="background:rgba(0,0,0,0.25);padding:3px 10px;border-radius:6px;font-family:monospace;">${escapeHtml(booking.bookingCode)}</strong>
              </p>
            </td>
          </tr>

          <!-- Greeting & Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#f8fafc;">
                Xin chào <strong>${escapeHtml(booking.customerName)}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                ${escapeHtml(EMAIL_CUSTOM_CONFIG.introMessage)}
              </p>

              <!-- Booking Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">Mã đơn đặt sân</td>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;font-family:monospace;">${escapeHtml(booking.bookingCode)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">Sân đặt</td>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:14px;font-weight:700;color:#fb923c;text-align:right;">${escapeHtml(courtName)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">Ngày đặt</td>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">${escapeHtml(resolvedDate)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">Khung giờ thuê sân</td>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#38bdf8;text-align:right;font-family:monospace;">${escapeHtml(resolvedTimeSlot)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0 4px;font-size:13px;color:#94a3b8;">Tổng số tiền đã thanh toán</td>
                  <td style="padding:10px 0 4px;font-size:16px;font-weight:800;color:#34d399;text-align:right;font-family:monospace;">${escapeHtml(formattedTotalPrice)} (ĐÃ THANH TOÁN)</td>
                </tr>
              </table>

              <!-- Dynamic Check-in & Check-out Time Callout -->
              <div style="background-color:rgba(16,185,129,0.12);border-left:4px solid #10b981;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
                <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#34d399;margin-bottom:6px;">
                  ⏰ Thời gian có mặt &amp; Kết thúc ca sân (Tự động theo khung giờ đặt)
                </div>
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#ecfdf5;line-height:1.5;">
                  • Vui lòng có mặt lúc <span style="color:#34d399;text-decoration:underline;">${escapeHtml(checkInTime)}</span> để khởi động và hoàn tất thủ tục nhận sân.
                </p>
                <p style="margin:0;font-size:13px;color:#d1fae5;line-height:1.5;">
                  • Giờ vào sân chính thức: <strong>${escapeHtml(startTime)}</strong> — Giờ kết thúc ca thuê sân: <strong>${escapeHtml(endTime)}</strong>.
                </p>
              </div>

              <!-- Directions, Guide Image & Support -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
                <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f8fafc;">
                  📍 Hướng dẫn đường đi &amp; Hỗ trợ tại sân
                </h3>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#cbd5e1;">
                  <strong>Địa chỉ sân:</strong> ${escapeHtml(courtAddress)}
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#cbd5e1;">
                  <strong>Hướng dẫn nhận sân:</strong> Khi đến cổng hoặc quầy quản lý sân, bạn chỉ cần xuất trình mã đơn <strong>${escapeHtml(booking.bookingCode)}</strong> để nhận sân và bóng thi đấu Mikasa V200W đi kèm.
                </p>
                <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#cbd5e1;">
                  <strong>Hotline / Zalo hỗ trợ trực tiếp:</strong> <a href="tel:${escapeHtml(hotline.replace(/\s+/g, ''))}" style="color:#fb923c;font-weight:700;text-decoration:none;">${escapeHtml(hotline)}</a>
                </p>
                <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:8px;">
                  Xem chỉ đường trên Google Maps →
                </a>
                ${guideImageSectionHtml}
              </div>

              <!-- Lời chúc cuối thư -->
              <div style="background-color:rgba(234,88,12,0.1);border:1px dashed rgba(251,146,60,0.4);border-radius:12px;padding:14px 18px;text-align:center;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#fed7aa;font-weight:600;">
                  ${escapeHtml(EMAIL_CUSTOM_CONFIG.wishMessage)}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#090d16;padding:18px 32px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} ${escapeHtml(fromName)} · Hotline: ${escapeHtml(hotline)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: booking.customerEmail,
      subject,
      html,
    });

    console.log(`[Mailer] Đã gửi email xác nhận đặt sân thành công tới ${booking.customerEmail} (Mã đơn: ${booking.bookingCode})`);
    return true;
  } catch (error: any) {
    console.error(
      `[Mailer Error] Không thể gửi email xác nhận cho đơn ${booking?.bookingCode || 'UNKNOWN'}:`,
      error?.message || error
    );
    return false;
  }
}
