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
  - Internationalization (i18n): `i18next`, `react-i18next`, `i18next-browser-languagedetector` (English-first `'en'` mặc định, hỗ trợ chuyển đổi song ngữ `'en' | 'vi'`, lưu cache `localStorage` qua key `'dva_lang'`).
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
| `src/components/` | Thành phần UI phân tách theo phạm vi: <br>• `auth/`: Modal đăng nhập, form cấp lại mật khẩu, OTP.<br>• `common/`: Toast, Modal xác nhận, Dialog thông báo dùng chung, `ShareButton.tsx` (nút chia sẻ link thông minh), `LanguageSwitcher.tsx` (nút chuyển đổi ngôn ngữ dạng Micro Segmented Pill `EN | VI` kèm cờ SVG).<br>• `training/`: `CourseDetailModal.tsx` (modal chi tiết khoá học & học viện hỗ trợ deep-linking).<br>• `layout/`: Navbar (Floating Capsule tích hợp `LanguageSwitcher` trên Desktop & chân Mobile Drawer), Footer, Menu Drawer di động. |
| `src/lib/` | Khởi tạo thư viện dùng chung phía Client: <br>• `i18n.ts`: Cấu hình `i18next` + `react-i18next` + `LanguageDetector` (hỗ trợ `'en'` & `'vi'`, `fallbackLng: 'en'`, lưu `localStorage` với key `'dva_lang'`). |
| `src/locales/` | Từ điển bản dịch tĩnh đa ngôn ngữ (`src/locales/{en,vi}/`): <br>• `common.json`: Nhãn điều hướng Navbar, Footer, các nút bấm dùng chung.<br>• `news.json`: Nhãn 7 danh mục tin tức (`NEWS_CATEGORIES`), ô tìm kiếm, phân trang, trạng thái chia sẻ bài viết. |
| `src/pages/` | Các trang màn hình chính của ứng dụng: <br>• `AdminDashboardPage.tsx`: File re-export 1 dòng trỏ tới `src/pages/admin/AdminDashboardPage.tsx` (hỗ trợ `React.lazy` code-splitting).<br>• `CourtBookingPage.tsx`: Wizard đặt sân bóng, chọn khung giờ, thanh toán VietQR.<br>• `HomePage.tsx`: Trang chủ giới thiệu CLB, tiện ích, lời kêu gọi hành động (CTA).<br>• `TrainingPage.tsx`: Đăng ký khoá huấn luyện bóng chuyền, danh sách HLV, hỗ trợ deep-linking mở `CourseDetailModal` qua `?courseId=`.<br>• `MemberRegisterPage.tsx`: Biểu mẫu nộp hồ sơ gia nhập CLB.<br>• `PlayersPage.tsx`: Danh sách vận động viên, thông số kỹ thuật (vị trí, chiều cao, tầm bật).<br>• `NewsPage.tsx` & `NewsDetailPage.tsx`: Tin tức và bài viết chuyên sâu (Editorial layout, chia sẻ bài viết, hiển thị ngày đăng tiếng Anh chuẩn US).<br>• `InformationPage.tsx`: Nội quy CLB, bảng giá, bản đồ chỉ dẫn. |
| `src/pages/admin/` | Kiến trúc Quản trị phân tách theo Tab (Tab-based Modular Architecture): <br>• `AdminDashboardPage.tsx`: Shell điều phối mỏng (114 dòng).<br>• `context/`, `layout/`, `tabs/`, `hooks/`, `components/`, `utils/`. |
| `src/services/` | Lớp giao tiếp API máy khách (`api.ts`): Bao bọc hàm `request<T>()`, quản lý xác thực `authService`, điều phối đặt sân `bookingService`, huấn luyện `trainingService`, đồng bộ sheets `sheetsService`. |
| `src/data/` | Dữ liệu tĩnh và mock fallback: `mockData.ts`, danh mục tỉnh thành `vietnamLocations.ts`. |
| `src/types/` | Toàn bộ định nghĩa TypeScript (`index.ts`): User, Role, Player, Court, Booking, ClosedSlot, TrainingCourse, v.v. |
| `src/utils/` | Tiện ích dùng chung phía Client: `cloudinary.ts` (upload ảnh CDN), `date.ts` (`formatEnglishDate` / `formatPublishDate` chuẩn Anh - Mỹ `Month DD, YYYY`). |
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

### 3.6. Kiến trúc Quản trị Module hóa (`src/pages/admin/`)
- **Trạng thái Code sạch & Lazy Loading:**
  - Đã xóa bỏ hoàn toàn kiến trúc nguyên khối (>5.500 dòng) trước đây, tách thành **38 modules** độc lập theo miền nghiệp vụ trong `src/pages/admin/`.
  - File shell điều phối [`src/pages/admin/AdminDashboardPage.tsx`](src/pages/admin/AdminDashboardPage.tsx) chỉ còn **114 dòng** (bọc Provider, kiểm tra quyền `!isAdmin`, render Header/Banner/ActiveTab và `GuestSessionEmailModal`).
  - File [`src/pages/AdminDashboardPage.tsx`](src/pages/AdminDashboardPage.tsx) giữ vai trò re-export 1 dòng, giúp `src/App.tsx` lazy-load toàn bộ cụm bundle Admin sạch sẽ mà không ảnh hưởng tới bundle trang khách hàng.
- **Cấu trúc Thư mục (`src/pages/admin/`):**
  - `context/`: `AdminDashboardContext.tsx` cung cấp state và hành vi dùng chung toàn trang quản trị.
  - `layout/`: `AdminHeader.tsx`, `AdminTabNav.tsx` (thanh điều hướng 10 tab kèm badge số lượng), `FeedbackBanner.tsx`.
  - `tabs/`: 10 component tab độc lập (`OverviewTab`, `CourtsTab`, `BookingsTab`, `ApplicationsTab`, `PlayersTab`, `TrainingTab`, `CoachesTab`, `NewsTab`, `UsersTab`, `SheetsTab`).
  - `hooks/`: Các custom hook tách biệt logic khỏi UI (`useAdminData`, `useFeedback`, `useAdminMetrics`, `useApplicationActions`, `useCourtCrud`, `useCourtSlotLock`, `useUsersTab`).
  - `components/`: Các modal và sub-component chuyên biệt theo từng miền (`courts/CourtCard`, `courts/SlotLockPanel`, `courts/WeeklyScheduleEditor`, `courts/CourtFormModal`, `bookings/BookingFormModal`, `players/PlayerFormModal`, `training/CourseFormModal`, `coaches/CoachFormModal`, `news/NewsFormModal`, `users/CreateUserModal`, `sheets/appsScriptTemplate`, `AthleteRosterAvatar`, `GuestSessionEmailModal`).
  - `utils/`: `scheduleEditor.ts` chứa các hàm thuần túy (pure functions) xử lý thêm/xóa ca, sao chép lịch T2–T6 và đồng bộ lịch giữa các sân con (`subCourts`).
- **Mô hình Quản lý State (Core Context + Domain Custom Hooks):**
  - **`AdminDashboardContext`:** Quản lý các state dùng chung xuyên suốt các tab bao gồm: phiên đăng nhập (`currentUser`, `isAdmin`, `isSuperAdmin`), tab đang mở (`activeModule`), thông báo (`feedback`, `notify` / `setFeedback`), 9 tập dữ liệu cốt lõi từ `useAdminData` (`data`, `setData`), bộ chọn sân dùng chung giữa Courts & Bookings (`courtSelection`: `selectedManageCourtId`, `adminSelectedSubCourt`, `selectedManageDate`), và trạng thái mở modal gửi mail khách vãng lai.
  - **Domain Custom Hooks:** Mỗi miền nghiệp vụ phức tạp sử dụng hook riêng kết nối vào Context (`useCourtCrud`, `useCourtSlotLock`, `useApplicationActions`, `useAdminMetrics`, `useUsersTab`), đảm bảo khi một tab cập nhật dữ liệu (ví dụ duyệt ứng viên ở `OverviewTab` hoặc `ApplicationsTab`), danh sách VĐV (`players`) và các chỉ số badge trên `AdminTabNav` tự động đồng bộ tức thì.

### 3.7. Luồng Chia sẻ (`ShareButton`), Deep Linking & Module Tin tức (`News`)
- **Component Chia sẻ Dùng chung (`src/components/common/ShareButton.tsx`):**
  - Tự động nhận diện thiết bị di động để kích hoạt menu chia sẻ bản địa (`navigator.share({ title, text, url })`).
  - Trên máy tính (hoặc khi trình duyệt không hỗ trợ Web Share API), tự động sao chép đường dẫn vào Clipboard (`navigator.clipboard.writeText`), hiển thị nút mặc định `"Share"` (hoặc `"Share Article"` qua prop `label`) và chuyển sang trạng thái phản hồi trực quan `"Link Copied!"` (màu Emerald) trong 2 giây.
- **Deep Linking & Chi tiết Khoá học (`src/components/training/CourseDetailModal.tsx` & `src/pages/TrainingPage.tsx`):**
  - Mỗi gói huấn luyện trên `TrainingPage.tsx` hỗ trợ đường dẫn chia sẻ trực tiếp `/training?courseId=<id>`.
  - Khi người dùng truy cập URL có `?courseId=...`, `TrainingPage.tsx` tự động đối chiếu danh sách khóa học và mở `CourseDetailModal` tương ứng; nếu `courseId` không tồn tại hoặc khi người dùng đóng modal / chuyển sang bước đăng ký, query param được dọn sạch (`setSearchParams({}, { replace: true })`).
- **Luồng Quản trị & Hiển thị Tin tức (`NewsPost`):**
  - **Database & API (`prisma/schema.prisma`, `lib/schemas.ts`, `lib/prisma.ts`, `server.ts`, `src/services/api.ts`):**
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
- **Component `LanguageSwitcher.tsx` (Micro Segmented Pill):**
  - Thiết kế dạng viên thuốc 2 nấc (`EN` | `VI`) siêu nhỏ gọn (`h-8 sm:h-7.5 p-0.5 sm:p-1 rounded-full bg-slate-900/90 border border-slate-800`) tối ưu diện tích trên thanh Navbar và diện tích chạm (touch target `min-w-[36px] sm:min-w-[38px] px-2.5`) trên thiết bị di động.
  - **Tối ưu Cảm ứng Di động & Z-Index:** Khung bọc và nút dùng `relative z-30 pointer-events-auto cursor-pointer select-none touch-manipulation`, các phần tử con (`<svg>`, `<span>`) gắn `pointer-events-none` để mọi thao tác chạm luôn kích hoạt trực tiếp lên `<button>`.
  - **Nấc đang chọn (Active):** Nền chuyển sắc cam thương hiệu (`bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold shadow-sm`), hiển thị kèm cờ SVG inline sắc nét (`w-3.5 h-2.5 rounded-[2px]`): cờ Vương Quốc Anh (`UkFlagIcon` 🇬🇧) khi `EN` active và cờ Việt Nam (`VnFlagIcon` 🇻🇳) khi `VI` active.
  - **Nấc không chọn (Inactive):** Chữ xám mờ (`text-slate-400 hover:text-slate-200 text-xs font-semibold`), tự động ẩn cờ để tiết kiệm không gian và tạo độ tương phản rõ nét, chuyển cảnh mượt (`transition-all duration-200 ease-out`).
  - **Vị trí Tích hợp trên `Navbar.tsx`:** Hiển thị trực tiếp trên thanh Topbar cố định (cả Mobile lẫn Desktop/Tablet, nằm ngay cạnh nút Hamburger / cụm tài khoản) để người dùng đổi ngôn ngữ tức thì mà không cần mở menu, đồng thời hiển thị thêm ở phần chân (footer) của Mobile Menu Drawer.

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

### 4.3. Quy chuẩn Ngôn ngữ Giao diện Công khai & Email (English-First i18n Policy & Bilingual Emails)
- **English-First Public UI Policy & Đa ngôn ngữ Tĩnh (`i18next`):**
  - Giao diện Public khởi tạo mặc định 100% bằng **Tiếng Anh (`en` - English-first)**, đồng thời hỗ trợ người dùng chuyển đổi sang **Tiếng Việt (`vi`)** thông qua nút `LanguageSwitcher` dạng Segmented Pill trên Navbar (lưu lựa chọn vào `localStorage` với key `'dva_lang'`).
  - Toàn bộ nhãn điều hướng và tương tác tĩnh sử dụng từ điển chuẩn hóa tại `src/locales/{en,vi}/{common,news}.json`, tuyệt đối không pha trộn nửa Anh nửa Việt trong cùng một chế độ ngôn ngữ.
- **Email HTML (Bilingual):**
  - Trong email HTML gửi tự động qua Resend: Tiêu đề, lời chào và bảng thông tin tóm tắt giữ định dạng song ngữ Anh - Việt rõ ràng để phục vụ cả hội viên quốc tế lẫn nội địa.

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

6. **Public UI English-Only Policy (Chuẩn hóa Tiếng Anh 100% cho Giao diện Public):**
   - Toàn bộ phần giao diện hiển thị cho người dùng đọc trên các trang Public (Tiêu đề mục, Nhãn `labels`, Nút bấm `buttons`, Bộ lọc `filter tabs`, Thông báo `toast/placeholders` và Phân trang `pagination`) **BẮT BUỘC PHẢI DÙNG TIẾNG ANH (English-first)**.
   - Tuyệt đối không dùng tiếng Việt hoặc pha trộn nửa Anh nửa Việt ở các thành phần điều hướng và tương tác ngoài trang Public.

7. **Đồng bộ Tài liệu Kiến trúc (`./ARCHITECTURE.md`) Bắt buộc:**
   - Bất kỳ khi nào thêm mới, chỉnh sửa hay mở rộng tính năng trên hệ thống, **BẮT BUỘC** phải cập nhật lại file `./ARCHITECTURE.md` tương ứng để các phiên làm việc tiếp theo luôn nắm bắt chuẩn xác kiến trúc, luồng dữ liệu và quy ước của dự án.
