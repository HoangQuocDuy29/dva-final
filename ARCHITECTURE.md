# 🏛️ DVA Volleyball Club - Architecture & Context Map

> **Mục tiêu tài liệu:** Bản đồ ngữ cảnh (Context Map) toàn diện cho các AI Agent và Kỹ sư phần mềm tiếp nhận dự án. Cung cấp nhanh luồng dữ liệu, helper tái sử dụng, quy chuẩn thiết kế, phân quyền bảo mật và các nguyên tắc kỹ thuật cốt lõi chỉ trong vài trăm dòng tóm tắt, tiết kiệm tối đa token mà không cần đọc lại toàn bộ codebase.

---

## 1. 🌐 Tổng quan Kiến trúc & Tech Stack

Hệ thống hoạt động theo mô hình Monorepo lai (Fullstack TypeScript) phục vụ câu lạc bộ bóng chuyền DVA:

```
[ React 19 + Vite 8 SPA Client (Vercel) ]
               │
               ▼ (HTTP /api Bearer dva_token)
[ Express v4 API Backend (Render: dva-backend) ] ─── (Prisma ORM 7 + pg Pool) ───► [ Supabase PostgreSQL (Singapore, Pooler IPv4 :6543 / :5432) ]
               │
               ├─► [ Resend API ] ───────────────► Gửi Email song ngữ (Vi - En)
               ├─► [ Google Apps Script Webhook ] ► Đồng bộ Google Sheets tự động
               ├─► [ Cloudinary CDN ] ────────────► Quản lý & lưu trữ hình ảnh
               ├─► [ VietQR Quicklink ] ──────────► Sinh mã QR chuyển khoản MBBank
               └─► [ SePay / Casso Webhook ] ─────► Đối soát chuyển khoản tự động (/api/webhooks/payment)
```

- **Frontend (Deploy trên Vercel — `vercel.json`):**
  - Core: React `19.0.1`, TypeScript (`~7.0`, target ES2022), Vite `8.3.0`.
  - UI & Styling: Tailwind CSS `v4.3.3` (`@tailwindcss/vite`), Motion (Framer Motion `12.23.24`), Lucide React (`0.546.0`).
  - Router: React Router v7 (`react-router-dom` `7.18.4`).
  - Web Analytics: Vercel Web Analytics (`@vercel/analytics` `^2.0.1`, import `{ Analytics } from '@vercel/analytics/react'` gắn trong `src/App.tsx` bên trong `<BrowserRouter>` để tự động ghi nhận SPA pageview & top routes trên `dva-volleyball-hanoi.com`, không ảnh hưởng hiệu năng tải trang).
  - Internationalization (i18n): `i18next` (`26.5.12`), `react-i18next` (`17.1.9`), `i18next-browser-languagedetector` (`8.2.4`) — English-first `'en'` mặc định, hỗ trợ chuyển đổi song ngữ `'en' | 'vi'`, lưu cache `localStorage` qua key `'dva_lang'`, gồm 4 namespaces: `common`, `news`, `tournaments`, `tryout`.
- **Backend (Deploy trên Render `dva-backend`, Port `10000`):**
  - Runtime & Build: Node.js, Express v4 (`4.21.2`, entry `server/index.ts`; `server.ts` là shim tương thích), `tsx` `4.21.0` (dev), `esbuild` `0.28.2` (bundle ESM production từ `server/index.ts` ra `dist/server.js`).
  - Database & ORM: **Supabase PostgreSQL** (Region: Southeast Asia Singapore `ap-southeast-1`, Runtime kết nối **Transaction Pooler IPv4 cổng `6543`**, CLI dùng `DIRECT_URL` **Session Pooler IPv4 cổng `5432`**, đều kèm `?uselibpqcompat=true&sslmode=require`), Prisma ORM v7 (`7.10.1`: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` `8.23.1`, cấu hình CLI tại `prisma.config.ts`).
  - Security & Crypto: `bcrypt` (`5.1.1`, 10 rounds + fallback legacy `scrypt`), HS256 HMAC JWT token (`crypto`), Default-Deny RBAC + in-memory rate limiter (`server/middlewares/auth.middleware.ts`, `rbac.middleware.ts`, `error.middleware.ts`; `lib/security.ts` là forwarding shim).
- **Tích hợp Dịch vụ ngoài (Third-party Integrations):**
  - **Resend (`resend` `6.35.0`):** Dịch vụ gửi email thông báo đặt sân, đăng ký khoá học, xét tuyển hội viên, lịch hẹn & kết quả Try-Out (kèm link nhóm Zalo/IG), Guest Session, đơn hàng DVA Shop 2 chặng, và đăng ký đội giải đấu (Bilingual template).
  - **Google Apps Script Webhook:** Đồng bộ dữ liệu real-time bất đồng bộ từ API về đúng 1 file Google Spreadsheet duy nhất của CLB (tabs: `DatSan`, `DangKyKhoaHoc`, `TuyenThanhVien`, `DonHang_Shop` với cơ chế Idempotent Upsert chống ghi đúp dòng).
  - **Cloudinary:** Lưu trữ và phân phối hình ảnh sân bãi, cổng vào, VĐV, HLV, tin tức, sản phẩm DVA Shop và logo/banner giải đấu (`optimizeCloudinaryUrl()`).
  - **VietQR Quicklink & Payment Webhook:** Sinh ảnh mã QR động theo chuẩn ngân hàng Việt Nam (MBBank `0002090671521` - `HOANG QUOC DUY`) và đối soát tự động qua `POST /api/webhooks/payment` (SePay / Casso).

---

## 2. 🗺️ Bản đồ Thư mục & Trách nhiệm (Directory Map)

| Đường dẫn Thư mục | Trách nhiệm Cốt lõi & Thành phần Chính |
| :--- | :--- |
| `src/components/` | Thành phần UI phân tách theo phạm vi: <br>• `auth/`: Modal đăng nhập, form cấp lại mật khẩu, OTP.<br>• `common/`: Toast, Modal xác nhận, Dialog thông báo dùng chung, `Pagination.tsx` (component phân trang dùng chung cho bảng/grid dữ liệu), `ShareButton.tsx` (nút chia sẻ link thông minh), `LanguageSwitcher.tsx` (nút chuyển đổi ngôn ngữ dạng Micro Segmented Pill `EN | VI` kèm cờ SVG).<br>• `court-map/`: `HanoiLeafletMap.tsx` (bản đồ Leaflet tương tác, định vị Haversine, marker trạng thái sân) và `SessionStatusBlock.tsx` (hiển thị báo nghỉ theo ngày, thanh quân số theo `dailyOverrides`, vị trí thiếu `OH/MB/OP/S/L`).<br>• `training/`: `CourseDetailModal.tsx` (modal chi tiết khoá học & học viện hỗ trợ deep-linking).<br>• `tournaments/`: `CaptainRegisterModal.tsx`, `MatchScoreboardRow.tsx`, `OfficialAvatar.tsx`, `PoolStandingsTable.tsx`, `TeamLogoBadge.tsx`, `TeamRosterDrawer.tsx`, `TournamentBracketView.tsx`, `TournamentOverviewView.tsx`, `TournamentRulesAndOfficialsView.tsx`, `TournamentScheduleView.tsx`.<br>• `layout/`: Navbar (Floating Capsule tích hợp `LanguageSwitcher` trên Desktop & chân Mobile Drawer; tự động ẩn dropdown profile khi ở trong route `/admin/*`), Footer, Menu Drawer di động. |
| `src/lib/` | Khởi tạo thư viện dùng chung phía Client: <br>• `i18n.ts`: Cấu hình `i18next` + `react-i18next` + `LanguageDetector` (hỗ trợ `'en'` & `'vi'`, `fallbackLng: 'en'`, lưu `localStorage` với key `'dva_lang'`). |
| `src/locales/` | Từ điển bản dịch tĩnh đa ngôn ngữ (`src/locales/{en,vi}/`): <br>• `common.json`: Nhãn điều hướng Navbar, Footer, các nút bấm dùng chung.<br>• `news.json`: Nhãn 7 danh mục tin tức (`NEWS_CATEGORIES`), ô tìm kiếm, phân trang, trạng thái chia sẻ bài viết.<br>• `tournaments.json`: Toàn bộ nhãn giao diện module Giải đấu & Leagues (vòng bảng, bracket, lịch thi đấu, trọng tài, điều lệ, đăng ký đội trưởng).<br>• `tryout.json`: Nội dung & quy chế trang Try-Out (`/information/try-out`), 4 tiêu chí chấm điểm, lịch test và hướng dẫn di chuyển sân 155 Trường Chinh. |
| `src/pages/` | Các trang màn hình chính của ứng dụng: <br>• `AdminDashboardPage.tsx`: File re-export 1 dòng trỏ tới `src/pages/admin/AdminDashboardPage.tsx` (hỗ trợ `React.lazy` code-splitting).<br>• `CourtBookingPage.tsx`: Wizard đặt sân bóng, chọn khung giờ, thanh toán VietQR.<br>• `ShopPage.tsx`: Cửa hàng DVA Shop (`/shop`, `/services/shop`, `/shop/:categorySlug/:productSlug`) với thẻ sản phẩm đổi ảnh mặt trước/mặt sau khi hover, popup Size Guide, Guest Buy-Now Dynamic Order Form (Áo đấu in tên vs Phụ kiện/Bóng, Nhận tại sân BTL Thông Tin miễn phí vs Ship COD), và thanh toán VietQR động (`DVA [CAT_CODE] [ORDER_CODE_SUFFIX]`).<br>• `TournamentsPage.tsx`: Cổng thông tin giải đấu (`/tournaments`, `/tournaments/:slug`, `/tournaments/:slug/:subView`) gồm bảng xếp hạng, nhánh đấu knockout, lịch 2 sân song song (`Court A` / `Court B`), tổ trọng tài, điều lệ và modal đăng ký đội + VietQR (tối ưu responsive di động).<br>• `TryoutPage.tsx`: Trang thông tin & tiêu chí tuyển quân (`/information/try-out`) liên kết trực tiếp tới form đăng ký.<br>• `SkillLevelsPage.tsx`: Trang **Bảng Phân Cấp Trình Độ USAV** (`/information/skill-levels`, Spec 010) hiển thị đơn ngữ (mặc định `🇻🇳 Tiếng Việt`, chuyển nhanh `🇻🇳 Tiếng Việt | 🇺🇸 English` đồng bộ Navbar), 2 liên kết tài liệu gốc USAV, 6 bậc `C → OPEN` và bảng quy đổi `USAV ↔ Youth / Junior / Senior` dẫn tới `/register?level=...`.<br>• `HomePage.tsx`: Trang chủ giới thiệu CLB, tiện ích, lời kêu gọi hành động (CTA).<br>• `TrainingPage.tsx`: Đăng ký khoá huấn luyện bóng chuyền, danh sách HLV, badge `🇺🇸 USAV` khuyến nghị, hỗ trợ deep-linking mở `CourseDetailModal` qua `?courseId=`.<br>• `MemberRegisterPage.tsx`: Biểu mẫu nộp hồ sơ gia nhập CLB / Try-Out (hỗ trợ prefill `?level=` & mở nhanh `/information/skill-levels`).<br>• `PlayersPage.tsx`: Danh sách vận động viên, thông số kỹ thuật, badge & bộ lọc chip theo hạng `skillRank` (`C → OPEN` / `Unranked`).<br>• `NewsPage.tsx` & `NewsDetailPage.tsx`: Tin tức và bài viết chuyên sâu (Editorial layout, chia sẻ bài viết, hiển thị ngày đăng tiếng Anh chuẩn US).<br>• `InformationPage.tsx`: Nội quy CLB, bảng giá, bản đồ chỉ dẫn và liên kết sang `/information/try-out` & `/information/skill-levels`. |
| `src/pages/admin/` | Kiến trúc Quản trị phân tách theo Tab (13 modules / 4 nhóm; RBAC giới hạn `ADMIN` ở `ADMIN_ALLOWED_TABS` 4 tab gồm `OVERVIEW`, `TOURNAMENTS` read-only, `NEWS` không xóa, `APPLICATIONS` không reject; và role `CAPTAIN` có không gian tự quản lý 2 tab riêng `VENUES` (`📅 Lịch Chơi & Slot Ca`) & `CAPTAIN_PROFILE` (`🛡️ Hồ Sơ & Ảnh Đội`) dưới nhóm `ĐỘI CỦA TÔI`): <br>• `AdminDashboardPage.tsx`: Shell điều phối mỏng (chặn `!isHubAllowed` trước khi mount `<AdminDashboardProvider key={currentUser.id}>` chống lỗi `401` khi đổi tài khoản, render Collapsible Sidebar kèm thẻ trạng thái & hỗ trợ cho `CAPTAIN`, Topbar, Banner, ActiveTab).<br>• `context/`, `layout/`, `tabs/` (13 tabs, gồm `VenuesTab.tsx` Master–Detail 2 cột + Accordion + điều khiển 1 chạm theo ngày `dailyOverrides`/`cancelledDates`/`genderRule` & không gian 2 cột cho `CAPTAIN`), `hooks/` (`useAdminData` lazy-load từng tab), `components/` (gồm `RoleAvatarRing.tsx` hỗ trợ 6 role kể cả `CAPTAIN`, `applications/*`, `tournaments/*`, ...), `utils/`. |
| `src/services/` | Lớp giao tiếp API máy khách (`api.ts`): Bao bọc hàm `request<T>()` (kèm guard `401` kiểm tra `endpoint !== '/auth/login' && currentToken === token`), `authService` (`hasToken()`), `memberService` (`updateTryout()`, `evaluate`, `schedule-tryout`, `send-email`), `bookingService`, `trainingService`, `storeService`, `tournamentService`, `venueService`, `sheetsService`, và SWR cache client (`src/utils/swrCache.ts`) cho các trang public. |
| `src/data/` | Dữ liệu tĩnh và mock fallback: `mockData.ts`, danh mục tỉnh thành `vietnamAddressData.ts`, danh sách quốc gia `countries.ts`. |
| `src/types/` | Toàn bộ định nghĩa TypeScript (`index.ts`): User, Role (`GUEST`, `PLAYER`, `CAPTAIN`, `COACH`, `STAFF`, `ADMIN`, `SUPERADMIN`), Player, Court, Booking, ClosedSlot, TrainingCourse, MemberApplication, StoreProduct, StoreOrder, GuestSessionRecord, Tournament*, VolleyballVenue, CourtClubProfile, VenueSessionSlot (`dailyOverrides`, `cancelledDates`, `genderRule`). |
| `src/utils/` | Tiện ích dùng chung phía Client: `cloudinary.ts` (upload ảnh CDN & `optimizeCloudinaryUrl`), `date.ts` (`formatEnglishDate` chuẩn Anh - Mỹ `Month DD, YYYY`), `swrCache.ts` (`createSwrCache`, `invalidateAllSwrCaches`), `venueSchedule.ts` (giờ Việt Nam, `getSessionRealtimeInfo` ràng buộc `selectedDay`, `getSessionDailyState`, `getUpcomingSessionDates`, `getMonthlyQuotaStatus`, conflict checker). |
| `src/shared/` | Logic dùng chung giữa FE và BE: Chuẩn hóa lịch tuần sân bóng (`schedule.ts`), Engine tính BXH/lịch 12–20 trận/cặp đấu/Dream Team giải đấu (`tournaments.ts`), helper lịch hẹn + template email Try-Out (`tryoutEmail.ts`), và bảng chuẩn phân cấp trình độ USAV 6 bậc + quy đổi đội hình DVA (`skillRanks.ts`). |
| `src/config/` | Cấu hình frontend: Đường dẫn API gốc `VITE_API_URL` (`api.ts`). |
| `server/` | Kiến trúc Backend Express module hóa theo domain (entry runtime `server/index.ts`): <br>• `config/`: `env.ts`, `prisma.ts` (Singleton Prisma Client `@prisma/adapter-pg` + `pg.Pool`, `userLookupCache` TTL 5s, DTO mappers + PII stripping `toApplicationDto` / `toTournamentDto`, `ensurePostgreSQLSeeded()`).<br>• `middlewares/`: `auth.middleware.ts` (`PUBLIC_RULES`, `ADMIN_ALLOWED_RULES`, `CAPTAIN_ALLOWED_RULES`, `apiAccessPolicy`), `rbac.middleware.ts` (`requireAuth`, `requireAdminOrSuperAdmin`, `requireCaptainOrSuperAdmin`, `requireSuperAdmin`, `stripSensitiveDataForRole`), `error.middleware.ts` (circuit breaker guard, rate limiter, global error handler).<br>• `modules/`: Tách `*.routes.ts` & `*.service.ts` cho 9 miền (`auth`, `players`, `tryouts`, `tournaments`, `bookings`, `store`, `content`, `integrations`, `venues` — kèm khóa liên hệ & quota đổi ảnh 30 ngày cho `CAPTAIN`).<br>• `utils/`: `bookingHolds.ts` (FinOps hold cleanup & `createDatabaseCircuitBreaker`), `cache.ts` (`appCache` TTL In-Memory Cache + `applyPublicCacheHeaders`), `email.service.ts` (Resend templates & VietQR builder), `schemas.ts`, `validation.ts`, `standings.engine.ts`. |
| `lib/` & `server.ts` | Thin forwarding shims (`export * from '../server/...'` và `server.ts` re-export `./server/index`) duy trì tương thích ngược import cũ sau khi tách module hóa `server/`. |

---

## 3. 🧰 Sổ tay Tái sử dụng Helper & Services (Reusable Utilities)

### 3.1. Dịch vụ Mail & VietQR (`server/utils/email.service.ts`; shim: `lib/mailer.ts`)
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
  - `generateTournamentTransferContent(teamShortOrName: string): string`: Tạo nội dung chuyển khoản VietQR chuẩn giải đấu (`DVA CUP ...`).
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
  - `sendShopOrderConfirmationEmail(order)`: Gửi email Chặng 1 xác nhận đơn hàng DVA Shop (khi khách xác nhận chuyển khoản hoặc Admin duyệt `PAID`), đính kèm chi tiết sản phẩm, size, tên in áo và phương thức nhận hàng.
  - `sendShopOrderShippingEmail(order)`: Gửi email Chặng 2 thông báo giao hàng khi Admin chuyển trạng thái sang `SHIPPED` và bấm *"Send Shipping Update"* (báo hàng đã sẵn sàng nhận tại sân BTL Thông Tin kèm bản đồ/ảnh chỉ dẫn cổng vào, hoặc đang giao qua đơn vị vận chuyển COD).
  - `sendTournamentRegistrationEmail(payload)`: Gửi email xác nhận đăng ký đội giải đấu kèm thông tin thanh toán VietQR.
  - `sendTryoutInvitationEmail(payload)` & `sendTryoutResultEmail(payload)`: Gửi email mời lịch hẹn Try-Out (tính ngày/slot qua `src/shared/tryoutEmail.ts`) và email trả kết quả đánh giá kèm link nhóm Zalo (`SENIOR`/`JUNIOR`) hoặc IG `@_nathan.hq_` (`YOUTH`).

### 3.2. Bảo mật & Phân quyền (`server/middlewares/auth.middleware.ts` & `rbac.middleware.ts`; shim: `lib/security.ts`)
- **Cơ chế Default-Deny (`apiAccessPolicy`):**
  - Mọi endpoint API dưới `/api` **mặc định đều bị chặn (yêu cầu ADMIN hoặc SUPERADMIN)**, trừ các route được khai báo tường minh trong `PUBLIC_RULES`.
  - Tuyệt đối không tự ý mở public các route mang tính chất ghi dữ liệu nhạy cảm nếu không nằm trong chính sách.
- **Quy tắc phân quyền giữa `SUPERADMIN` vs `ADMIN` (`ADMIN_ALLOWED_RULES` & `rbac.middleware.ts`):**
  - `SUPERADMIN` có toàn quyền trên mọi route quản trị (`requireSuperAdmin`), quản lý nhân sự/roles (`/api/admin/users/*`), tài chính/Booking/Store/Players/Training/Courts/Coaches/Sheets, xóa hồ sơ/bài viết và từ chối (`REJECTED`) đơn Try-Out.
  - **`ADMIN` bị giới hạn nghiêm ngặt trong `ADMIN_ALLOWED_RULES` (`auth.middleware.ts`):** Chỉ được phép truy cập `GET /api/admin/overview-summary`, `GET /api/members/applications`, các thao tác Try-Out (`PATCH /api/admin/tryouts/:id`, `PATCH /api/members/applications/:id/status`, `/evaluate`, `/schedule-tryout`, `POST /api/admin/tryouts/:id/send-email`), đọc dữ liệu giải đấu (`/api/tournaments*`), tạo/sửa Tin tức (`POST/PUT /api/news*`, **cấm `DELETE`**), và ký upload Cloudinary (`/api/cloudinary/sign-upload`). Mọi route ngoài phạm vi hoặc thao tác tài chính trả `403`.
  - **Chặn Role `ADMIN` Reject Đơn Try-Out (`server/modules/tryouts/tryouts.service.ts` & `tryouts.routes.ts`):** Hàm `assertCanRejectApplication()` kiểm tra ở cả route lẫn service; nếu `role === 'ADMIN'` gửi `status === 'REJECTED'` (hoặc `conclusion`/`outcome === 'REJECTED'`) trên bất kỳ route nào (`/admin/tryouts/:id`, `/members/applications/:id/status`, `/evaluate`, `/send-email`), server bắt buộc trả **HTTP `403 Forbidden`** (`Only SUPERADMIN can reject applications`).
  - **Ẩn PII & Số liệu Tài chính (`stripSensitiveDataForRole`, `toApplicationDto`, `toTournamentDto`):** Tự động loại bỏ các trường nhạy cảm (`gmail`, `zalo`, `entryFee`, `paymentStatus`, `paidAt`, `captainPhone`, `captainEmail`, `transferContent`, `internalExpenseNote`) khi người dùng là `ADMIN` hoặc công khai.
  - **Route Soft Visibility Toggles:** `PATCH /api/players/:id/visibility` và `PATCH /api/training/courses/:id/visibility` yêu cầu `SUPERADMIN` (`requireSuperAdmin`).
- **Cơ chế Kiểm duyệt Đăng ký Khóa học / Giao lưu (`POST /api/training/register`):**
  - Server kiểm tra trạng thái hoạt động của gói tập được đăng ký: nếu `course.isActive === false`, request bị từ chối ngay lập tức với mã lỗi HTTP 400 (`This training course or scrimmage session is currently inactive and not accepting registrations.`), ngăn chặn việc ghi nhận đơn đăng ký ngoài luồng.
- **Token, Phiên Đăng Nhập & Quản Trị Nhân Sự (`server/modules/auth/`):**
  - Token key trong Storage: `dva_token` (lưu trữ trong `localStorage`).
  - Cấu trúc Header: `Authorization: Bearer <dva_token>`, payload nhúng `tokenVersion`.
  - Middleware `attachAuth`: Giải mã token, truy vấn người dùng qua `userLookupCache` (TTL `5s` + single-flight coalescing trong `server/config/prisma.ts`), đối chiếu đồng thời `user.isActive === true` và `decoded.tokenVersion === user.tokenVersion`; nếu bị khóa hoặc lệch phiên lập tức trả `401 Unauthorized`.
  - **Self-Service cho mọi tài khoản đã đăng nhập:** `POST /api/admin/auth/change-password` (bcrypt 10 rounds, tăng `tokenVersion` + cấp JWT mới) và `PATCH /api/admin/auth/profile` (cập nhật tên hiển thị & `avatarUrl` Cloudinary).
  - **Staff Governance (`SUPERADMIN` only — `requireSuperAdmin`):** `PATCH /api/admin/staff/:id` (cập nhật tên, `avatarUrl`, `role`, `isActive` Khóa/Mở khóa, `forceLogout` đá toàn bộ thiết bị — tự tăng `tokenVersion` và chặn tự khóa/hạ quyền `SUPERADMIN`) và `PATCH /api/admin/staff/:id/reset-password`.
  - **Avatar dùng chung:** Component `RoleAvatarRing` (`src/pages/admin/components/RoleAvatarRing.tsx` — vòng hào quang phân cấp 5 role chuẩn Google Pro 3 lớp, chỉ xoay vòng viền ngoài, lõi ảnh đứng yên) + modal dùng chung `StaffProfileModal` (`src/pages/admin/components/StaffProfileModal.tsx`) tái sử dụng `uploadToCloudinary(file, 'staff')` (`src/utils/cloudinary.ts`) cho cả `AdminHeader` và bảng `Staff & Roles` (`UsersTab.tsx`).

### 3.3. Client API Wrapper & Caching (`src/services/api.ts` & `src/utils/swrCache.ts`)
- **Hàm gọi trung tâm `request<T>()`:**
  - Tự động bổ sung tiền tố `/api` thông qua `getApiUrl(endpoint)`.
  - Tự động lấy `dva_token` từ `localStorage` và đính kèm vào Header `Authorization: Bearer <token>`.
  - **Guard chống `401` Race Condition khi đổi tài khoản:** Nếu nhận mã `401 Unauthorized`, chỉ dọn session (`clearSession()`) và phát `window.dispatchEvent(new Event('dva:session-expired'))` khi `endpoint !== '/auth/login'` **và** token hiện lưu trong `localStorage` vẫn khớp với `token` lúc request được gửi (`currentToken === token`), tránh request cũ làm rớt phiên đăng nhập vừa tạo mới.
  - `authService.hasToken()` giúp kiểm tra nhanh trước khi gọi `authService.me()` hoặc kích hoạt hook dữ liệu Admin (`useAdminData`).
  - Hỗ trợ dữ liệu dự phòng offline (`fallbackData`) nếu backend tạm thời không kết nối được (trừ DVA Shop bỏ mock fallback).
- **Chống Submit trùng lặp (`deduplicatedPost<T>()`):**
  - Quản lý in-flight request qua `Map` để ngăn người dùng click đúp gửi trùng dữ liệu POST (như đặt sân 2 lần cùng một lúc).
- **Client SWR Cache (`src/utils/swrCache.ts`):**
  - `createSwrCache()` kết hợp Memory Map + `sessionStorage` giúp tải tức thì các trang public (`ShopPage`, `PlayersPage`, `TrainingPage`, `NewsPage`, `TournamentsPage`) và tự revalidate nền, kèm `invalidateAllSwrCaches()` khi có mutation.

### 3.4. Điều phối Google Sheets Webhook (`server/modules/integrations/sheets.service.ts` & `scripts/google-apps-script-dva-shop.js`)
- **Nguyên tắc 1 File Google Spreadsheet Duy nhất:**
  - Toàn bộ dữ liệu CLB đổ về **đúng 1 file Google Spreadsheet hiện tại** qua `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`. Không tạo bất kỳ file Google Sheet rời rạc nào khác.
  - Mã nguồn Google Apps Script đầy đủ được lưu tại `scripts/google-apps-script-dva-shop.js` (và đồng bộ trong `src/pages/admin/components/sheets/appsScriptTemplate.ts`). Script sử dụng `SpreadsheetApp.getActiveSpreadsheet()` để tự động tạo các tab con nếu chưa có và thực hiện **Idempotent Upsert** chống ghi đúp dòng theo khóa định danh (`Mã đặt sân`, `Mã đăng ký`, `Mã đơn hàng`).
- **Hàm Dispatcher Bất đồng bộ:**
  - `dispatchGoogleSheetsWebhookAsync(tabName, sheetName, rowData)`: Điều hướng dữ liệu sang Google Apps Script URL.
  - Chạy theo cơ chế hoàn toàn non-blocking (Fire-and-forget), bọc kín trong `void (async () => { try { ... } catch { ... } })()`.
- **Danh sách Sheet / Tab Tiêu chuẩn:**
  1. `DatSan`: Tiếp nhận đơn đặt sân bóng chuyền, lịch ngày, giờ, tiền cọc, trạng thái thanh toán (Upsert theo `Mã đặt sân`).
  2. `Training_Registrations` & `DangKyKhoaHoc`: Tiếp nhận đăng ký khoá học bóng chuyền, học viên, trình độ, ca học (Upsert theo `Mã đăng ký`).
  3. `TuyenThanhVien`: Tiếp nhận đơn xin gia nhập câu lạc bộ, vị trí thi đấu, thông tin cá nhân (Upsert theo `Mã đăng ký`).
  4. `DonHang_Shop`: Tiếp nhận đơn hàng DVA Shop với 19 cột chuẩn (`Thời Gian Nhận`, `Mã đơn hàng`, `Phân loại danh mục`, `Tên sản phẩm`, `Size`, `Số lượng`, `Họ tên khách`, `SĐT`, `Email`, `Instagram/Facebook`, `Hình thức nhận`, `Địa chỉ nhận`, `Chiều cao/Cân nặng`, `Tên in áo`, `Số áo in`, `Tổng tiền (VNĐ)`, `Nội dung CK`, `Trạng thái đơn`, `Ghi chú`). Tự động ghi đè đúng dòng cũ theo `Mã đơn hàng` khi khách báo đã chuyển khoản hoặc khi Admin cập nhật trạng thái đơn sang `PAID`, `SHIPPED`, `COMPLETED`, `CANCELLED`.

### 3.5. Chiến lược Database, Di chuyển Supabase PostgreSQL & Cơ chế Bảo vệ DB (FinOps & Reliability)
- **Kiến trúc Database Production Hiện tại (Supabase PostgreSQL - Cập nhật 18/11/2026):**
  - **Lịch sử chuyển đổi:** Ngày `18/11/2026`, toàn bộ dữ liệu Production (**21 bảng, 491 dòng dữ liệu thật**) đã được migrate 1:1 từ Neon Serverless PostgreSQL sang **Supabase PostgreSQL**, đồng thời sao lưu snapshot JSON cục bộ (`dva_neon_backup_20261118.json`) và xóa hẳn project Neon cũ (hạ Billing về Free `$0.00`).
  - **Thông số Hạ tầng Supabase:**
    - Organization / Project: `DVA Volleyball` / `dva-backend` (Project Ref: `hciiwqmhzlsqgtmodoot`).
    - Region & Compute: **Southeast Asia (Singapore, `ap-southeast-1`)** — Compute Nano.
    - Endpoint kết nối Runtime (Production & Local): **Transaction Pooler (IPv4, cổng `6543`)** tại `aws-1-ap-southeast-1.pooler.supabase.com:6543` kèm query string **`?uselibpqcompat=true&sslmode=require`**, kết hợp `DIRECT_URL` trỏ **Session Pooler IPv4 (cổng `5432`)** cho Prisma CLI (`npx prisma db push` qua `prisma.config.ts`) và `scripts/db-backup.ts`.
    - *Lý do bắt buộc dùng Transaction Pooler `:6543` + `DIRECT_URL :5432` + `uselibpqcompat=true`:* (1) Supabase gói Free (Nano ~381 MB RAM) sẽ phình Memory commitment nếu giữ kết nối Session Pooler 1:1 liên tục, còn Transaction Pooler `:6543` nhả backend Postgres ngay sau mỗi transaction (`@prisma/adapter-pg` không cache named prepared statements và booking lock dùng `pg_advisory_xact_lock` theo transaction); (2) Container backend trên Render chỉ hỗ trợ outbound IPv4 nên cả `DATABASE_URL` lẫn `DIRECT_URL` đều phải đi qua pooler IPv4 thay cho `db.<ref>.supabase.co` IPv6; (3) `uselibpqcompat=true` giúp thư viện `pg` v8+ hiểu đúng `sslmode=require`, triệt tiêu cảnh báo SSL alias.
  - **Bảo mật Truy cập Database:** Public Data API (PostgREST) trên Supabase đã được **TẮT hoàn toàn** cho schema `public`. Toàn bộ đọc/ghi dữ liệu chỉ đi qua Express API (`server/index.ts`) với Default-Deny RBAC (`server/middlewares/auth.middleware.ts`) và Prisma Client (`server/config/prisma.ts`).
  - **Đặc thù & Quy chuẩn Cập nhật Schema Bắt buộc:**
    - Dự án không lưu lịch sử Prisma Migrations ban đầu (zero baseline migration history) và kết nối qua Pooler (không dùng Shadow DB cho `prisma migrate dev`).
    - Khi thêm trường hoặc bảng mới: Bắt buộc dùng giá trị mặc định (`@default(...)`) hoặc trường tùy chọn (`?`) để tương thích ngược 100% với dữ liệu trực tiếp.
    - Quy trình đồng bộ chuẩn: **`npx prisma db push`** (hoặc `npm run prisma:push`) kết hợp **`npx prisma generate`** (`npm run prisma:generate`).
    - **Nghiêm cấm Tuyệt đối:** Không chạy `prisma migrate dev` hoặc truyền các cờ phá hủy dữ liệu (`--force-reset`, `--accept-data-loss`).
- **Tối ưu Connection Pool, Cache & Chống Quá tải DB (FinOps & Circuit Breaker - `server/config/prisma.ts`, `server/utils/bookingHolds.ts`, `server/utils/cache.ts`, `server/index.ts`):**
  - **Tinh chỉnh `pg.Pool` & Singleton (`server/config/prisma.ts`, `server/index.ts`):** Lưu cả `pool` và `prisma` trong `globalForPrisma`, bật `disposeExternalPool: true` trong `PrismaPg` để `prisma.$disconnect()` thực sự gọi `pool.end()`, giới hạn mặc định `max: 5` (tùy biến qua `PG_POOL_MAX`), `connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 10000` (tùy biến qua `PG_POOL_IDLE_TIMEOUT_MS`), bật TCP `keepAlive: true` (`keepAliveInitialDelayMillis: 10000`), cấu hình `ssl: { rejectUnauthorized: false }` cho Cloud DB (`neon.tech`, `render.com`, `supabase.co`, `supabase.com`, `sslmode=require`). Listener `pool.on('error')` chủ động bỏ qua lỗi thu hồi socket nhàn rỗi (`ECONNRESET`, `EPIPE`, `Connection terminated unexpectedly`) để không làm crash Node.js process. Ngoài ra, `userLookupCache` dùng cache RAM ngắn (TTL `5s` + single-flight coalescing, tự xóa cache khi cập nhật/xóa user) và `/api/admin/overview-summary` (`server/modules/integrations/sheets.routes.ts`) chia nhỏ batch truy vấn để tránh tạo spike kết nối đồng thời.
  - **Backend TTL Cache & HTTP Headers (`server/utils/cache.ts`):** `appCache` (`InMemoryTtlCache`, max `400` entries, single-flight coalescing + `invalidateCache(scopes)` khi ghi dữ liệu) giúp giảm số lượt đọc Supabase cho các route public, kết hợp `applyPublicCacheHeaders()` tự gán `Vary: Authorization`, `no-store` cho staff và `max-age` / `stale-while-revalidate` cho khách vãng lai.
  - **Dọn Hold Đặt Sân Theo Yêu Cầu — Không Polling Nền (`createHoldReleaseManager` trong `server/utils/bookingHolds.ts`):**
    - Hủy bỏ hoàn toàn vòng lặp `setInterval` quét DB 24/7; hàm `releaseExpiredHolds()` chỉ chạy **on-demand** khi có request đặt sân/lịch/webhook (`GET /api/bookings`, `POST /api/bookings`, `POST /api/bookings/:id/confirm-payment`, `POST /api/webhooks/payment`).
    - Trang bị single-flight guard (`inFlight`), `15s` cooldown sau mỗi lần chạy thành công, và exponential error backoff (`[30s, 60s, 300s, 900s]`, hoặc `900s` khi gặp lỗi quota `53000` / `P2039`) giúp triệt tiêu spam query & log khi traffic cao hoặc DB gặp sự cố.
  - **Global Database Circuit Breaker (`createDatabaseCircuitBreaker` trong `server/utils/bookingHolds.ts` & `server/middlewares/error.middleware.ts`):**
    - Khi DB báo lỗi quá tải/quota (`53000` / `P2039`) hoặc mất kết nối (`P1001`, `P1002`, `P1017`, `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`), mạch tự ngắt (`OPEN`) trong `20s` (lỗi kết nối) hoặc `60s` (quota) và fast-fail các request `/api/*` bằng HTTP `503` kèm header `Retry-After` thay vì dồn ứ connection pool. Khi hết thời gian cooldown, cho phép request kế tiếp thử kết nối lại (half-open) và đóng mạch (`markSuccess()`) khi DB phục hồi.
  - **Health Check Không Query DB (`GET /health`) & Keep-Alive (`UptimeRobot`):**
    - `GET /health` (Express đồng thời đáp ứng `HEAD /health`, `compressionMiddleware` đã bỏ qua `HEAD`) trả HTTP `200` với `{ status: 'ok', database: dbCircuitBreaker.isOpen() ? 'degraded' : 'ok', uptime, timestamp }` hoàn toàn từ bộ nhớ trong RAM, đảm bảo ping kiểm tra sống server không bao giờ tạo truy vấn ngầm hay tiêu tốn Egress lên Supabase.
    - **Cơ chế giữ thức Render Free bên ngoài (`UptimeRobot`, đã gỡ bỏ `cron-job.org`):** Dự án dùng **UptimeRobot** (`HTTP(s)` monitor) ping `https://dva-backend-jask.onrender.com/health` mỗi **5 phút** (24/7, timeout `30s`) để giữ container Render Free luôn ấm, tránh lỗi cold-start timeout / auto-disable của `cron-job.org`. Tổng thời lượng chạy 24/7 tối đa **744 giờ/tháng** (31 ngày × 24h), an toàn dưới trần 750 giờ/tháng của Render Free với điều kiện tài khoản Render chỉ chạy duy nhất 1 Free Web Service. *Ghi chú vận hành: Nếu về sau phát sinh sự cố quota Render, thêm Free Web Service thứ hai trên cùng tài khoản, đổi domain backend, hoặc chuyển gói trả phí, vào `https://dashboard.uptimerobot.com` → Monitors → `DVA Backend Keep-Alive` để tạm dừng/xóa monitor này.*
  - **Khởi động & Seed Chạy Nền Không Ghi Đè (`server/index.ts` & `server/config/prisma.ts`):** `app.listen(env.port, '0.0.0.0')` mở cổng trước rồi mới gọi `ensurePostgreSQLSeeded()` bất đồng bộ chạy nền, đảm bảo Render cold start nhanh; mọi block seed trong `ensurePostgreSQLSeeded()` đều kiểm tra `count() === 0` (hoặc dùng `update: {}`) để tuyệt đối không ghi đè dữ liệu Admin đã chỉnh sửa.
- **Cơ chế Fallback Dữ liệu & Xử lý Lỗi API (Data Integrity Invariant):**
  - Trong backend (`server/modules/*`) và một số endpoint public, cơ chế fallback trả về JSON (`data/*.json`, `src/data/mockData.ts`) **CHỈ NHẰM MỤC ĐÍCH PHÒNG VỆ CHỐNG SẬP UI KHI MẤT KẾT NỐI**. (Riêng `ShopPage.tsx` đã bỏ hoàn toàn fallback mock để tránh hiển thị sản phẩm đã tắt `isActive`/`isPaused`).
  - Khi kiểm thử tính năng mới, nếu UI xuất hiện mock data giả lập hoặc HTTP `503`, lập trình viên/Agent **BẮT BUỘC** phải kiểm tra log terminal backend trước để truy vết lỗi Prisma/PostgreSQL (`P2022 ColumnNotFound`, mismatch schema, circuit breaker) thay vì ngộ nhận đó là luồng hoạt động bình thường.
- **Cơ chế Soft Visibility (Ẩn/Hiện Nội dung Không Mất Dữ Liệu):**
  - Cả 2 model `Player` và `TrainingCourse` (đại diện cho cả khóa học lẫn các ca giao lưu Scrimmage) đều được bổ sung trường `isActive Boolean @default(true)` kèm chỉ mục `@@index([isActive])`.
  - **Tách biệt Truy vấn Public vs Admin:**
    - Khách vãng lai (`Public`): Các API danh sách `GET /api/players` và `GET /api/training/courses` tự động kẹp điều kiện `where: { isActive: true }`. Phía frontend (`PlayersPage.tsx`, `TrainingPage.tsx`) cũng trang bị lớp phòng vệ kép lọc `p.isActive !== false` và tự động dọn sạch query param khi deep-link trỏ tới khóa học đã bị ẩn.
    - Quản trị viên (`Admin`): Có toàn quyền xem toàn bộ danh sách (cả Active lẫn Hidden), sử dụng bộ lọc nhanh `All | Active | Hidden`, kiểm tra vận động viên thiếu ảnh qua bộ lọc phụ `Missing Avatar`, và chuyển đổi trạng thái tức thì bằng công tắc Toggle Switch trực tiếp trên từng thẻ card.
- **Quy tắc thứ tự cột composite index:** `[Cột lọc =]` → `[Cột lọc khoảng / Range]` → `[Cột ORDER BY]`. Khi viết query mới, `where` + `orderBy` phải khớp tiền tố (prefix) của một index sẵn có.
- **Bản đồ Query ↔ Index chính:**

| Query (vị trí) | `where` / `orderBy` | Index phục vụ |
| :--- | :--- | :--- |
| `GET /api/players` (Public) | `isActive=true, level?` → `level ASC, isCaptain DESC, jerseyNumber ASC` | `Player[level, isCaptain DESC, jerseyNumber ASC]` & `Player[isActive]` |
| `GET /api/training/courses` (Public) | `isActive=true` → `createdAt ASC` | `TrainingCourse[isActive]` |
| `GET /api/bookings` | `courtId, bookingDate` → `createdAt DESC` | `Booking[courtId, bookingDate, createdAt DESC]` |
| `hasBookingConflict()` | `courtId, bookingDate, paymentStatus` | `Booking[courtId, bookingDate, paymentStatus]` / `[.., startTime]` |
| `releaseExpiredHolds()` | `paymentStatus='PENDING', holdExpiresAt <= now` | `Booking[paymentStatus, holdExpiresAt]` |
| Webhook thanh toán | `paymentStatus='PENDING'` → `createdAt DESC` | `Booking[paymentStatus, createdAt DESC]` |
| `hasClosedSlotConflict()` | `courtId, date` | `ClosedSlot[courtId, date]` |
| Training / Member / Admin lists | → `createdAt DESC` | `[createdAt DESC]` trên từng bảng |
| Sheets sync log | `tabName` → `timestamp DESC` | `GoogleSheetsSyncLog[tabName, timestamp DESC]` |

- **Thứ tự sắp xếp VĐV được đảm bảo từ Server:** `GET /api/players` trả về danh sách đã sort sẵn theo `level` (thứ tự enum `SENIOR → JUNIOR → YOUTH`) → Captain đứng đầu → số áo tăng dần. Nhánh fallback JSON (khi DB lỗi) cũng sort cùng thứ tự. Frontend (`PlayersPage.tsx`) không cần sort lại.

### 3.6. Kiến trúc Quản trị Module hóa & Dark Modern Analytics Hub (`src/pages/admin/`)
- **Trạng thái Code sạch, Lazy Loading & Khắc phục `401` Race Condition khi đổi Role:**
  - Kiến trúc chia nhỏ độc lập theo miền nghiệp vụ trong `src/pages/admin/` và nạp dữ liệu **Lazy On-Demand** theo từng tab trong `useAdminData.ts` (khởi tạo chỉ gọi `/api/admin/overview-summary`, chỉ fetch dataset của tab khi mở tab và guard chặt `if (!isAdmin || !authService.hasToken()) return;`).
  - File shell điều phối [`src/pages/admin/AdminDashboardPage.tsx`](src/pages/admin/AdminDashboardPage.tsx) chặn `!isAdmin` **trước** khi mount `<AdminDashboardProvider key={currentUser.id}>` — đảm bảo khi Sign Out `SUPERADMIN` rồi Sign In `ADMIN`, toàn bộ state/hooks được remount sạch với `user.id` mới, triệt tiêu race condition bắn request `401` hay rò dữ liệu cache.
  - File [`src/pages/AdminDashboardPage.tsx`](src/pages/AdminDashboardPage.tsx) giữ vai trò re-export 1 dòng, giúp `src/App.tsx` lazy-load toàn bộ cụm bundle Admin sạch sẽ.
- **Phân quyền Giao diện Admin Hub (`ADMIN_ALLOWED_TABS` trong `constants.ts`):**
  - `SUPERADMIN`: Truy cập đầy đủ 12 tab thuộc 4 phân nhóm: `Overview` (`OVERVIEW`), `Athletics & Services` (`PLAYERS`, `TRAINING`, `COACHES`, `APPLICATIONS`, `COURTS`), `Commerce & Competition` (`BOOKINGS`, `STORE`, `TOURNAMENTS`), `System` (`NEWS`, `SHEETS`, `USERS`).
  - `ADMIN`: Chỉ hiển thị 4 tab được phép trong `ADMIN_ALLOWED_TABS` (`OVERVIEW`, `TOURNAMENTS` ở chế độ read-only, `NEWS` tạo/sửa nhưng không có quyền xóa, `APPLICATIONS` chấm điểm/hẹn lịch nhưng không được `REJECTED`). Trên `OVERVIEW`, hiển thị **Club Operations Overview** (ẩn toàn bộ số liệu tài chính).
- **Cấu trúc Thư mục & Thành phần Chính:**
  - `context/`: `AdminDashboardContext.tsx` lọc `activeModule` theo role, quản lý `handleLogout` (không phát trùng `dva:session-expired` thừa), trạng thái sidebar và modal.
  - `layout/`:
    - `AdminSidebar.tsx`: Fixed Collapsible Sidebar (`fixed top-0 left-0 bottom-0 z-30 h-screen pt-20`, Expanded `256px` / Collapsed `72px` lưu trong `localStorage['dva_admin_sidebar_collapsed']` / Mobile drawer).
    - `AdminQuickSearch.tsx`: Hybrid Hub Navigator (`⌘K` / `Ctrl+K`) tìm kiếm nhanh qua danh sách Modules (lọc theo quyền role), Athletes và Court Bookings.
    - `AdminHeader.tsx`: Topbar chứa nút toggle sidebar, Quick Search bar, thông tin Admin kết nối (Avatar initials, Name, Email, Role badge — dropdown trùng trên `Navbar` ẩn khi ở `/admin/*`), nút `Guest Session Email` (chỉ `SUPERADMIN`), nút Refresh và nút Exit.
    - `FeedbackBanner.tsx`: Thông báo trạng thái và kết quả thao tác thời gian thực.
  - `tabs/`: Các component tab độc lập (tích hợp `Pagination.tsx`):
    - `OverviewTab.tsx`: Đối với `SUPERADMIN`, hiển thị trung tâm phân tích **6-Stream Revenue Analytics** (`verifiedClubRevenue = courtRevenue + storeRevenue + guestSessionRevenue + tryoutRevenue + tournamentRevenue`; `totalClubRevenue = verifiedClubRevenue + trainingRevenue`): (1) Lưới **8 thẻ Metric KPI** (`RevenueKpiCards.tsx` 2×4 kèm toggle *"Verified Cash Only"* / *"Include Est. Tuition"*); (2) Biểu đồ cột chồng SVG 6 tháng (`RevenueTrendChart.tsx`) + thẻ `Service Revenue Share` 6 dòng + bảng `GuestSessionsPanel.tsx`; (3) Khối *"Recent Activity"*.
    - `ApplicationsTab.tsx`: Quản trị quy trình **Try-Out Recruitment & Scorecard** (10 dòng/trang, lọc `statusFilter` & `paymentFilter`), tích hợp `ScheduleTryoutModal.tsx` (hẹn ngày/giờ Try-Out theo 2 khung `18:00 - 19:00` / `13:30 - 14:30` & gửi mail Resend) và `EvaluationScorecardModal.tsx` (chấm 4 tiêu chí 1–5 điểm, chọn kết luận `APPROVED` / `RETEST` / `REJECTED` + gán level kèm tự động chèn link Zalo Senior/Junior hoặc IG `@_nathan.hq_` cho Youth). Tách bạch thanh toán `paymentStatus` (`PENDING | PAID | FREE`) khỏi duyệt đơn `APPROVED` (`SUPERADMIN` chỉnh `entryFee` & `paymentStatus`).
      - **Phân quyền Tryout RBAC:** Role `ADMIN` **ẩn hoàn toàn** nút `Reject` trên bảng danh sách và **ẩn/khóa lựa chọn `REJECTED`** trong `EvaluationScorecardModal` (kèm chặn `403` từ backend).
      - **Sửa nhanh `Level` trên bảng cho `SUPERADMIN`:** Badge cấp độ (`SENIOR` | `JUNIOR` | `YOUTH`) biến thành dropdown chọn nhanh ngay trên từng dòng, gọi `PATCH /api/admin/tryouts/:id` (`memberService.updateTryout`), hiển thị toast xác nhận và đồng bộ trực tiếp với modal `Chấm điểm` / `Hẹn lịch`.
    - `PlayersTab.tsx`, `TrainingTab.tsx`, `BookingsTab.tsx`, `UsersTab.tsx`, `NewsTab.tsx`, `CourtsTab.tsx`, `CoachesTab.tsx`, `SheetsTab.tsx`.
    - `StoreTab.tsx`: Phân hệ quản trị thương mại thể thao DVA Store Phase 2 hoàn chỉnh (Orders Management, audit sync `DonHang_Shop`, gửi email Chặng 2 `SHIPPED`, Products Catalog + Cloudinary ảnh trước/sau + toggle `isPaused`).
    - `TournamentsTab.tsx`: Quản trị toàn diện module Giải đấu & Leagues (Spec 008), điều phối qua 5 panel chuyên biệt trong `src/pages/admin/components/tournaments/`: `TournamentFormModal.tsx` (`HOSTED`/`PARTICIPATING`, thể thức `BO3`/`BO2`/`BO1_25`, giải thưởng, khóa đăng ký/roster), `TeamsFeesPanel.tsx`, `CourtsideMatchesPanel.tsx` (sinh lịch 12 trận vòng bảng hoặc 20 trận 2 sân `Court A`/`Court B`, sửa `matchCode`/`matchOrder`, seed split 3 chặng `seed-quarterfinals` / `seed-semifinals` / `seed-finals`, chấm tỉ số live từng set), `OfficialsPanel.tsx` và `DreamTeamAwardsPanel.tsx` (8 vị trí FIVB Dream Team + giải cá nhân).
  - `hooks/`: `useAdminData` (lazy-load + token/role guards), `useFeedback`, `useAdminMetrics`, `useApplicationActions` (gồm `handleUpdateApplicationLevel` & chặn `REJECTED` phía client khi `!isSuperAdmin`), `useCourtCrud`, `useCourtSlotLock`, `useUsersTab`.
  - `components/`: Sub-components chuyên biệt theo từng miền (bao gồm `applications/*`, `overview/*`, `tournaments/*`, `courts/*`, `bookings/*`, `players/*`, `training/*`, `coaches/*`, `news/*`, `users/*`, `sheets/*`, `GuestSessionEmailModal.tsx`).
  - `utils/`: `scheduleEditor.ts` xử lý logic lịch tuần sân bóng.
- **Mô hình Quản lý State & Bảo toàn Invariant Logic:**
  - **`AdminDashboardContext`:** Quản lý state xuyên suốt bao gồm phiên đăng nhập, tab đang mở (`activeModule`), trạng thái thu gọn sidebar (`isSidebarCollapsed`, `isMobileNavOpen`), dữ liệu từ `useAdminData`, và trạng thái modal.
  - **Bảo toàn 100% Nghiệp vụ Cũ:**
    - Court Booking: Duyệt cọc VietQR, xem lịch tuần, khóa slot lịch.
    - Training & Scrimmages: Quản lý khóa học, danh sách học viên, toggle soft visibility `isActive`.
    - Players: Quản lý danh sách cầu thủ, toggle `isActive`, bộ lọc Missing Avatar.
  - **Chuẩn hóa Ngôn ngữ:** 100% tiếng Anh thể thao chuyên nghiệp cho các nhãn hệ thống (labels, headers, badges, metrics).

### 3.7. Luồng Chia sẻ (`ShareButton`), Deep Linking & Module Tin tức (`News`)
- **Component Chia sẻ Dùng chung (`src/components/common/ShareButton.tsx`):**
  - Tự động nhận diện thiết bị di động để kích hoạt menu chia sẻ bản địa (`navigator.share({ title, text, url })`).
  - Trên máy tính (hoặc khi trình duyệt không hỗ trợ Web Share API), tự động sao chép đường dẫn vào Clipboard (`navigator.clipboard.writeText`), hiển thị nút mặc định `"Share"` (hoặc `"Share Article"` qua prop `label`) và chuyển sang trạng thái phản hồi trực quan `"Link Copied!"` (màu Emerald) trong 2 giây.
- **Deep Linking, Bộ lọc Cấp độ & Chi tiết Khoá học (`src/components/training/CourseDetailModal.tsx` & `src/pages/TrainingPage.tsx`):**
  - Mỗi gói huấn luyện trên `TrainingPage.tsx` hỗ trợ đường dẫn chia sẻ trực tiếp `/training?courseId=<id>`.
  - Khi người dùng truy cập URL có `?courseId=...`, `TrainingPage.tsx` tự động đối chiếu danh sách khóa học và mở `CourseDetailModal` tương ứng; nếu `courseId` không tồn tại hoặc khi người dùng đóng modal / chuyển sang bước đăng ký, query param được dọn sạch (`setSearchParams({}, { replace: true })`).
  - **Bộ lọc Cấp độ (`Filter by Level`):** Cung cấp 4 nấc lọc chuẩn tiếng Anh: `"All Levels"`, `"Beginner / Fundamentals"`, `"Intermediate"`, `"Senior / Advanced & Tactics"`.
  - **Chuẩn hóa Trường Thông số & Nút bấm 100% Tiếng Anh:**
    - Trên thẻ gói tập (`TrainingPage.tsx`): Hiển thị `Target Audience`, `Package Inclusions`, `Schedule`, `Tuition Fee`, `Billing Unit` (ví dụ `/ player / session`), `Max Slots`, `Registered`, `Duration` và nút bấm duy nhất **`"View Details"`** để mở modal chi tiết.
    - Trong `CourseDetailModal.tsx`: Hiển thị đầy đủ `Schedule`, `Duration`, `Max Slots`, `Registered`, `Target Audience`, `Coach In Charge`, `Coach Title`, `Program Overview`, `Package Inclusions`, `Tuition Fee`, `Billing Unit` và nút hành động chính **`"Enroll Now"`** (duy nhất tại modal chi tiết).
    - Tự động chuẩn hóa mọi dữ liệu đơn vị tính học phí (`priceUnit`) và tên khóa học từ DB/fallback sang tiếng Anh thông qua `getPriceUnitLabel()`, `normalizeCoursePublicData()` và `toCourseDto()` (`server/config/prisma.ts`).
- **Luồng Quản trị & Hiển thị Tin tức (`NewsPost`):**
  - **Database & API (`prisma/schema.prisma`, `server/utils/schemas.ts`, `server/config/prisma.ts`, `server/modules/content/*`, `src/services/api.ts`):**
    - Model `NewsPost` lưu trữ trường `publishedAt` (`YYYY-MM-DD`), `createdAt` (`DateTime @default(now())`), `featured` (`Boolean @default(false)`) và **`isPinned`** (`Boolean @default(false)`), phục vụ qua composite index `@@index([isPinned, publishedAt(sort: Desc)])`.
    - Schema kiểm duyệt `NEWS_SCHEMA` sử dụng rule `OPTIONAL_DATE` cho phép client gửi `publishedAt` (hoặc `createdAt`) tùy chỉnh và rule `B` cho phép gửi `isPinned` (boolean tùy chọn) khi tạo mới (`POST /api/news`) và chỉnh sửa (`PUT /api/news/:id`). Khi có ngày tùy chỉnh gửi lên, backend cập nhật đồng bộ cả `publishedAt` lẫn `createdAt`; mapper `toNewsDto` luôn chuẩn hóa và trả về `isPinned: Boolean(n.isPinned)`.
    - `GET /api/news`: Khi truy vấn toàn bộ (không lọc `category` hoặc `category=ALL` và không có `search`), dữ liệu sắp xếp theo `[{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]`; khi lọc theo danh mục cụ thể hoặc từ khóa tìm kiếm, dữ liệu sắp xếp thuần túy theo `[{ publishedAt: 'desc' }, { createdAt: 'desc' }]`.
  - **Hằng số Danh mục Chuẩn Tiếng Anh (`NEWS_CATEGORIES` trong `src/types/index.ts`):**
    - `ALL`: `"All Articles"`
    - `TOURNAMENT`: `"Tournaments & Matches"`
    - `TECHNIQUE`: `"Technique & Biomechanics"`
    - `TRYOUT`: `"Tryouts & Recruiting"`
    - `CLUB_EVENT`: `"Club Events"`
    - `TACTICAL`: `"Tactics & Strategy"`
    - `COMMUNITY`: `"Community & Activities"`
    - `PARTNERSHIP`: `"Partnerships & Sponsors"`
  - **Form Quản trị News trong Admin (`src/pages/admin/components/news/NewsFormModal.tsx` & `src/pages/admin/tabs/NewsTab.tsx`):**
    - Danh sách 7 danh mục chuẩn được đồng bộ từ hằng số dùng chung `NEWS_CATEGORIES` (`src/types/index.ts`).
    - Tích hợp trường chỉnh sửa **"Ngày đăng bài (Publish Date)"** (`input[type="date"]`) vào `NewsFormModal.tsx`, bố trí trên hàng thông tin 3 cột cân đối: `Category` | `Author Name` | `Ngày đăng bài (Publish Date)`.
    - Tích hợp Switch trực quan **"Ghim bài viết lên đầu trang Tất cả (Pin to Top)"** (`newsIsPinned`) ngay phía trên khu vực Cover Image, nạp tự động trạng thái `isPinned` khi chỉnh sửa và gửi lên API khi lưu.
    - Trên danh sách bài viết tại `NewsTab.tsx`, các bài đang ghim được đánh dấu viền nổi bật kèm badge icon `Pin` (`Pinned`) giúp quản trị viên nhận diện tức thì.
  - **Bộ lọc Động, Sorting Engine, Phân trang & Định dạng Ngày Công khai (`src/pages/NewsPage.tsx`, `src/pages/NewsDetailPage.tsx`, `src/pages/HomePage.tsx` & `src/utils/date.ts`):**
    - **Đồng bộ Bộ lọc Category & Nút "All Articles" (100% English Public UI):** `NewsPage.tsx` render động thanh bộ lọc gồm nút đầu tiên **"All Articles" (`ALL`)** cùng đầy đủ **7 danh mục tiếng Anh** từ `NEWS_CATEGORIES`, kết hợp mượt mà với ô tìm kiếm từ khóa (`Search articles...`). Các Card bài viết sử dụng nút `"Read Article →"` và `"Share"` (`"Link Copied!"`).
    - **Sorting Engine (Quy tắc Sắp xếp):**
      - Khi ở tab **"All Articles" (`ALL`)** (và không tìm kiếm): Nhóm bài có `isPinned = true` luôn được ưu tiên hiển thị lên đầu trang (nếu có nhiều bài ghim thì xếp theo `publishedAt` mới nhất), tiếp theo là các bài viết thường sắp xếp theo `publishedAt` giảm dần (mới nhất → cũ nhất). Các bài ghim hiển thị nhãn `PINNED` kèm icon ghim tinh tế trên Card.
      - Khi chọn **Tab Category cụ thể** hoặc khi đang nhập từ khóa tìm kiếm: Tắt độ ưu tiên ghim, sắp xếp toàn bộ thuần túy theo ngày xuất bản mới nhất → cũ nhất.
    - **Phân trang (Pagination):** Giới hạn hiển thị `ITEMS_PER_PAGE = 6` bài/trang (lưới 3 cột cân đối), tích hợp thanh phân trang chuẩn Dark Theme hiển thị `Page X of Y` cùng nút `Previous`, danh sách số trang `[1, 2, 3...]`, `Next`, tự động reset về trang 1 khi đổi bộ lọc/từ khóa và tự động cuộn mượt (`scrollIntoView({ behavior: 'smooth' })`) lên đầu danh sách khi chuyển trang.
    - `NewsDetailPage.tsx` được thiết kế theo chuẩn Editorial 100% tiếng Anh (`← Back to News`, `All Articles`, nhãn `Author`, `Published on`, `Share Article`, ảnh bìa `aspect-video`, khối trích dẫn `excerpt` và nội dung phân đoạn).
    - Chuyển đổi hiển thị ngày xuất bản bài viết (`publishedAt` / `createdAt`) sang định dạng tiếng Anh chuẩn Anh - Mỹ: `Month DD, YYYY` (ví dụ: `"February 28, 2025"`) thông qua hàm `formatEnglishDate()` (`Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })`) tại `NewsPage.tsx`, `NewsDetailPage.tsx` và `HomePage.tsx`.
    - **Cơ chế xử lý Timezone:** Khi parse chuỗi ngày dạng `YYYY-MM-DD` từ database/API, hàm tách trực tiếp `year, month - 1, day` để khởi tạo `new Date(year, month - 1, day)` theo giờ địa phương (local time) thay vì parse UTC mặc định của `new Date("YYYY-MM-DD")`, ngăn chặn triệt để lỗi lùi 1 ngày ở các múi giờ khác nhau.

### 3.8. Kiến trúc Đa ngôn ngữ (i18next) & `LanguageSwitcher` (`src/lib/i18n.ts`, `src/locales/`, `src/components/common/LanguageSwitcher.tsx`)
- **Khởi tạo & Cơ chế Lưu trữ (`src/lib/i18n.ts`):**
  - Tích hợp bộ 3 thư viện `i18next`, `react-i18next` và `i18next-browser-languagedetector`, được nạp trực tiếp tại entry point `src/main.tsx`.
  - Hỗ trợ 2 ngôn ngữ: Tiếng Anh (`en` - mặc định ưu tiên theo tôn chỉ **English-first**) và Tiếng Việt (`vi`).
  - Cấu hình `detection` chỉ đọc lựa chọn tường minh của người dùng từ `localStorage` (`order: ['localStorage']`, `lookupLocalStorage: 'dva_lang'`, `caches: ['localStorage']`) và luôn fallback về `'en'` nếu người dùng chưa từng chọn ngôn ngữ.
  - Việc dịch ngôn ngữ chỉ áp dụng cho **Static UI** (Navbar, Footer, nút bấm, nhãn bộ lọc, placeholder, phân trang, thông báo chia sẻ), hoàn toàn độc lập và không can thiệp vào database hay schema Prisma.
- **Quy chuẩn Cấu trúc Từ điển (`src/locales/{en,vi}/`):**
  - `src/locales/en/common.json` & `src/locales/vi/common.json`: Chứa bản dịch cho `nav` (các liên kết điều hướng trên Navbar, trạng thái tài khoản, nút CTA), `footer` (thông tin CLB, tài khoản VietQR, liên kết nhanh, địa chỉ) và `buttons` dùng chung.
  - `src/locales/en/news.json` & `src/locales/vi/news.json`: Chứa bản dịch cho `header`, `categories` (nhãn `"All Articles"` và 7 danh mục chuẩn `NEWS_CATEGORIES`), `search` (placeholder & empty state), `card`, `pagination` (`Page X of Y`, `Previous`, `Next`), `share` (nút chia sẻ & toast `"Link Copied!"`) và `detail` (`NewsDetailPage`).
  - `src/locales/en/tournaments.json` & `src/locales/vi/tournaments.json`: Từ điển đầy đủ module Giải đấu & Leagues (vòng bảng, nhánh đấu, lịch thi đấu, trọng tài, điều lệ, đăng ký đội trưởng, Dream Team Awards).
  - `src/locales/en/tryout.json` & `src/locales/vi/tryout.json`: Từ điển trang `/information/try-out` (`TryoutPage.tsx`) gồm thông tin lịch Try-Out, 4 tiêu chí đánh giá và hướng dẫn sân.
- **Component `LanguageSwitcher.tsx` (Micro Segmented Pill):**
  - Thiết kế dạng viên thuốc 2 nấc (`EN` | `VI`) siêu nhỏ gọn (`h-8 sm:h-7.5 p-0.5 sm:p-1 rounded-full bg-slate-900/90 border border-slate-800`) tối ưu diện tích trên thanh Navbar và diện tích chạm (touch target `min-w-[36px] sm:min-w-[38px] px-2.5`) trên thiết bị di động.
  - **Tối ưu Cảm ứng Di động & Z-Index:** Khung bọc và nút dùng `relative z-30 pointer-events-auto cursor-pointer select-none touch-manipulation`, các phần tử con (`<svg>`, `<span>`) gắn `pointer-events-none` để mọi thao tác chạm luôn kích hoạt trực tiếp lên `<button>`.
  - **Nấc đang chọn (Active):** Nền chuyển sắc cam thương hiệu (`bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold shadow-sm`), hiển thị kèm cờ SVG inline sắc nét (`w-3.5 h-2.5 rounded-[2px]`): cờ Vương Quốc Anh (`UkFlagIcon` 🇬🇧) khi `EN` active và cờ Việt Nam (`VnFlagIcon` 🇻🇳) khi `VI` active.
  - **Nấc không chọn (Inactive):** Chữ xám mờ (`text-slate-400 hover:text-slate-200 text-xs font-semibold`), tự động ẩn cờ để tiết kiệm không gian và tạo độ tương phản rõ nét, chuyển cảnh mượt (`transition-all duration-200 ease-out`).
  - **Vị trí Tích hợp trên `Navbar.tsx`:** Hiển thị trực tiếp trên thanh Topbar cố định (cả Mobile lẫn Desktop/Tablet, nằm ngay cạnh nút Hamburger / cụm tài khoản) để người dùng đổi ngôn ngữ tức thì mà không cần mở menu, đồng thời hiển thị thêm ở phần chân (footer) của Mobile Menu Drawer.

### 3.9. Kiến trúc Module DVA Shop (Phase 2 & Phase 2.1 Refinements)
- **Data Models (`prisma/schema.prisma`):**
  - `Product`: `id`, `slug` (URL slug thân thiện SEO), `name`, `categoryId`, `price`, `originalPrice` (giá gốc trước giảm), `isPaused` (tạm dừng kinh doanh/hết hàng tạm thời), `frontImage`, `backImage`, `sizes` (mặc định `["S", "M", "L", "XL", "2XL"]`), `description`.
  - `Order`: `id`, `orderCode`, `quantity` (số lượng mua), `totalAmount`, `status` (`PENDING` | `PAID` | `SHIPPED` | `CANCELLED`), `transferContent` (`DVA [CAT_CODE] [SUFFIX]`), `customName` (chỉ in Player Name), `fulfillmentType` (`COURT_PICKUP` | `HOME_DELIVERY`), `pickupLocation`, `shippingAddress`, `note`.
- **Định tuyến & Phân cấp URL (`src/App.tsx`, `src/types/index.ts`):**
  - Trang cửa hàng chính: `/shop` (hoặc alias `/services/shop`).
  - Trang chi tiết sản phẩm chuẩn SEO: `/shop/:categorySlug/:productSlug` (ví dụ `/shop/mens-sleeveless/dva-pro-jersey-2026`). Helper ánh xạ hai chiều `getCategoryUrlSlug()` và `getCategoryFromUrlSlug()`.
- **Trải nghiệm Khách hàng & Tinh chỉnh UX (Phase 2.1 & Volleyball World Card Architecture):**
  - **Bố cục Card Compact (Volleyball World Style):** Lưới responsive 2 cột trên điện thoại (`grid-cols-2 gap-3`), 4 cột trên desktop (`lg:grid-cols-4`). Loại bỏ snippet mô tả văn bản ngoài card giúp card ngắn gọn, vuốt mượt mà.
  - **Tỷ lệ ảnh chuẩn `aspect-[4/5]`:** Khóa cứng tỷ lệ thời trang thể thao 4:5 cho ảnh card, modal Quick View và trang chi tiết với `object-cover object-center`.
  - **Floating Quick View Button:** Nút icon con mắt bán trong suốt nổi ở góc dưới ảnh bìa, hover/touch hiển thị tức thì.
  - **Sản phẩm Bóng thi đấu Mikasa V200W (FIVB Official):** Hạng mục `VOLLEYBALLS` (Bóng thi đấu chính thức tiêu chuẩn FIVB Olympic, Size 5).
  - **Dynamic Form thông minh:** Đối với bóng Mikasa V200W và phụ kiện không cần chọn size: tự động ẩn toàn bộ selector size (S/M/L/XL), nút Size Guide, chiều cao/cân nặng và ô in tên áo; chỉ hiển thị bộ chọn số lượng (Quantity: 1, 2, 3...) và phương thức nhận hàng (Sân 155 Trường Chinh vs Ship COD).
  - **High-Res Lightbox Zoom:** Trình phóng to ảnh chi tiết (1x → 3x, drag pan, toggle front/back) cho cả ảnh trước và sau.
  - **Bảng Size & Tùy biến:** Bỏ size `XS` (dải size chuẩn: `S, M, L, XL, 2XL`). Tùy biến in áo: BỎ trường số áo, CHỈ GIỮ trường `"PLAYER NAME"`.
  - **Bộ chọn số lượng (Quantity Selector):** Cho phép chọn 1, 2, 3... tự động nhân tổng tiền (`price * quantity`), kèm lưu ý các áo trong cùng 1 đơn sẽ áp dụng chung size và tên in (đặt riêng nếu khác thông số).
  - **Giao nhận:** Mặc định miễn phí nhận tại sân `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"`. Khi tick "Home Delivery" mới mở ô nhập địa chỉ nhận hàng kèm ghi chú khách tự thanh toán cước COD khi nhận.
  - **Chính sách Giá & Giảm giá:** Khi `originalPrice > price`, hiển thị giá gốc gạch ngang bên cạnh giá khuyến mãi kèm badge giảm giá (`-XX%`), áp dụng `whitespace-nowrap` chống rớt dòng chữ "đ".
  - **Trạng thái Tạm dừng (`isPaused`):** Hiển thị badge `"Temporarily Out of Stock / Coming Back Soon"` và vô hiệu hóa nút `"Buy Now"`.
- **Tự động Đồng bộ Google Sheets (`DonHang_Shop`):**
  - Sử dụng chung 1 file Google Spreadsheet của CLB qua Webhook Google Apps Script (`scripts/google-apps-script-dva-shop.js`).
  - Tự động tạo tab `DonHang_Shop` với 19 cột tiêu chuẩn.
  - Cơ chế **Idempotent Upsert** theo `Mã đơn hàng`: Khi cập nhật trạng thái đơn sang `PAID` hoặc `SHIPPED`, hệ thống tự ghi đè cập nhật đúng dòng tương ứng, tuyệt đối không sinh dòng rác trùng lặp.
- **Quản trị Cửa hàng (`StoreTab.tsx`):**
  - Tab con quản lý: `Orders Management & VietQR`, `Products & Inventory`, `Categories & Merch`.
  - Form sản phẩm: Chỉnh sửa Tiêu đề, Slug, Rich Text/Markdown Description, Giá gốc & Giá bán thực tế (kèm preview % giảm giá trực tiếp), Toggle trạng thái kinh doanh (`isPaused`).
  - Quản lý đơn hàng: Tra cứu theo mã đơn, lọc theo trạng thái, nút duyệt thanh toán (`PAID`), nút xác nhận giao hàng (`SHIPPED`) và kích hoạt gửi email Chặng 2.

### 3.10. Kiến trúc Module Tournaments & Leagues (Spec 008)
- **Data Models (`prisma/schema.prisma`):**
  - 5 model được đồng bộ additive-only: `Tournament`, `TournamentTeam`, `TournamentPlayer`, `TournamentMatch`, `TournamentOfficial` (cùng 6 enums `TournamentMode`, `TournamentTrackingMode`, `TournamentStatus`, `MatchStage`, `MatchStatus`, `OfficialRole`).
  - Tách biệt rõ 2 chế độ: **`HOSTED`** (giải đăng cai, mở đăng ký đội trưởng + VietQR, chỉ đội `PAID` tính vào doanh thu) và **`PARTICIPATING`** (giải đi khách, hỗ trợ `FULL_BRACKET` & `DVA_FOCUS`, tuyệt đối không tính tiền thưởng hay lệ phí vào doanh thu).
- **Engine Dùng Chung (`src/shared/tournaments.ts` & `server/utils/standings.engine.ts`):**
  - Hỗ trợ 3 thể thức set đấu (`TOURNAMENT_SET_FORMATS`): **`BO3`**, **`BO2`**, và **`BO1_25`** (1 set chạm 25 điểm cách 2 điểm).
  - `computePoolStandings()`: Tính bảng xếp hạng vòng bảng `BO3` / `BO2` / `BO1_25` theo thứ tự `Wins -> FIVB Points -> Set Ratio (chống chia 0 bằng nhân chéo) -> Point Ratio -> Head-to-Head -> manualRankOverride / seedOrder`.
  - `buildGroupStage12MatchPlan()` & `buildStandard20MatchPlan()`: Sinh lịch 12 trận vòng bảng hoặc bộ 20 trận chuẩn 1 ngày xen kẽ trên 2 sân song song (`Court A` & `Court B`, chuẩn hóa qua `normalizeTournamentCourtName()`), kèm 4 trận Tứ kết (`QF1: 1A-4B`, `QF3: 3A-2B`, `QF2: 2A-3B`, `QF4: 4A-1B`), 2 Bán kết, Tranh Hạng 3 và Chung kết.
  - `resolveDefaultTournament()`: Chọn giải mặc định theo thứ tự `ONGOING -> nearest UPCOMING -> most recent COMPLETED`.
- **Bảo mật, Seeding & Đối soát Thanh toán (`server/modules/tournaments/*`, `server/middlewares/auth.middleware.ts`, `server/config/prisma.ts`, `server/utils/email.service.ts`):**
  - `PUBLIC_RULES` chỉ mở đọc `/api/tournaments*`, đăng ký đội `POST /api/tournaments/:slugOrId/register` (rate-limit `publicWriteLimiter`, khóa suất theo số đội `PAID` trong transaction) và `confirm-payment`.
  - Split bracket seeding routes (`requireSuperAdmin`): `POST /api/admin/tournaments/:id/seed-quarterfinals` (cùng `/tournaments/:id/seed-knockout`), `/api/admin/tournaments/:id/seed-semifinals`, `/api/admin/tournaments/:id/seed-finals` (chống đè trận đã `LIVE`/`COMPLETED` trừ khi bật `forceOverride`), kèm sửa `matchCode`/`matchOrder` trên `CourtsideMatchesPanel.tsx`.
  - `toTournamentDto(..., includePrivate)` tự động strip toàn bộ PII (`captainPhone`, `captainEmail`, `official.phone`, `transferContent`, `entryFeeAmount`, `internalExpenseNote`, `birthYear`, `rejectionReason`) và ẩn đội chưa `PAID` của giải `HOSTED` khi `!isStaff(req.user)`.
  - `POST /api/webhooks/payment` tự động đối soát `TournamentTeam` theo `transferContent` (`DVA CUP <TEAM> <4RAND>`) và cập nhật `PAID` + `paidAt`.
- **Tài chính Admin Overview (Phương án A):**
  - Giữ nguyên lưới 8 thẻ KPI (2×4) trên `RevenueKpiCards.tsx`; cộng `tournamentRevenue` (`HOSTED` & `PAID`) vào `verifiedClubRevenue` (`Total Revenue`) và cộng đội chờ duyệt vào `Pending Approvals`.
  - Hiển thị 6 dòng doanh thu (`Court Bookings`, `DVA Store`, `Guest Sessions`, `Tryout Fees`, `Tournament Fees` `#EC4899`, `Est. Training Tuition`) trong `Service Revenue Share` (`OverviewTab.tsx`) và `RevenueTrendChart.tsx`.
  - `useAdminData.ts` nạp payload nhẹ `/api/admin/overview-summary` + `/api/admin/tournaments/finance-summary` và lazy-load full danh sách giải đấu khi mở tab `TOURNAMENTS` (`TournamentsTab.tsx`).
- **Routing Public, Dream Team & Responsive Mobile (`src/App.tsx`, `src/pages/TournamentsPage.tsx`, `src/components/tournaments/*`, `src/index.css`):**
  - Các route `/tournaments`, `/tournaments/:slug`, `/tournaments/:slug/:subView` (`overview | bracket | schedule | rules | officials`) map vào `TournamentsPage` với **Tournament Switcher**, **Team Roster Drawer**, **Dream Team Awards** (`DreamTeamAwardsPanel.tsx`), **`MatchScoreboardRow.tsx`**, **`PoolStandingsTable.tsx`**, **`OfficialAvatar.tsx`**, nâng cấp **`TournamentRulesAndOfficialsView.tsx`**, **Modal Đăng ký đội trưởng + VietQR**, và polling 15s khi `status === 'ONGOING'`.
  - **Chuẩn Responsive Mobile (`< 640px`):**
    - `TournamentsPage.tsx`: Header card gắn `overflow-hidden`, `<select>` gắn `w-full min-w-0 max-w-full truncate appearance-none pr-9 sm:pr-10 box-border` kết hợp gradient mask trước `<ChevronDown>` (cộng thêm CSS `select.appearance-none::picker-icon { display: none; }` trong `src/index.css`) chống tràn khung phải; tab điều hướng xếp `grid-cols-2 sm:flex`.
    - `TournamentScheduleView.tsx` & `MatchScoreboardRow.tsx`: Metadata thanh tiêu đề trận (`matchCode`, `Court A` / `Court B`, giờ đấu, trạng thái) giữ `whitespace-nowrap shrink-0` (`inline-flex items-center gap-1 whitespace-nowrap`) tránh rớt chữ `"A"`/`"B"`; trên mobile `< 640px`, giữ bố cục đối xứng `[Logo 1] [Tên 1] — [Tỉ số] — [Tên 2] [Logo 2]` nhưng tách các badge tiến vòng dài xuống dải pill bên dưới cặp đấu (`flex sm:hidden`, desktop giữ `hidden sm:flex`) để tên đội không bị cắt chữ.
  - `CloudinaryModule` bổ sung `'tournaments'`, dùng `optimizeCloudinaryUrl(url, 96)` cho logo nhánh đấu/BXH và `'thumb'` trong Drawer.

### 3.11. Kiến trúc Module Try-Out & Member Recruitment (`TryoutPage`, Scorecard & RBAC)
- **Public Info & Registration (`src/pages/TryoutPage.tsx`, `src/locales/{en,vi}/tryout.json`, `src/pages/MemberRegisterPage.tsx`):**
  - Route `/information/try-out` (`TryoutPage`) cung cấp thông tin chi tiết về lịch Try-Out tiêu chuẩn (`TRYOUT_TIME_PRESETS`: `18:00 - 19:00` Thứ 2/4/6/7 & `13:30 - 14:30` Chủ Nhật tại `155 Trường Chinh`), 4 tiêu chí chấm điểm (`TRYOUT_CRITERIA_LABELS`), sơ đồ sân và nút CTA trực tiếp tới `/register`.
  - Hỗ trợ `POST /api/members/register` & `/api/members/apply` (`publicWriteLimiter`) với schema riêng cho `source === 'TRYOUT_PAGE'` (`TRYOUT_REGISTER_SCHEMA`) và form đầy đủ (`MEMBER_REGISTER_SCHEMA`).
- **Shared Try-Out Helpers & Templates (`src/shared/tryoutEmail.ts`):**
  - `getTryoutDayInfo()` (parse ngày `YYYY-MM-DD` theo giờ địa phương), `getNextTryoutDateString()`, `buildTryoutInvitationEmailHtml()` (email hẹn lịch Try-Out), và `buildTryoutResultEmailHtml()` (tự động gắn link nhóm Zalo `SENIOR`/`JUNIOR` hoặc IG `@_nathan.hq_` cho `YOUTH`).
- **Backend Try-Out APIs & Strict RBAC (`server/modules/tryouts/tryouts.{routes,service}.ts`, `prisma/schema.prisma`):**
  - Model `MemberApplication` lưu `paymentStatus` (`PENDING` | `PAID` | `FREE`), `paidAt`, `entryFee`, `experience`, `preferredDays`, `evaluationScores` (Json 4 tiêu chí), `coachNotes`, `scheduledDate`, `scheduleHistory`, `resultEmailSentAt`, `resultEmailHistory`.
  - Tách biệt thanh toán (`entryFee` & `paymentStatus` do `SUPERADMIN` quản lý qua `/members/applications/:id/entry-fee` và `/payment-status`) khỏi kết quả duyệt chuyên môn (`APPROVED` tự động tạo/promote bản ghi `Player` tương ứng). `tryoutRevenue` tính theo `paymentStatus === 'PAID'` (hoặc `APPROVED` chưa miễn phí) trong `useAdminMetrics.ts`.
  - **Chặn `ADMIN` Reject Đơn (`assertCanRejectApplication`):** `role === 'ADMIN'` được phép xem danh sách (đã strip PII `gmail`/`zalo`/`entryFee`/`paymentStatus` trong `toApplicationDto`), chấm điểm 4 tiêu chí, đề xuất `APPROVED`/`RETEST`, đổi `level` (qua modal chấm điểm) và gửi mail hẹn lịch/kết quả không phải `REJECTED`; mọi yêu cầu `REJECTED` từ `ADMIN` trên `PATCH /api/admin/tryouts/:id`, `PATCH /api/members/applications/:id/status`, `/evaluate`, hoặc `POST /api/admin/tryouts/:id/send-email` đều bị chặn với HTTP **`403 Forbidden`** (`Only SUPERADMIN can reject applications`).
  - **Sửa Nhanh `Level` cho `SUPERADMIN`:** `PATCH /api/admin/tryouts/:id` (`TRYOUT_PATCH_SCHEMA`) cho phép `SUPERADMIN` đổi trực tiếp `SENIOR` / `JUNIOR` / `YOUTH` ngay trên bảng `ApplicationsTab.tsx` kèm Toast xác nhận và đồng bộ live sang `EvaluationScorecardModal` & `ScheduleTryoutModal`.

### 3.12. Hệ Thống Phân Cấp Trình Độ USAV Toàn Hệ Thống (`Spec 010`)
- **Database (`prisma/schema.prisma` — Additive-Only):** Bổ sung `Player.skillRank`, `MemberApplication.skillRank` (`C` | `B` | `BB` | `A` | `AA` | `OPEN` | `null`), `TrainingCourse.skillRankLabel` và `VenueSessionSlot.skillRankLabel`.
- **Shared Metadata (`src/shared/skillRanks.ts`):** Định nghĩa tập trung 6 bậc `SKILL_RANK_LIST`, màu sắc badge, preset `RECOMMENDED_SKILL_RANK_PRESETS`, bảng quy đổi `DVA_SQUAD_USAV_MAPPING` (`Youth: C – B`, `Junior: B – BB`, `Senior: BB – A / AA`) và helper `normalizeSkillRank` / `deriveDefaultUsavRangeForLevel`.
- **Public & Admin Sync:**
  - `/information/skill-levels` (`SkillLevelsPage.tsx`): Hiển thị đơn ngữ (mặc định `vi`, chuyển đổi qua Segmented Pill `🇻🇳 Tiếng Việt | 🇺🇸 English` đồng bộ `i18n.on('languageChanged')`), trích dẫn trực tiếp quy chế & PDF điều lệ 2026 của USA Volleyball, và liên kết `/register?level=...`.
  - `PlayersPage` & `PlayersTab`: Hiển thị badge phân cấp bấm được về `/information/skill-levels`, bộ lọc chip theo hạng `C → OPEN / Unranked`, và dropdown chỉnh nhanh `PATCH /api/players/:id` cho `SUPERADMIN`.
  - `EvaluationScorecardModal` & `tryouts.service.ts`: Chọn `skillRank` ngay lúc chấm điểm/duyệt Try-Out, tự động ghi sang `Player.skillRank` khi duyệt `APPROVED` và đồng bộ nếu cập nhật lại sau duyệt.
  - `TrainingPage`, `CourseFormModal`, `CourtMapPage`, `CourtClubDetailPage`, `VenuesTab`: Gắn nhãn `🇺🇸 USAV: ...` (kể cả trong trình tạo tin tuyển quân nhanh & preview của `CAPTAIN`).

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

### 4.3. Quy chuẩn Ngôn ngữ Giao diện Công khai & Email (English-First & Public UI 100% English Policy)
- **English-First & Public UI 100% English Policy (`i18next` & Dynamic Data Normalization):**
  - Toàn bộ giao diện người dùng đọc (Public Facing UI) trên tất cả các trang (`HomePage`, `Navbar`, `Footer`, `NewsPage`, `NewsDetailPage`, `TrainingPage`, `CourseDetailModal`, `CourtBookingPage`, `PlayersPage`, `InformationPage`, `TryoutPage`, `MemberRegisterPage`, `TournamentsPage`, `ShopPage`, `CountrySelect`, `VietQRModal`, `AuthModal`) khởi tạo và hiển thị **100% bằng Tiếng Anh (`lng: 'en'`, `fallbackLng: 'en'`)**.
  - **Static UI:** Toàn bộ Header, Footer (`Opening Hours`, `Court Location`, `All rights reserved`), Navbar, Menu, Nút bấm (CTA), Nhãn (`labels`), Bộ lọc (`filters`), Thanh phân trang (`pagination`), Placeholders ô nhập liệu, Tiêu đề modal và Thông báo toast/alert đều chuẩn hóa 100% tiếng Anh thể thao chuyên nghiệp.
  - **Dynamic UI & Seed/Mock/DB Fallback:**
    - Dữ liệu mẫu (`src/data/mockData.ts`, `data/trainingCourses.json`, `data/players.json`, `data/courts.json`) và các DTO mapper (`server/config/prisma.ts`, `src/services/api.ts`) chuẩn hóa 100% sang tiếng Anh cho các trường hiển thị công khai (tên khóa học, đơn vị học phí `/ player / session`, địa chỉ sân, quê quán cầu thủ `Hanoi`, `Ho Chi Minh City`, `Da Nang`...).
    - Vị trí thi đấu chuẩn hóa thống nhất: `Setter`, `Outside Hitter`, `Opposite Spiker`, `Middle Blocker`, `Libero`, `Head Coach`.
    - Trạng thái hiển thị công khai (Soft Visibility): Nhãn trạng thái quản trị và thông báo (`Active / Published`, `Hidden`, `All`, `Missing Avatar`) cùng các thông báo lỗi khi truy cập gói tập đã bị ẩn (`The requested training program or scrimmage session is currently unavailable or inactive.`) đều viết 100% bằng tiếng Anh chuẩn mực.
    - Trang Đặt sân (`CourtBookingPage.tsx`) hiển thị 100% tiếng Anh cho trạng thái sân (`Available`, `Booked`, `Maintenance`, `Peak Hours`, `Standard Hours`), quy trình đặt sân (`Select Court`, `Select Date & Time`, `Full Name`, `Phone Number`, `Confirm Reservation`) và tên sân con (`Court A`, `Court B` qua helper `formatSubCourtLabel` trong khi vẫn bảo toàn giá trị nội bộ `'Sân A'` / `'Sân B'` để tương thích tuyệt đối với API/DB).
- **Email HTML (Bilingual):**
  - Trong email HTML gửi tự động qua Resend: Tiêu đề, lời chào và bảng thông tin tóm tắt giữ định dạng song ngữ Anh - Việt rõ ràng để phục vụ cả hội viên quốc tế lẫn nội địa.

---

## 5. ⚡ Nguyên tắc Kỹ thuật Bất di bất dịch (Engineering Commandments)

Mọi lập trình viên và AI Agent khi làm việc với codebase này bắt buộc phải tuân thủ nghiêm ngặt các nguyên tắc sau:

1. **Fire-and-Forget An toàn Tuyệt đối cho 3rd Party Services:**
   - Mọi tác vụ gửi email (`Resend`), webhook đồng bộ bảng tính (`Google Apps Script`), hay gửi log ngoài **BẮT BUỘC** phải chạy bất đồng bộ tách biệt (`void (async () => { ... })()`).
   - Phải bọc toàn bộ trong khối `try/catch` độc lập.
   - **TUYỆT ĐỐI KHÔNG** để lỗi kết nối mạng hoặc phản hồi chậm của dịch vụ bên thứ ba làm nghẽn tiến trình hoặc làm sập HTTP response `200` trả về cho máy khách.

2. **Bảo toàn Cơ sở Dữ liệu & Quy chuẩn Đồng bộ Supabase PostgreSQL:**
   - **TUYỆT ĐỐI KHÔNG** tự ý xóa bảng, xóa cột hoặc thực hiện các thay đổi phá hủy dữ liệu (destructive breaking changes) trên Prisma schema.
   - Thêm trường/bảng mới bắt buộc sử dụng các mẫu tương thích ngược (giá trị mặc định an toàn `@default(...)` hoặc trường tùy chọn `?`).
   - Kết nối Runtime chạy qua **Supabase Transaction Pooler IPv4 (cổng `6543`)** và Prisma CLI dùng `DIRECT_URL` **Session Pooler IPv4 (cổng `5432`)**, đều kèm `?uselibpqcompat=true&sslmode=require` (không dùng Shadow DB cho `prisma migrate dev`); quy trình đồng bộ schema chuẩn của dự án là **`npx prisma db push`** kết hợp **`npx prisma generate`**. Tuyệt đối không dùng các cờ nguy hiểm (`--force-reset`, `--accept-data-loss`).
   - **FinOps & Chống Quá tải DB:** Không thêm vòng lặp `setInterval` polling DB nền hay query DB trong `GET /health`; giữ mọi tác vụ dọn dẹp (`releaseExpiredHolds`) ở chế độ on-demand có cooldown + circuit breaker (`server/utils/bookingHolds.ts`).

3. **Chống Ghi Đè & Xung Đột Dữ Liệu (Idempotency & Race Conditions):**
   - Đặt sân bóng và đóng slot phải luôn kiểm tra xung đột thời gian (`ClosedSlot` và `Booking` trùng lặp) trước khi ghi nhận.
   - Ở phía frontend, luôn sử dụng cơ chế debounce / `deduplicatedPost` để ngăn người dùng vô tình bấm nhiều lần liên tiếp gây trùng dữ liệu.

4. **Chuẩn hoá Chuỗi Thanh toán Ngân hàng:**
   - Mọi chuỗi thông tin chuyển khoản phát sinh khi tạo VietQR bắt buộc phải đi qua hàm `removeVietnameseTones()` để loại bỏ hoàn toàn ký tự có dấu, dấu cách thừa và ký tự đặc biệt, đảm bảo hệ thống tự động nhận diện thanh toán của ngân hàng hoạt động chính xác 100%.

5. **PostgreSQL là Nguồn Chân lý Duy nhất (Single Source of Truth):**
   - Mọi thao tác đọc/ghi dữ liệu nghiệp vụ (Bookings, Member Applications, Closed Slots, Training Registrations, Users) chạy trực tiếp 100% qua Prisma ORM tới PostgreSQL.
   - Không duy trì cơ chế ghi file JSON dự phòng cục bộ (`bookings.json`, `applications.json`, `closedSlots.json`, `trainingRegistrations.json`) khi có mutation, tránh hiện tượng chia rẽ dữ liệu (split-brain) và hao tổn I/O trên môi trường container ephemeral disk (Render).

6. **English-First & Public UI 100% English Policy (Chuẩn hóa Tiếng Anh 100% cho Giao diện Public):**
   - Toàn bộ phần giao diện hiển thị cho người dùng cuối trên các trang Public — bao gồm cả **Static UI** (Header, Footer, Navbar, Menu, CTA buttons, labels, filters, pagination, input placeholders, modal titles, toast/alert messages) lẫn **Dynamic UI / Seed / Fallback Data** (định dạng ngày tháng, đơn vị tính học phí, trạng thái sân, cấp độ lớp học, vị trí thi đấu, quyền lợi gói tập mẫu) — **BẮT BUỘC PHẢI VIẾT BẰNG TIẾNG ANH 100%**.
   - Từ nay, mọi component mới hoặc dữ liệu hiển thị cho người dùng cuối bắt buộc phải viết bằng tiếng Anh; tuyệt đối không dùng tiếng Việt hoặc pha trộn song ngữ nửa Anh nửa Việt trên màn hình Public UI.

7. **Đồng bộ Tài liệu Kiến trúc (`./ARCHITECTURE.md`) Bắt buộc:**
   - Bất kỳ khi nào thêm mới, chỉnh sửa hay mở rộng tính năng trên hệ thống, **BẮT BUỘC** phải cập nhật lại file `./ARCHITECTURE.md` tương ứng để các phiên làm việc tiếp theo luôn nắm bắt chuẩn xác kiến trúc, luồng dữ liệu và quy ước của dự án.
