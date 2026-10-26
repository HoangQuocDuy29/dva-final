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
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || 'quocduyhoang42@gmail.com').trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');

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

    const smtpUser = (process.env.EMAIL_USER || process.env.SMTP_USER || 'quocduyhoang42@gmail.com').trim();
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

function formatMemberPosition(pos: string): string {
  const p = (pos || '').toUpperCase().trim();
  const map: Record<string, string> = {
    OH: 'Outside Hitter (Chủ công - OH)',
    OPP: 'Opposite (Đối chuyền - OPP)',
    MB: 'Middle Blocker (Phụ công - MB)',
    SETTER: 'Setter (Chuyền hai - S)',
    LIBERO: 'Libero (Chuyên gia phòng thủ - L)',
  };
  return map[p] || pos;
}

function formatMemberLevel(lvl: string): string {
  const l = (lvl || '').toUpperCase().trim();
  if (l === 'SENIOR') return 'Senior (Đội 1 / Advanced 3+ năm)';
  if (l === 'JUNIOR') return 'Junior (Bán chuyên / Intermediate)';
  if (l === 'YOUTH') return 'Youth (Tuyến trẻ / Development)';
  return lvl;
}

function formatMemberTactics(tactic?: string): string {
  if (!tactic) return 'Hệ thống cơ bản / Basic system';
  const t = tactic.trim().toUpperCase();
  if (t === '5-1') return 'Chiến thuật 5-1 / 5-1 System';
  if (t === '6-2') return 'Chiến thuật 6-2 / 6-2 System';
  if (t === '4-2') return 'Chiến thuật 4-2 / 4-2 System';
  if (t === 'ADVANCED') return 'Thành thạo 5-1 & 6-2 / Advanced 5-1 & 6-2';
  if (t === 'BASIC') return 'Cơ bản / Basic system';
  return tactic;
}

export function removeVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Gửi email xác nhận đăng ký thành viên / vận động viên DVA Volleyball Club (Song ngữ: Tiếng Việt / English).
 * Thiết kế tông màu đen - cam chuẩn thương hiệu DVA.
 * Được bọc hoàn toàn trong try/catch bất đồng bộ để không bao giờ làm gián đoạn trải nghiệm người dùng.
 */
export async function sendMemberRegistrationEmail(
  member: MemberEmailPayload
): Promise<boolean> {
  const recipientEmail = (member.gmail || member.email || '').trim();
  const passId = member.passId || member.id || 'DVA-PASS';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!recipientEmail || !emailRegex.test(recipientEmail)) {
    console.warn('[Email Service Warning] Bỏ qua gửi email thành viên vì địa chỉ email trống hoặc sai format:', recipientEmail);
    return false;
  }

  try {
    const senderEmail = (process.env.EMAIL_USER || process.env.SMTP_USER || 'quocduyhoang42@gmail.com').trim();
    const fromName = process.env.EMAIL_FROM_NAME || 'DVA Volleyball Club';
    const transporter = createMailTransporter();
    const hotline = '0768299329';
    const formattedHotline = '0768 299 329';
    const clubEmail = 'quocduyhoang42@gmail.com';

    // Tiêu đề email (Bỏ hoàn toàn cụm từ Sports Arena)
    const subject = `[DVA Volleyball Club] Xác nhận đơn đăng ký thành viên - Pass ID: ${passId}`;

    const formattedPosition = formatMemberPosition(member.position);
    const formattedLevel = formatMemberLevel(member.level);
    const formattedTactics = formatMemberTactics(member.rotationKnowledge);
    const jerseyNumber =
      member.desiredJerseyNumber !== undefined && member.desiredJerseyNumber !== null && member.desiredJerseyNumber !== ''
        ? `#${member.desiredJerseyNumber}`
        : 'Tự do / Any';

    const instagramDisplay =
      member.instagram && member.instagram.trim() && member.instagram !== 'None'
        ? member.instagram.trim()
        : 'Chưa cung cấp / Not provided';

    // Chuẩn hóa cú pháp nội dung chuyển khoản: register_{normalizedFullName}_clubentry_{phone}
    const cleanName = removeVietnameseTones(member.fullName).replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanPhone = (member.zalo || '').replace(/\D/g, '').trim() || (member.zalo || '').trim();
    const transferContent = `register_${cleanName}_clubentry_${cleanPhone}`;

    // Cấu hình URL ảnh VietQR động cố định phí 100.000 VNĐ
    const vietQrUrl = `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=100000&addInfo=${encodeURIComponent(transferContent)}&accountName=HOANG%20QUOC%20DUY`;

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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#121826;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          
          <!-- Header Banner (Gradient Cam - Đỏ nhận diện DVA) -->
          <tr>
            <td style="background:linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #9a3412 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#ffedd5;margin-bottom:6px;">
                DVA VOLLEYBALL CLUB
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                XÁC NHẬN ĐƠN ĐĂNG KÝ THÀNH VIÊN
              </h1>
              <div style="font-size:13px;font-weight:600;color:#fed7aa;margin-top:4px;letter-spacing:0.5px;">
                MEMBER REGISTRATION CONFIRMATION
              </div>
              <div style="margin-top:12px;">
                <span style="display:inline-block;background:rgba(0,0,0,0.35);padding:6px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);font-family:monospace;font-size:13px;color:#ffedd5;font-weight:700;">
                  ATHLETE PASS ID: ${escapeHtml(passId)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:28px 24px;">
              
              <!-- 1. Lưu ý dành cho thành viên cũ (Notice for Existing Members) -->
              <div style="background-color:rgba(59,130,246,0.1);border-left:4px solid #3b82f6;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:#bfdbfe;font-weight:700;">
                  📌 Vui lòng bỏ qua email này nếu bạn là thành viên cũ và chỉ đang cập nhật thông tin theo yêu cầu của đội trưởng.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#93c5fd;font-style:italic;">
                  ℹ️ <em>Please ignore this email if you are an existing member simply updating your details as requested by your team captain.</em>
                </p>
              </div>

              <!-- 2. Lời chào mừng (Greeting) -->
              <p style="margin:0 0 4px;font-size:16px;line-height:1.6;color:#f8fafc;">
                Xin chào <strong>${escapeHtml(member.fullName)}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#94a3b8;font-style:italic;">
                Hello <strong>${escapeHtml(member.fullName)}</strong>,
              </p>
              <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                Chào mừng bạn đến với cộng đồng <strong style="color:#fb923c;">DVA Volleyball Club</strong>! Chúng tôi đã tiếp nhận hồ sơ đăng ký tham gia thành viên / vận động viên CLB của bạn.
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#94a3b8;font-style:italic;">
                Welcome to the <strong style="color:#fb923c;">DVA Volleyball Club</strong> community! We have received your membership application.
              </p>

              <!-- 3. Cách thức liên lạc (Xưng hô: Chúng tôi / We / The DVA Team) -->
              <div style="background-color:rgba(234,88,12,0.08);border-left:4px solid #ea580c;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#f8fafc;">
                  📞 <strong>Chúng tôi</strong> sẽ chủ động liên hệ với bạn qua Số điện thoại (<strong style="color:#fb923c;">${escapeHtml(member.zalo)}</strong>) hoặc Instagram (<strong style="color:#fb923c;">${escapeHtml(instagramDisplay)}</strong>) bạn đã cung cấp trong form đăng ký.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#fed7aa;font-style:italic;">
                  💬 <em><strong>We</strong> will contact you via the phone number or Instagram handle provided in your application.</em>
                </p>
              </div>

              <!-- 4. Thông tin lệ phí & Tài khoản ngân hàng (Song ngữ) -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:24px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#fb923c;margin-bottom:14px;">
                  💳 THÔNG TIN LỆ PHÍ &amp; CHUYỂN KHOẢN / FEES &amp; PAYMENT
                </div>

                <!-- 4A. Phí gia nhập CLB & Mã VietQR Động -->
                <div style="background:rgba(234,88,12,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:12px;padding:18px;margin-bottom:16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
                    <tr>
                      <td style="font-size:14px;font-weight:800;color:#ffffff;">
                        1. Phí gia nhập CLB / Club Membership Fee
                      </td>
                      <td align="right" style="font-size:16px;font-weight:900;color:#fb923c;font-family:monospace;">
                        100.000 VNĐ
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#f8fafc;">
                    Cần đóng trước <strong>100.000 VNĐ</strong> vào tài khoản ngân hàng bên dưới để hoàn tất hồ sơ đăng ký.
                  </p>
                  <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#94a3b8;font-style:italic;">
                    A one-time registration fee of 100,000 VND is required to finalize your membership application.
                  </p>

                  <!-- Dynamic VietQR Payment Code -->
                  <div style="text-align: center; margin: 20px 0;">
                    <img src="${vietQrUrl}" alt="VietQR Payment" style="max-width: 250px; width: 100%; border-radius: 12px; border: 2px solid #ea580c; display: block; margin: 0 auto;" />
                    <p style="font-size: 13px; color: #9ca3af; margin-top: 8px;">
                      Quét mã QR để chuyển khoản nhanh 100.000 VNĐ (Đã có sẵn số tiền &amp; nội dung)
                    </p>
                    <p style="font-size: 11px; color: #64748b; margin-top: 2px; font-style: italic;">
                      Scan QR code to transfer 100,000 VND (Amount &amp; transfer note pre-filled)
                    </p>
                  </div>
                </div>

                <!-- 4B. Chi phí các buổi tập trong tương lai -->
                <div style="background:#161f30;border:1px solid #334155;border-radius:12px;padding:16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:6px;">
                    <tr>
                      <td style="font-size:14px;font-weight:800;color:#ffffff;">
                        2. Chi phí các buổi tập / chơi trong tương lai (Future Sessions)
                      </td>
                      <td align="right" style="font-size:15px;font-weight:800;color:#38bdf8;font-family:monospace;">
                        70.000 VNĐ / buổi
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#f8fafc;">
                    <strong>Mức phí:</strong> 70.000 VNĐ / buổi (gói Basic).
                  </p>
                  <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#f8fafc;">
                    <strong>Hình thức:</strong> Tự do chọn buổi tham gia, không bắt buộc phải đi đủ tất cả các buổi; tham gia buổi nào đóng tiền buổi đó.
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;font-style:italic;">
                    Future session fee is 70,000 VND / session (Basic pass). Flexible attendance—you are not required to attend every session; pay as you play.
                  </p>
                </div>
              </div>

              <!-- 5. Bảng tóm tắt thông số cá nhân (Song ngữ) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(145deg, #161f30 0%, #0d121c 100%);border:2px solid rgba(249,115,22,0.45);border-radius:16px;margin-bottom:24px;overflow:hidden;box-shadow:inset 0 1px 1px rgba(255,255,255,0.1);">
                <tr>
                  <td style="padding:18px 22px;border-bottom:1px solid rgba(249,115,22,0.2);background:rgba(234,88,12,0.06);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:#fb923c;text-transform:uppercase;display:block;">
                            OFFICIAL ATHLETE PASS
                          </span>
                          <span style="font-size:19px;font-weight:900;color:#ffffff;display:block;margin-top:2px;">
                            ${escapeHtml(member.fullName)}
                          </span>
                        </td>
                        <td align="right">
                          <span style="display:inline-block;background:#dc2626;color:#ffffff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;text-transform:uppercase;">
                            ${escapeHtml(member.position)} · ${escapeHtml(member.level)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Mã thẻ / Pass ID
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#fb923c;text-align:right;font-family:monospace;">
                          ${escapeHtml(passId)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Cấp độ / Level
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                          ${escapeHtml(formattedLevel)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Số áo mong muốn / Jersey
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:800;color:#38bdf8;text-align:right;font-family:monospace;">
                          ${escapeHtml(jerseyNumber)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Vị trí sở trường / Position
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;">
                          ${escapeHtml(formattedPosition)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Chiều cao &amp; Cân nặng / Height &amp; Weight
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;font-family:monospace;">
                          ${escapeHtml(String(member.height))} cm · ${escapeHtml(String(member.weight))} kg
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Tầm bật đà / Spike Reach
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:800;color:#f87171;text-align:right;font-family:monospace;">
                          ${escapeHtml(String(member.spikeReach))} cm
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Tầm bật chắn / Block Reach
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:800;color:#fbbf24;text-align:right;font-family:monospace;">
                          ${escapeHtml(String(member.blockReach))} cm
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Hệ thống chiến thuật / Tactical System
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#a78bfa;text-align:right;">
                          ${escapeHtml(formattedTactics)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;color:#94a3b8;">
                          Số điện thoại / Phone (Zalo)
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:700;color:#34d399;text-align:right;font-family:monospace;">
                          ${escapeHtml(member.zalo)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0 2px;font-size:13px;color:#94a3b8;">
                          Instagram
                        </td>
                        <td style="padding:8px 0 2px;font-size:13px;font-weight:700;color:#f8fafc;text-align:right;font-family:monospace;">
                          ${escapeHtml(instagramDisplay)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 6. Thông tin liên hệ CLB (Chỉ giữ duy nhất cơ sở BTL Thông Tin court) -->
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:18px 20px;margin-bottom:20px;">
                <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f8fafc;">
                  📍 Thông tin liên hệ CLB / Contact &amp; Home Court
                </h3>
                <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#cbd5e1;">
                  🏢 <strong>Sân tập luyện chính thức / Home Court:</strong> Sân BTL Thông Tin (BTL Thông Tin court)
                </p>
                <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#cbd5e1;">
                  📞 <strong>Hotline / Zalo:</strong> <a href="tel:${escapeHtml(hotline)}" style="color:#fb923c;font-weight:700;text-decoration:none;">${escapeHtml(hotline)}</a> (${escapeHtml(formattedHotline)})
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#cbd5e1;">
                  ✉️ <strong>Email:</strong> <a href="mailto:${escapeHtml(clubEmail)}" style="color:#38bdf8;text-decoration:none;">${escapeHtml(clubEmail)}</a>
                </p>
              </div>

              <!-- Lời chúc thân ái -->
              <div style="background-color:rgba(234,88,12,0.06);border:1px dashed rgba(251,146,60,0.35);border-radius:12px;padding:14px 18px;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#fed7aa;font-weight:600;">
                  Rất vui mừng chào đón bạn đồng hành cùng DVA Volleyball Club! 🏐🔥
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#fdba74;font-style:italic;">
                  We look forward to having you on the court with us!
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer (Chỉ giữ duy nhất BTL Thông Tin court, bỏ hoàn toàn Sports Arena) -->
          <tr>
            <td style="background-color:#090d16;padding:18px 32px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} ${escapeHtml(fromName)} · Sân BTL Thông Tin (BTL Thông Tin court)<br />
              Hotline / Zalo: ${escapeHtml(formattedHotline)} · Email: ${escapeHtml(clubEmail)}
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
      from: `"${fromName}" <${senderEmail}>`,
      to: recipientEmail,
      subject,
      html,
    });

    console.log(`[Mailer] Đã gửi email xác nhận đăng ký thành viên tới ${recipientEmail} (Pass ID: ${passId})`);
    return true;
  } catch (error: any) {
    console.error(
      `[Email Service Warning] Gửi mail thất bại cho: ${recipientEmail} - ${error?.message || error}`
    );
    return false;
  }
}
