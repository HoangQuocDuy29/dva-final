<div align="center">

# 🏐 DVA VOLLEYBALL CLUB PLATFORM
### Nền tảng Quản lý, Đặt sân, Học viện, DVA Shop & Giải đấu — DVA Volleyball Club

[![Tech Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Express%204%20%7C%20Prisma%207%20%7C%20Supabase-blue.svg)](#-công-nghệ-sử-dụng)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-black.svg)](#-kiến-trúc-triển-khai-production)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL%20(Singapore)-3ECF8E.svg)](#-thay-đổi--kiến-trúc-database-mới-nhất-112026)

</div>

> **Tài liệu chi tiết cho kỹ sư & AI Agent:** Xem thêm [ARCHITECTURE.md](ARCHITECTURE.md) (Bản đồ ngữ cảnh chi tiết toàn bộ luồng dữ liệu, helper, index DB, design tokens và các quy chuẩn hệ thống) và [.cursorrules](.cursorrules).

---

## 📌 Giới thiệu dự án

**DVA Volleyball Club Platform** là hệ thống web fullstack (monorepo TypeScript) phục vụ vận hành toàn diện cho Câu lạc bộ Bóng chuyền DVA tại Hà Nội:

- **Đặt sân trực tuyến (Court Booking):** Quản lý đa sân & sân con (`BTL Thông Tin - Sân A / Sân B`, `Thể Công`, `Mỹ Đình`), kiểm tra trùng lịch / slot khóa, giữ chỗ 15 phút và thanh toán VietQR.
- **Đào tạo, Try-Out & Tuyển sinh (`Training`, `Try-Out`, `Recruitment`):** Trang thông tin tuyển quân [`/information/try-out`](src/pages/TryoutPage.tsx), đăng ký khóa học theo cấp độ (`/training?courseId=...`), Drop-in Guest Session, nộp đơn Try-Out (`/register`), chấm điểm 4 tiêu chí + hẹn lịch & trả kết quả tự động kèm link Zalo/IG, `SUPERADMIN` sửa nhanh `Level` trên bảng, và tự động thăng hạng lên danh sách VĐV.
- **DVA Shop (E-commerce):** Cửa hàng áo đấu & phụ kiện bóng chuyền, tùy biến in tên áo, đặt hàng + thanh toán VietQR, gửi email xác nhận 2 chặng (Đặt hàng / Giao hàng).
- **Giải đấu & Leagues (Tournaments Module):** Hỗ trợ cả giải **Đăng cai (`HOSTED`)** và **Đội khách (`PARTICIPATING`)**, đăng ký đội + thu lệ phí VietQR, thể thức **`BO3` / `BO2` / `BO1_25`** (1 set chạm 25đ), sinh lịch 12 trận vòng bảng / 20 trận 2 sân (`Court A` / `Court B`), bracket knockout (seed tách từng vòng QF/SF/Finals), trọng tài, **Dream Team Awards** và giao diện mobile tối ưu.
- **Admin Dashboard Hub (12 modules / 4 nhóm):** Trung tâm quản trị lazy-loaded theo từng tab & phân quyền RBAC nghiêm ngặt (`SUPERADMIN` 12 tabs vs `ADMIN` 4 tabs trong `ADMIN_ALLOWED_TABS`: Overview ops, Tryout Applications không được Reject, Tournaments read-only, News không được Delete), theo dõi **6-Stream Revenue Analytics** (`Court`, `Store`, `Guest`, `Tryout`, `Tournaments` + `Est. Training Tuition`), đồng bộ Google Sheets và vận hành CLB.

---

## 🚀 Kiến trúc Triển khai Production

```text
  [ Frontend SPA: React 19 + Vite 8 ]  (Deploy: Vercel — vercel.json)
                   │
                   ▼ HTTPS REST API (/api + Bearer JWT dva_token)
  [ Backend API: Express 4 + Node.js ] (Entry: server/index.ts · Deploy: Render "dva-backend", Port 10000)
                   │
                   ├──► [ Supabase PostgreSQL ]        (Singapore ap-southeast-1, Transaction Pooler :6543 / Session Pooler :5432)
                   ├──► [ Resend API ]                 (Email giao dịch & Try-Out song ngữ En/Vi)
                   ├──► [ Google Apps Script Webhook ] (Đồng bộ 1 Spreadsheet: DatSan, DangKyKhoaHoc, TuyenThanhVien, DonHang_Shop)
                   ├──► [ Cloudinary CDN ]             (Upload & tối ưu ảnh f_auto,q_auto)
                   └──► [ VietQR + SePay/Casso ]       (QR MBBank 0002090671521 + Webhook đối soát /api/webhooks/payment)
```

---

## 🛠 Công nghệ sử dụng

| Lớp | Công nghệ & Phiên bản (`package.json`) | Vai trò chính & Ghi chú |
| :--- | :--- | :--- |
| **Frontend Core** | `React 19.0.1`, `TypeScript` (`~7.0`), `Vite 8.3.0`, `React Router DOM 7.18.4` | SPA đa route, code splitting (`React.lazy` cho `/admin/dashboard` và các trang phụ) + SWR cache (`src/utils/swrCache.ts`). |
| **UI, Style & Motion** | `Tailwind CSS 4.3.3` (`@tailwindcss/vite`), `Motion 12.23.24`, `Lucide React 0.546.0` | Dark Theme (`#0B0F19`), Floating Capsule Navbar, Responsive Mobile UI (`TournamentsPage`, `ShopPage`...). |
| **Đa ngôn ngữ (i18n)** | `i18next 26.5.12`, `react-i18next 17.1.9`, `i18next-browser-languagedetector 8.2.4` | English-first (`en` mặc định, chuyển đổi `EN \| VI` lưu `localStorage['dva_lang']`), gồm **4 namespaces**: `common`, `news`, `tournaments`, `tryout`. |
| **Backend Runtime** | `Node.js`, `Express 4.21.2`, `cors 2.8.6`, `dotenv 17.2.3` | Kiến trúc module hóa tại `server/` (entry `server/index.ts`; `server.ts` & `lib/*` là shim tương thích). Dev qua `tsx watch server/index.ts`; build ESM bằng `esbuild` ra `dist/server.js`. |
| **Database & ORM** | **Supabase PostgreSQL**, `Prisma ORM 7.10.1` (`prisma`, `@prisma/client`, `@prisma/adapter-pg`), `pg 8.23.1` | 21 models & 15 enums trong `prisma/schema.prisma`, cấu hình CLI qua `prisma.config.ts`, runtime qua `pg.Pool` + `@prisma/adapter-pg` tại `server/config/prisma.ts`. |
| **Bảo mật & Auth** | `bcrypt 5.1.1` (10 rounds + fallback `scrypt`), HMAC HS256 JWT (`crypto`) | Chính sách **Default-Deny RBAC** (`PUBLIC_RULES` + `ADMIN_ALLOWED_RULES` + PII stripping + chặn `ADMIN` reject Tryout `403`) tại `server/middlewares/`, rate limiter & TTL cache (`server/utils/cache.ts`). |
| **Dịch vụ Bên thứ 3** | `Resend 6.35.0`, Google Apps Script Webhook, Cloudinary CDN, VietQR Quicklink, SePay / Casso | Chạy bất đồng bộ **Fire-and-Forget** (`try/catch` độc lập) để lỗi dịch vụ ngoài không chặn HTTP `200`. |

---

## 🗄️ Thay đổi & Kiến trúc Database mới nhất (11/2026)

Để sau này bảo trì hoặc nâng cấp DB không gặp lỗi kết nối/quota/SSL, dưới đây là toàn bộ thay đổi quan trọng vừa áp dụng:

### 1. Chuyển đổi Production Database: Neon → Supabase PostgreSQL (18/11/2026)
- **Thực hiện chuyển đổi:** Toàn bộ dữ liệu thật (**21 bảng, 491 bản ghi**) đã được migrate 1:1 từ Neon PostgreSQL sang **Supabase PostgreSQL**; project Neon cũ đã xóa và hạ gói về Free (`$0.00`). Bản sao lưu JSON ban đầu (`backups/dva_neon_backup_20261118.json`) và các bản chụp định kỳ được lưu trong thư mục `backups/` (đã chặn trong [.gitignore](.gitignore) để không lộ dữ liệu người dùng thật lên GitHub).
- **Thông tin Project Supabase:**
  - Organization / Project: `DVA Volleyball` / `dva-backend` (Project Ref: `hciiwqmhzlsqgtmodoot`)
  - Region / Compute: **Southeast Asia (Singapore, `ap-southeast-1`)** — Compute Nano
- **Chuỗi kết nối chuẩn (Transaction Pooler IPv4 `:6543` cho Runtime + `DIRECT_URL` Session Pooler IPv4 `:5432` cho CLI):**
  ```text
  # Runtime backend (Render / Server)
  DATABASE_URL="postgresql://postgres.hciiwqmhzlsqgtmodoot:<DB_PASSWORD>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?uselibpqcompat=true&sslmode=require"
  # Prisma CLI (`npx prisma db push` qua prisma.config.ts) & backup
  DIRECT_URL="postgresql://postgres.hciiwqmhzlsqgtmodoot:<DB_PASSWORD>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require"
  ```
  - **Vì sao tách `:6543` (Runtime) và `:5432` (`DIRECT_URL`) qua Pooler IPv4?** Container backend trên Render chỉ hỗ trợ outbound **IPv4** (không gọi được `db.<ref>.supabase.co` IPv6). Dùng **Transaction Pooler `:6543`** ở runtime giúp trả lại backend Postgres ngay sau mỗi transaction để không phình RAM gói Free Nano (~381 MB), trong khi `DIRECT_URL` (`:5432` Session Pooler IPv4) đảm bảo `prisma db push` chạy ổn định.
  - **Vì sao cần `?uselibpqcompat=true&sslmode=require`?** Thư viện `pg` v8+ cảnh báo khi chỉ truyền `?sslmode=require`; thêm `uselibpqcompat=true` giúp driver hiểu đúng chuẩn libpq SSL và giữ log Render sạch 100%.
- **Bảo mật Supabase:** **Public Data API (PostgREST)** trên Supabase đã được **TẮT** hoàn toàn cho schema `public`, đảm bảo bên ngoài không thể gọi REST trực tiếp vào bảng — mọi truy cập bắt buộc đi qua Express API + `server/middlewares/{auth,rbac}.middleware.ts`.

### 2. Cơ chế Bảo vệ DB & Tối ưu Chi phí (FinOps, Caching & Circuit Breaker)
Các cơ chế bảo vệ được tập trung tại [server/utils/bookingHolds.ts](server/utils/bookingHolds.ts), [server/utils/cache.ts](server/utils/cache.ts), [server/config/prisma.ts](server/config/prisma.ts) và [server/index.ts](server/index.ts) (các file `lib/*` & `server.ts` là shim tương thích):
1. **Loại bỏ Polling DB 24/7 (On-Demand Hold Cleanup):**
   - Hàm `releaseExpiredHolds()` (`createHoldReleaseManager` trong [server/utils/bookingHolds.ts](server/utils/bookingHolds.ts)) thay thế vòng lặp nền: **chỉ dọn hold quá hạn khi có request đặt sân/lịch/thanh toán** (`GET /api/bookings`, `POST /api/bookings`, `POST /api/bookings/:id/confirm-payment`, `POST /api/webhooks/payment`).
   - Có khóa **single-flight**, thời gian nghỉ **`15s`** giữa các lần dọn thành công, và **exponential backoff** khi lỗi (`30s → 60s → 300s → 900s`, riêng lỗi quota `53000`/`P2039` lùi `900s`).
2. **Global Database Circuit Breaker (`createDatabaseCircuitBreaker`):**
   - Khi DB gặp sự cố kết nối (`P1001`, `P1002`, `P1017`, `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`) hoặc quá tải/quota (`53000`, `P2039`), middleware `/api` (`server/middlewares/error.middleware.ts`) tự ngắt mạch trong `20s` (transient) hoặc `60s` (quota), trả ngay HTTP `503` + header `Retry-After` thay vì spam connection pool, và tự động kiểm tra phục hồi (half-open).
3. **Health Check Không Chạm DB (`GET /health`), Cron Keep-Alive & TTL/SWR Cache:**
   - Endpoint `GET /health` chỉ đọc trạng thái từ RAM (`dbCircuitBreaker.isOpen()`), **tuyệt đối không query DB**.
   - **Cron Keep-Alive cho Render Free (cấu hình ngoài tại `cron-job.org`, đã xóa UptimeRobot):**
     - Mục đích: Ngăn container `dva-backend` trên Render Free bị spin down (ngủ sau 15 phút) gây cold-start 5–10s trong giờ người dùng hoạt động.
     - Cấu hình hiện tại: `GET https://dva-backend-jask.onrender.com/health` mỗi **10 phút**, khung giờ **06:00 – 02:00 sáng hôm sau** (giờ Việt Nam, `Asia/Ho_Chi_Minh`); cho Render nghỉ từ **02:00 – 06:00** (~20 giờ/ngày ≈ ~620 giờ/tháng, dưới trần 750 giờ/tháng của Render Free và tốn `0` query / `0` byte Egress Supabase).
     - **Lưu ý bảo trì / sự cố:** Nếu sau này cần tạm dừng hoặc hủy (khi nâng cấp Render Starter, nghi ngờ chạm quota Render/DB, hoặc đổi domain backend), đăng nhập **https://console.cron-job.org → Cronjobs → `DVA Backend Keep-Alive`** để tắt hoặc xóa job này.
   - Backend dùng `appCache` ([server/utils/cache.ts](server/utils/cache.ts), giới hạn 400 entries + single-flight + `applyPublicCacheHeaders`) giảm truy vấn Supabase; Frontend dùng `createSwrCache` ([src/utils/swrCache.ts](src/utils/swrCache.ts)) trên Memory + `sessionStorage`.
4. **Tinh chỉnh `pg.Pool` ([server/config/prisma.ts](server/config/prisma.ts)) & Seed chạy nền:**
   - Pool lưu singleton cùng `prisma` trên `globalForPrisma`, bật `disposeExternalPool: true` để `prisma.$disconnect()` đóng sạch pool (`pool.end()`), cấu hình mặc định `max: 5` (`PG_POOL_MAX`), `connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 10000` (`PG_POOL_IDLE_TIMEOUT_MS`), `keepAlive: true` (`10s`), `ssl: { rejectUnauthorized: false }` cho Cloud DB (`supabase.co`, `supabase.com`, `neon.tech`, `render.com`, `sslmode=require`), và `pool.on('error')` bỏ qua `ECONNRESET`/`EPIPE` khi cloud pooler thu hồi socket nhàn rỗi.
   - `ensurePostgreSQLSeeded()` chạy bất đồng bộ **sau** `app.listen()` để Render bind port nhanh và **chỉ seed khi bảng trống** (không ghi đè chỉnh sửa của Admin).
   - `userLookupCache` dùng cache RAM ngắn `5s` + single-flight coalescing (tự xóa khi đổi role/xóa user) và `/api/admin/overview-summary` ([server/modules/integrations/sheets.routes.ts](server/modules/integrations/sheets.routes.ts)) chia batch query nhỏ để tránh tạo spike kết nối.

### 3. Quy tắc Cập nhật Schema DB (Bắt buộc tuân thủ)
- Khi thêm bảng/cột trong [prisma/schema.prisma](prisma/schema.prisma), luôn dùng giá trị mặc định (`@default(...)`) hoặc nullable (`?`) để tương thích ngược 100%.
- Luôn chạy:
  ```bash
  npm run prisma:push      # npx prisma db push
  npm run prisma:generate  # npx prisma generate
  ```
- **KHÔNG** chạy `prisma migrate dev` (dự án dùng Pooler và không có baseline migration history) và **TUYỆT ĐỐI KHÔNG** dùng cờ `--force-reset` hay `--accept-data-loss`.

### 4. Tổng hợp 21 Bảng Database (`prisma/schema.prisma`)
- **Người dùng & Vận động viên:** `User` (`users`), `Player` (`players`), `CoachProfile` (`coaches`), `MemberApplication` (`member_applications`)
- **Đặt sân & Lịch sân:** `Court` (`courts`), `ClosedSlot` (`closed_slots`), `Booking` (`bookings`)
- **Học viện & Drop-in:** `TrainingCourse` (`training_courses`), `TrainingRegistration` (`training_registrations`), `GuestSession` (`guest_sessions`)
- **Tin tức & Hệ thống:** `NewsPost` (`news_posts`), `AppConfig` (`app_config`), `GoogleSheetsSyncLog` (`google_sheets_sync_logs`)
- **DVA Shop:** `Product` (`products`), `Order` (`orders`), `OrderItem` (`order_items`)
- **Giải đấu (Tournaments):** `Tournament` (`tournaments`), `TournamentTeam` (`tournament_teams`), `TournamentPlayer` (`tournament_players`), `TournamentMatch` (`tournament_matches`), `TournamentOfficial` (`tournament_officials`)

---

## 🔍 Bản đồ Tra cứu Nhanh (Cần sửa gì → Tìm ở đâu?)

| Khi cần sửa / kiểm tra | File Frontend / Shared | File Backend / Database |
| :--- | :--- | :--- |
| **Kết nối DB, Connection Pool, DTO Mapper, Seed** | [src/types/index.ts](src/types/index.ts) | [server/config/prisma.ts](server/config/prisma.ts), [server/config/env.ts](server/config/env.ts), [prisma.config.ts](prisma.config.ts), [prisma/schema.prisma](prisma/schema.prisma), [prisma/seed-admin.ts](prisma/seed-admin.ts), [`.env.example`](.env.example) |
| **Sao lưu DB & Đồng bộ về PostgreSQL Local (pgAdmin 4)** | — | [scripts/db-backup.ts](scripts/db-backup.ts) (`npm run db:backup`, `npm run db:sync-local`), `backups/` (gitignored) |
| **Circuit Breaker, Dọn hold hết hạn, TTL Cache** | [src/utils/swrCache.ts](src/utils/swrCache.ts) | [server/utils/bookingHolds.ts](server/utils/bookingHolds.ts), [server/utils/cache.ts](server/utils/cache.ts), [server/index.ts](server/index.ts), [server/middlewares/error.middleware.ts](server/middlewares/error.middleware.ts) |
| **Phân quyền RBAC, JWT Auth, PII Stripping** | [src/components/auth/AuthModal.tsx](src/components/auth/AuthModal.tsx), [src/pages/admin/constants.ts](src/pages/admin/constants.ts) | [server/middlewares/auth.middleware.ts](server/middlewares/auth.middleware.ts) (`PUBLIC_RULES`, `ADMIN_ALLOWED_RULES`), [server/middlewares/rbac.middleware.ts](server/middlewares/rbac.middleware.ts), [server/modules/auth/](server/modules/auth/) |
| **API Client, Base URL, Chống `401` Race & Double Submit** | [src/services/api.ts](src/services/api.ts), [src/config/api.ts](src/config/api.ts) | [server/index.ts](server/index.ts) (CORS & mounts `/api/*` tới `server/modules/*`) |
| **Gửi Email Resend & Tạo QR VietQR** | [src/components/common/VietQRModal.tsx](src/components/common/VietQRModal.tsx) | [server/utils/email.service.ts](server/utils/email.service.ts), [server/modules/bookings/](server/modules/bookings/) (`/api/vietqr/generate`) |
| **Webhook thanh toán tự động (SePay / Casso)** | — | [server/modules/bookings/bookings.routes.ts](server/modules/bookings/bookings.routes.ts) (`POST /api/webhooks/payment`) |
| **Đồng bộ Google Sheets (`DatSan`, `DonHang_Shop`, ...)** | [src/pages/admin/tabs/SheetsTab.tsx](src/pages/admin/tabs/SheetsTab.tsx), [src/pages/admin/components/sheets/](src/pages/admin/components/sheets/) | [scripts/google-apps-script-dva-shop.js](scripts/google-apps-script-dva-shop.js), [server/modules/integrations/](server/modules/integrations/) |
| **Try-Out, Tuyển sinh, Scorecard & RBAC (`ADMIN` no-reject)** | [src/pages/TryoutPage.tsx](src/pages/TryoutPage.tsx), [src/shared/tryoutEmail.ts](src/shared/tryoutEmail.ts), [src/pages/admin/tabs/ApplicationsTab.tsx](src/pages/admin/tabs/ApplicationsTab.tsx), [src/pages/admin/components/applications/](src/pages/admin/components/applications/) | [server/modules/tryouts/tryouts.routes.ts](server/modules/tryouts/tryouts.routes.ts), [server/modules/tryouts/tryouts.service.ts](server/modules/tryouts/tryouts.service.ts), [server/utils/schemas.ts](server/utils/schemas.ts) |
| **Đặt sân & Lịch tuần sân bóng** | [src/pages/CourtBookingPage.tsx](src/pages/CourtBookingPage.tsx), [src/shared/schedule.ts](src/shared/schedule.ts) | [server/modules/bookings/](server/modules/bookings/) (`/api/courts*`, `/api/bookings*`), [server/utils/schemas.ts](server/utils/schemas.ts) |
| **DVA Shop (Sản phẩm, Giỏ/Đặt mua, Đơn hàng)** | [src/pages/ShopPage.tsx](src/pages/ShopPage.tsx), [src/pages/admin/tabs/StoreTab.tsx](src/pages/admin/tabs/StoreTab.tsx) | [server/modules/store/](server/modules/store/) (`/api/store/*`), [server/utils/schemas.ts](server/utils/schemas.ts) |
| **Giải đấu (Tournaments, `BO1_25`, BXH, Bracket, Mobile UI)** | [src/pages/TournamentsPage.tsx](src/pages/TournamentsPage.tsx), [src/shared/tournaments.ts](src/shared/tournaments.ts), [src/components/tournaments/](src/components/tournaments/), [src/pages/admin/tabs/TournamentsTab.tsx](src/pages/admin/tabs/TournamentsTab.tsx) | [server/modules/tournaments/](server/modules/tournaments/), [server/utils/standings.engine.ts](server/utils/standings.engine.ts), [server/utils/schemas.ts](server/utils/schemas.ts) |
| **Admin Dashboard, Lazy-Load & 6-Stream Analytics** | [src/pages/admin/AdminDashboardPage.tsx](src/pages/admin/AdminDashboardPage.tsx), [src/pages/admin/hooks/useAdminData.ts](src/pages/admin/hooks/useAdminData.ts), [src/pages/admin/tabs/OverviewTab.tsx](src/pages/admin/tabs/OverviewTab.tsx) | [server/modules/integrations/sheets.routes.ts](server/modules/integrations/sheets.routes.ts) (`/api/admin/overview-summary`), [server/config/prisma.ts](server/config/prisma.ts) |
| **Tối ưu & Upload Ảnh Cloudinary** | [src/utils/cloudinary.ts](src/utils/cloudinary.ts) | [server/modules/content/content.routes.ts](server/modules/content/content.routes.ts) (`/api/cloudinary/sign-upload`) |
| **Dịch đa ngôn ngữ (EN / VI)** | [src/lib/i18n.ts](src/lib/i18n.ts), `src/locales/{en,vi}/{common,news,tournaments,tryout}.json`, [src/components/common/LanguageSwitcher.tsx](src/components/common/LanguageSwitcher.tsx) | — |
| **Kiểm duyệt dữ liệu đầu vào (Validation & Sanitize)** | — | [server/utils/schemas.ts](server/utils/schemas.ts), [server/utils/validation.ts](server/utils/validation.ts) |

---

## 💻 Các lệnh Phát triển & Database thường dùng

Sao chép [.env.example](.env.example) thành `.env` (hoặc cập nhật `.env` theo chuỗi Supabase Session Pooler IPv4 ở trên), sau đó chạy:

```bash
# Cài dependencies
npm install

# Chạy song song Backend (tsx watch) + Frontend (Vite) ở local
npm run dev

# Kiểm tra lỗi TypeScript toàn dự án
npm run lint          # tsc --noEmit

# Build production (Prisma Client + Vite SPA + esbuild dist/server.js)
npm run build

# Khởi chạy bản build production
npm start             # node dist/server.js

# --- Quản trị & Sao lưu Database (Supabase PostgreSQL + Local pgAdmin 4) ---
npm run prisma:validate   # Kiểm tra cú pháp prisma/schema.prisma
npm run prisma:push       # Đẩy thay đổi schema an toàn lên DB (KHÔNG dùng migrate dev)
npm run prisma:generate   # Sinh lại Prisma Client sau khi sửa schema
npm run prisma:studio     # Mở giao diện xem dữ liệu DB tại local
npm run seed:admin        # Chạy prisma/seed-admin.ts (tạo/khôi phục tài khoản admin & bảng trống)
npm run db:backup         # Chụp toàn bộ dữ liệu Supabase ra file JSON trong backups/
npm run db:sync-local     # Chụp từ Supabase + tự dựng đủ 21 bảng & đổ dữ liệu vào PostgreSQL local (cần LOCAL_DATABASE_URL trong .env)
```

> Lưu ý triển khai: Frontend rewrite SPA nằm tại [vercel.json](vercel.json); cấu hình Docker tùy chọn nằm tại [Dockerfile](Dockerfile) và [docker-compose.yml](docker-compose.yml). Mọi thay đổi kiến trúc mới cần đồng bộ vào [ARCHITECTURE.md](ARCHITECTURE.md).
