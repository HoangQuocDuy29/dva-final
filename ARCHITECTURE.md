# 🏛️ DVA Volleyball Club - Architecture & Context Map

> **Mục tiêu tài liệu:** Bản đồ ngữ cảnh (Context Map) toàn diện cho các AI Agent và Kỹ sư phần mềm tiếp nhận dự án. Cung cấp nhanh luồng dữ liệu, helper tái sử dụng, quy chuẩn thiết kế, phân quyền bảo mật và các nguyên tắc kỹ thuật cốt lõi chỉ trong vài trăm dòng tóm tắt, tiết kiệm tối đa token mà không cần đọc lại toàn bộ codebase.

---

## 1. 🌐 Tổng quan Kiến trúc & Tech Stack

Hệ thống hoạt động theo mô hình Monorepo lai (Fullstack TypeScript) phục vụ câu lạc bộ bóng chuyền DVA:

```
[ React 19 + Vite 8 SPA Client ]
               │
               ▼ (HTTP /api Bearer dva_token)
    [ Express API Backend ] ─── (Prisma ORM 7) ───► [ PostgreSQL (Render) ]
               │
               ├─► [ Resend API ] ───────────────► Gửi Email song ngữ (Vi - En)
               ├─► [ Google Apps Script Webhook ] ► Đồng bộ Google Sheets tự động
               ├─► [ Cloudinary CDN ] ────────────► Quản lý & lưu trữ hình ảnh
               └─► [ VietQR Quicklink ] ──────────► Sinh mã QR chuyển khoản MBBank
```

- **Frontend:**
  - Core: React 19, TypeScript, Vite 8.
  - UI & Styling: Tailwind CSS v4, Motion (Framer Motion v12), Lucide React.
  - Router: React Router v7 (`react-router-dom`).
- **Backend:**
  - Runtime & Framework: Node.js, Express v4 (`server.ts`).
  - Database & ORM: PostgreSQL (Deploy trên Render), Prisma ORM v7 (`@prisma/client`, `@prisma/adapter-pg`).
  - Security & Crypto: `bcrypt` (10 rounds), HS256 HMAC JWT token.
- **Tích hợp Dịch vụ ngoài (Third-party Integrations):**
  - **Resend:** Dịch vụ gửi email thông báo đặt sân, đăng ký khoá học, xét tuyển hội viên (Bilingual template).
  - **Google Apps Script Webhook:** Đồng bộ dữ liệu real-time từ API về Google Sheets (tabs: `DatSan`, `DangKyKhoaHoc`, `TuyenThanhVien`, `LienHe`).
  - **Cloudinary:** Lưu trữ và phân phối hình ảnh sơ đồ sân, cổng vào, tin tức.
  - **VietQR Quicklink:** Sinh ảnh mã QR động theo chuẩn ngân hàng Việt Nam.

---

## 2. 🗺️ Bản đồ Thư mục & Trách nhiệm (Directory Map)

| Đường dẫn Thư mục | Trách nhiệm Cốt lõi & Thành phần Chính |
| :--- | :--- |
| `src/components/` | Thành phần UI phân tách theo phạm vi: <br>• `auth/`: Modal đăng nhập, form cấp lại mật khẩu, OTP.<br>• `common/`: Toast, Modal xác nhận, Dialog thông báo dùng chung.<br>• `layout/`: Navbar (Floating Capsule), Footer, Menu Drawer di động. |
| `src/pages/` | Các trang màn hình chính của ứng dụng: <br>• `AdminDashboardPage.tsx`: Quản trị tổng thể (Sân, Đặt chỗ, Hội viên, Khoá học, Cấu hình Sheets, Log sync).<br>• `CourtBookingPage.tsx`: Wizard đặt sân bóng, chọn khung giờ, thanh toán VietQR.<br>• `HomePage.tsx`: Trang chủ giới thiệu CLB, tiện ích, lời kêu gọi hành động (CTA).<br>• `TrainingPage.tsx`: Đăng ký khoá huấn luyện bóng chuyền, danh sách HLV.<br>• `MemberRegisterPage.tsx`: Biểu mẫu nộp hồ sơ gia nhập CLB.<br>• `PlayersPage.tsx`: Danh sách vận động viên, thông số kỹ thuật (vị trí, chiều cao, tầm bật).<br>• `NewsPage.tsx` & `NewsDetailPage.tsx`: Tin tức và thông báo hoạt động.<br>• `InformationPage.tsx`: Nội quy CLB, bảng giá, bản đồ chỉ dẫn. |
| `src/services/` | Lớp giao tiếp API máy khách (`api.ts`): Bao bọc hàm `request<T>()`, quản lý xác thực `authService`, điều phối đặt sân `bookingService`, huấn luyện `trainingService`, đồng bộ sheets `sheetsService`. |
| `src/data/` | Dữ liệu tĩnh và mock fallback: `mockData.ts`, danh mục tỉnh thành `vietnamLocations.ts`. |
| `src/types/` | Toàn bộ định nghĩa TypeScript (`index.ts`): User, Role, Player, Court, Booking, ClosedSlot, TrainingCourse, v.v. |
| `src/shared/` | Logic dùng chung giữa FE và BE: Chuẩn hóa lịch tuần sân bóng (`schedule.ts`). |
| `src/config/` | Cấu hình frontend: Đường dẫn API gốc (`api.ts`). |
| `lib/` | Thư viện dịch vụ cốt lõi Backend: <br>• `mailer.ts`: Khởi tạo Resend, template email song ngữ, VietQR URL builder.<br>• `prisma.ts`: Singleton kết nối Prisma Client qua PostgreSQL pool adapter.<br>• `security.ts`: RBAC Default-Deny, JWT sign/verify, mã hoá bcrypt, rate limiter, security headers.<br>• `schemas.ts` & `validation.ts`: Xác thực và làm sạch dữ liệu đầu vào. |
| `prisma/` | Định nghĩa cơ sở dữ liệu: <br>• `schema.prisma`: Khai báo 12 models (User, Player, Court, ClosedSlot, Booking, CoachProfile, TrainingCourse, TrainingRegistration, MemberApplication, NewsPost, AppConfig, GoogleSheetsSyncLog).<br>• `seed-admin.ts`: Script khởi tạo tài khoản SUPERADMIN/ADMIN mặc định. |
| `server.ts` | Máy chủ Express API: Định tuyến RESTful, middleware bảo mật, webhook dispatchers, tích hợp Cloudinary và VietQR. |

---

## 3. 🧰 Sổ tay Tái sử dụng Helper & Services (Reusable Utilities)

### 3.1. Dịch vụ Mail & VietQR (`lib/mailer.ts`)
- **Khởi tạo Client & Email cấu hình:**
  - `getResendClient()`: Lấy instance `Resend` với `RESEND_API_KEY`.
  - `getSenderEmail()`: Trả về địa chỉ gửi (mặc định cấu hình qua `RESEND_SENDER_EMAIL` hoặc fallback hệ thống).
  - `getAdminEmail()`: Trả về email quản trị viên nhận thông báo (`ADMIN_NOTIFICATION_EMAIL` hoặc fallback).
- **Thông tin Thụ hưởng MBBank cố định:**
  - Số tài khoản: `0002090671521` (Hằng số `VIETQR_ACCOUNT_NO`)
  - Tên chủ tài khoản: `HOANG QUOC DUY` (Hằng số `VIETQR_ACCOUNT_NAME`)
  - Ngân hàng: `MBBank` (`MB`)
- **Helper Xử lý Chuỗi & Sinh VietQR Quicklink:**
  - `removeVietnameseTones(str: string): string`: Khử toàn bộ dấu tiếng Việt sang chữ không dấu viết liền/chuẩn để dùng trong nội dung chuyển khoản (tránh lỗi font hệ thống ngân hàng).
  - `buildBookingVietQrUrl(amount: number, transferContent: string): string`: Tạo đường dẫn ảnh VietQR Quicklink chuẩn `https://img.vietqr.io/image/MB-0002090671521-compact2.png?...` kèm số tiền và cú pháp không dấu.
- **Hằng số Media & Địa chỉ Sân Cố định:**
  - `DEFAULT_COURT_GUIDE_IMAGE`: Ảnh Cloudinary hướng dẫn đường đi vào cụm sân (`res.cloudinary.com/...`).
  - `COURT_GATE_IMAGE`: Ảnh Cloudinary phối cảnh cổng vào sân DVA.
  - `COURT_DEFAULT_ADDRESS`: `'155 Trường Chinh, Thanh Xuân, Hà Nội'`.
  - `COURT_DEFAULT_MAPS_URL`: `'https://maps.app.goo.gl/hkqofjzojcUoE39M7'`.
- **Danh sách Hàm Gửi Mail Nghiệp vụ:**
  - `sendBookingConfirmationEmail(booking, court)`: Gửi email xác nhận đặt sân kèm mã QR thanh toán, ảnh chỉ dẫn đường và Google Maps link (Song ngữ).
  - `sendTrainingRegistrationEmail(payload)`: Gửi email xác nhận đăng ký lớp học bóng chuyền & thông tin chuyển khoản học phí.
  - `sendMemberRegistrationEmail(member)`: Gửi email tiếp nhận hồ sơ gia nhập CLB DVA.
  - `sendGuestSessionEmail(payload)`: Gửi email đăng ký tham gia giao lưu buổi lẻ (Guest session).

### 3.2. Bảo mật & Phân quyền (`lib/security.ts`)
- **Cơ chế Default-Deny (`apiAccessPolicy`):**
  - Mọi endpoint API dưới `/api` **mặc định đều bị chặn (yêu cầu ADMIN hoặc SUPERADMIN)**, trừ các route được khai báo tường minh trong `PUBLIC_RULES`.
  - Tuyệt đối không tự ý mở public các route mang tính chất ghi dữ liệu nhạy cảm nếu không nằm trong chính sách.
- **Quy tắc phân quyền Route Quản trị:**
  - Các route quản trị (`/api/admin/*`, quản lý users, chỉnh sửa cấu hình sheets `/api/sheets/config`) tự động kiểm tra quyền `ADMIN` hoặc `SUPERADMIN`.
  - Route quản lý vai trò và xoá người dùng yêu cầu quyền cao nhất: `SUPERADMIN`.
- **Token & Header Xác thực:**
  - Token key trong Storage: `dva_token` (lưu trữ trong `localStorage`).
  - Cấu trúc Header: `Authorization: Bearer <dva_token>`.
  - Middleware `attachAuth`: Giải mã token, truy vấn người dùng từ cơ sở dữ liệu và gán vào `req.user`.

### 3.3. Client API Wrapper (`src/services/api.ts`)
- **Hàm gọi trung tâm `request<T>()`:**
  - Tự động bổ sung tiền tố `/api` thông qua `getApiUrl(endpoint)`.
  - Tự động lấy `dva_token` từ `localStorage` và đính kèm vào Header `Authorization: Bearer <token>`.
  - Tự động bắt lỗi HTTP status: Nếu nhận mã `401 Unauthorized` và đang có token, hàm tự động dọn dẹp session (`clearSession()`) và kích hoạt sự kiện toàn cục `window.dispatchEvent(new Event('dva:session-expired'))`.
  - Hỗ trợ dữ liệu dự phòng offline (`fallbackData`) nếu backend tạm thời không kết nối được.
- **Chống Submit trùng lặp (`deduplicatedPost<T>()`):**
  - Quản lý in-flight request qua `Map` để ngăn người dùng click đúp gửi trùng dữ liệu POST (như đặt sân 2 lần cùng một lúc).

### 3.4. Điều phối Google Sheets Webhook (`server.ts`)
- **Hàm Dispatcher Bất đồng bộ:**
  - `dispatchGoogleSheetsWebhookAsync(tabName, sheetName, rowData)`: Điều hướng dữ liệu sang Google Apps Script URL.
  - Chạy theo cơ chế hoàn toàn non-blocking (Fire-and-forget), bọc kín trong `void (async () => { try { ... } catch { ... } })()`.
- **Danh sách Sheet / Tab Tiêu chuẩn:**
  1. `DatSan`: Tiếp nhận đơn đặt sân bóng chuyền, lịch ngày, giờ, tiền cọc, trạng thái thanh toán.
  2. `DangKyKhoaHoc`: Tiếp nhận đăng ký khoá học bóng chuyền, học viên, trình độ, ca học.
  3. `TuyenThanhVien`: Tiếp nhận đơn xin gia nhập câu lạc bộ, vị trí thi đấu, thông tin cá nhân.
  4. `LienHe`: Tiếp nhận thông tin phản hồi, yêu cầu hỗ trợ và liên hệ khẩn cấp từ khách hàng.

### 3.5. Chiến lược Database Index & Quy trình Schema (`prisma/schema.prisma`)
- **Quy trình áp dụng schema: `prisma db push`** (`npm run prisma:push`). Dự án **không có** thư mục `prisma/migrations`.
  - ⚠️ **KHÔNG chạy `prisma migrate dev`** trên DB Render hiện tại: Prisma sẽ phát hiện drift và đề nghị reset → mất dữ liệu. Không dùng cờ `--accept-data-loss`.
- **Quy tắc thứ tự cột composite index:** `[Cột lọc =]` → `[Cột lọc khoảng / Range]` → `[Cột ORDER BY]`. Khi viết query mới, `where` + `orderBy` phải khớp tiền tố (prefix) của một index sẵn có.
- **Bản đồ Query ↔ Index chính:**

| Query (vị trí) | `where` / `orderBy` | Index phục vụ |
| :--- | :--- | :--- |
| `GET /api/players` | `level?` → `level ASC, isCaptain DESC, jerseyNumber ASC` | `Player[level, isCaptain DESC, jerseyNumber ASC]` |
| `GET /api/bookings` | `courtId, bookingDate` → `createdAt DESC` | `Booking[courtId, bookingDate, createdAt DESC]` |
| `hasBookingConflict()` | `courtId, bookingDate, paymentStatus` | `Booking[courtId, bookingDate, paymentStatus]` / `[.., startTime]` |
| `releaseExpiredHolds()` | `paymentStatus='PENDING', holdExpiresAt <= now` | `Booking[paymentStatus, holdExpiresAt]` |
| Webhook thanh toán | `paymentStatus='PENDING'` → `createdAt DESC` | `Booking[paymentStatus, createdAt DESC]` |
| `hasClosedSlotConflict()` | `courtId, date` | `ClosedSlot[courtId, date]` |
| Training / Member / Admin lists | → `createdAt DESC` | `[createdAt DESC]` trên từng bảng |
| Sheets sync log | `tabName` → `timestamp DESC` | `GoogleSheetsSyncLog[tabName, timestamp DESC]` |

- **Thứ tự sắp xếp VĐV được đảm bảo từ Server:** `GET /api/players` trả về danh sách đã sort sẵn theo `level` (thứ tự enum `SENIOR → JUNIOR → YOUTH`) → Captain đứng đầu → số áo tăng dần. Nhánh fallback JSON (khi DB lỗi) cũng sort cùng thứ tự. Frontend (`PlayersPage.tsx`) không cần sort lại.

---

## 4. 🎨 Quy chuẩn Giao diện & Thiết kế (Design Tokens - Dark Theme DVA)

Giao diện áp dụng phong cách **Thể thao Hiện đại Cao cấp (Premium Dark Athletic)**:

### 4.1. Bảng màu Chủ đạo (Color Tokens)
- **Nền trang chính (Page Background):** `#0B0F19` (Đen ánh xanh đậm chiều sâu).
- **Thẻ & Khung nội dung (Card / Surface):** `#111827` (Slate 900 đậm).
- **Đường viền ngăn cách (Border):** `#1E293B` (Slate 800) hoặc `rgba(51, 65, 85, 0.6)`.
- **Chữ chính (Primary Text):** `#FFFFFF` (Trắng tinh khiết).
- **Chữ phụ & Gợi ý (Muted Text):** `#94A3B8` (Slate 400).
- **Điểm nhấn Công nghệ (Accent Blue):** `#38BDF8` (Sky 400 - nút bấm, highlight link).
- **Vàng Giá trị / Cú pháp (Value / Price / Warning):** `#FACC15` (Yellow 400 - hiển thị giá tiền, mã đơn hàng).
- **Cam Thể thao Năng động (Sport Orange / Brand):** `#F97316` / `#EA580C` (Màu cờ sắc áo bóng chuyền).
- **Đỏ DVA Club (Brand Cherry):** `#8B0000` / `#991B1B` (Badge logo, CTA nhận diện thương hiệu).

### 4.2. Quy ước Thanh điều hướng (Floating Capsule Navbar)
- Thanh điều hướng nằm ở vị trí `fixed top-0 left-0 right-0 z-50` căn giữa màn hình với cơ chế **Single Container Transition** (tránh hiện tượng giật giật layout khi cuộn):
  - **Trạng thái ở Đỉnh trang (`scrollY <= 20px`):** Dàn rộng `max-w-7xl`, chiều cao `h-20`, bo góc thẳng `rounded-none`, nền `bg-[#0B0F19]/90`, đường viền đáy `border-b border-slate-800/80`.
  - **Trạng thái Cuộn trang (`scrollY > 20px`):** Thu gọn thành Capsule nổi `max-w-6xl`, chiều cao `h-14`, bo góc bầu dục `rounded-2xl`, hiệu ứng kính mờ `backdrop-blur-md` (`16px`), viền nổi `border border-slate-700/60`, đổ bóng `shadow-2xl shadow-black/50`, nền trong suốt `bg-[#0B0F19]/70`.

### 4.3. Quy chuẩn Hiển thị Song ngữ (Bilingual UI & Emails)
- Toàn bộ giao diện khách hàng (Website) và toàn bộ thông báo gửi đi (Email HTML) phải tuân thủ layout **Song ngữ Anh - Việt (Bilingual)**:
  - Khối Tiếng Việt nằm trước/trên, khối Tiếng Anh giải thích nằm ngay sau/dưới hoặc hiển thị song song nhãn (ví dụ: `Đặt Sân / Court Booking`, `Huấn Luyện / Training`).
  - Trong email HTML: Tiêu đề và lời chào phải gồm cả 2 ngôn ngữ; bảng thông tin tóm tắt có nhãn song ngữ rõ ràng để người nước ngoài có thể tham gia thi đấu tại CLB một cách thuận lợi.

---

## 5. ⚡ Nguyên tắc Kỹ thuật Bất di bất dịch (Engineering Commandments)

Mọi lập trình viên và AI Agent khi làm việc với codebase này bắt buộc phải tuân thủ nghiêm ngặt các nguyên tắc sau:

1. **Fire-and-Forget An toàn Tuyệt đối cho 3rd Party Services:**
   - Mọi tác vụ gửi email (`Resend`), webhook đồng bộ bảng tính (`Google Apps Script`), hay gửi log ngoài **BẮT BUỘC** phải chạy bất đồng bộ tách biệt (`void (async () => { ... })()`).
   - Phải bọc toàn bộ trong khối `try/catch` độc lập.
   - **TUYỆT ĐỐI KHÔNG** để lỗi kết nối mạng hoặc phản hồi chậm của dịch vụ bên thứ ba làm nghẽn tiến trình hoặc làm sập HTTP response `200` trả về cho máy khách.

2. **Bảo toàn Cơ sở Dữ liệu & Schema:**
   - **TUYỆT ĐỐI KHÔNG** tự ý can thiệp, chỉnh sửa cấu trúc `prisma/schema.prisma` hoặc thay đổi các controller đang chạy ổn định trong `server.ts` trừ khi có chỉ đạo rõ ràng từ yêu cầu của người dùng.
   - Áp dụng schema bằng `npm run prisma:push` (xem mục 3.5). Không chạy lệnh tác động DB production khi chưa được người dùng xác nhận.

3. **Chống Ghi Đè & Xung Đột Dữ Liệu (Idempotency & Race Conditions):**
   - Đặt sân bóng và đóng slot phải luôn kiểm tra xung đột thời gian (`ClosedSlot` và `Booking` trùng lặp) trước khi ghi nhận.
   - Ở phía frontend, luôn sử dụng cơ chế debounce / `deduplicatedPost` để ngăn người dùng vô tình bấm nhiều lần liên tiếp gây trùng dữ liệu.

4. **Chuẩn hoá Chuỗi Thanh toán Ngân hàng:**
   - Mọi chuỗi thông tin chuyển khoản phát sinh khi tạo VietQR bắt buộc phải đi qua hàm `removeVietnameseTones()` để loại bỏ hoàn toàn ký tự có dấu, dấu cách thừa và ký tự đặc biệt, đảm bảo hệ thống tự động nhận diện thanh toán của ngân hàng hoạt động chính xác 100%.

5. **PostgreSQL là Nguồn Chân lý Duy nhất (Single Source of Truth):**
   - Mọi thao tác đọc/ghi dữ liệu nghiệp vụ (Bookings, Member Applications, Closed Slots, Training Registrations, Users) chạy trực tiếp 100% qua Prisma ORM tới PostgreSQL.
   - Không duy trì cơ chế ghi file JSON dự phòng cục bộ (`bookings.json`, `applications.json`, `closedSlots.json`, `trainingRegistrations.json`) khi có mutation, tránh hiện tượng chia rẽ dữ liệu (split-brain) và hao tổn I/O trên môi trường container ephemeral disk (Render).
