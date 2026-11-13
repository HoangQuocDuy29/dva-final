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
  - **Resend:** Dịch vụ gửi email thông báo đặt sân, đăng ký khoá học, xét tuyển hội viên, và email 2 chặng cho đơn hàng DVA Shop (Bilingual template).
  - **Google Apps Script Webhook:** Đồng bộ dữ liệu real-time từ API về đúng 1 file Google Spreadsheet duy nhất của CLB (tabs: `DatSan`, `Training_Registrations`, `DangKyKhoaHoc`, `TuyenThanhVien`, `DonHang_Shop` với cơ chế Idempotent Upsert chống ghi đúp dòng).
  - **Cloudinary:** Lưu trữ và phân phối hình ảnh sơ đồ sân, cổng vào, tin tức, và ảnh mặt trước/mặt sau sản phẩm DVA Shop.
  - **VietQR Quicklink:** Sinh ảnh mã QR động theo chuẩn ngân hàng Việt Nam (MBBank `0002090671521` - `HOANG QUOC DUY`).

---

## 2. 🗺️ Bản đồ Thư mục & Trách nhiệm (Directory Map)

| Đường dẫn Thư mục | Trách nhiệm Cốt lõi & Thành phần Chính |
| :--- | :--- |
| `src/components/` | Thành phần UI phân tách theo phạm vi: <br>• `auth/`: Modal đăng nhập, form cấp lại mật khẩu, OTP.<br>• `common/`: Toast, Modal xác nhận, Dialog thông báo dùng chung, `Pagination.tsx` (component phân trang dùng chung cho bảng/grid dữ liệu), `ShareButton.tsx` (nút chia sẻ link thông minh), `LanguageSwitcher.tsx` (nút chuyển đổi ngôn ngữ dạng Micro Segmented Pill `EN | VI` kèm cờ SVG).<br>• `training/`: `CourseDetailModal.tsx` (modal chi tiết khoá học & học viện hỗ trợ deep-linking).<br>• `layout/`: Navbar (Floating Capsule tích hợp `LanguageSwitcher` trên Desktop & chân Mobile Drawer; tự động ẩn dropdown profile khi ở trong route `/admin/*`), Footer, Menu Drawer di động. |
| `src/lib/` | Khởi tạo thư viện dùng chung phía Client: <br>• `i18n.ts`: Cấu hình `i18next` + `react-i18next` + `LanguageDetector` (hỗ trợ `'en'` & `'vi'`, `fallbackLng: 'en'`, lưu `localStorage` với key `'dva_lang'`). |
| `src/locales/` | Từ điển bản dịch tĩnh đa ngôn ngữ (`src/locales/{en,vi}/`): <br>• `common.json`: Nhãn điều hướng Navbar, Footer, các nút bấm dùng chung.<br>• `news.json`: Nhãn 7 danh mục tin tức (`NEWS_CATEGORIES`), ô tìm kiếm, phân trang, trạng thái chia sẻ bài viết. |
| `src/pages/` | Các trang màn hình chính của ứng dụng: <br>• `AdminDashboardPage.tsx`: File re-export 1 dòng trỏ tới `src/pages/admin/AdminDashboardPage.tsx` (hỗ trợ `React.lazy` code-splitting).<br>• `CourtBookingPage.tsx`: Wizard đặt sân bóng, chọn khung giờ, thanh toán VietQR.<br>• `ShopPage.tsx`: Cửa hàng DVA Shop (`/shop`, `/services/shop`) với thẻ sản phẩm đổi ảnh mặt trước/mặt sau khi hover, popup Size Guide, Guest Buy-Now Dynamic Order Form (Áo đấu in tên/số vs Phụ kiện, Nhận tại sân BTL Thông Tin miễn phí vs Ship COD), và thanh toán VietQR động (`DVA [CAT_CODE] [ORDER_CODE_SUFFIX]`).<br>• `HomePage.tsx`: Trang chủ giới thiệu CLB, tiện ích, lời kêu gọi hành động (CTA).<br>• `TrainingPage.tsx`: Đăng ký khoá huấn luyện bóng chuyền, danh sách HLV, hỗ trợ deep-linking mở `CourseDetailModal` qua `?courseId=`.<br>• `MemberRegisterPage.tsx`: Biểu mẫu nộp hồ sơ gia nhập CLB.<br>• `PlayersPage.tsx`: Danh sách vận động viên, thông số kỹ thuật (vị trí, chiều cao, tầm bật).<br>• `NewsPage.tsx` & `NewsDetailPage.tsx`: Tin tức và bài viết chuyên sâu (Editorial layout, chia sẻ bài viết, hiển thị ngày đăng tiếng Anh chuẩn US).<br>• `InformationPage.tsx`: Nội quy CLB, bảng giá, bản đồ chỉ dẫn. |
| `src/pages/admin/` | Kiến trúc Quản trị phân tách theo Tab (Tab-based Modular Architecture): <br>• `AdminDashboardPage.tsx`: Shell điều phối mỏng (114 dòng).<br>• `context/`, `layout/`, `tabs/`, `hooks/`, `components/`, `utils/`. |
| `src/services/` | Lớp giao tiếp API máy khách (`api.ts`): Bao bọc hàm `request<T>()`, quản lý xác thực `authService`, điều phối đặt sân `bookingService`, huấn luyện `trainingService`, cửa hàng `storeService`, đồng bộ sheets `sheetsService` & `googleScriptSyncService`. |
| `src/data/` | Dữ liệu tĩnh và mock fallback: `mockData.ts`, danh mục tỉnh thành `vietnamLocations.ts`. |
| `src/types/` | Toàn bộ định nghĩa TypeScript (`index.ts`): User, Role, Player, Court, Booking, ClosedSlot, TrainingCourse, StoreProduct, StoreOrder, StoreOrderItem, v.v. |
| `src/utils/` | Tiện ích dùng chung phía Client: `cloudinary.ts` (upload ảnh CDN), `date.ts` (`formatEnglishDate` / `formatPublishDate` chuẩn Anh - Mỹ `Month DD, YYYY`). |
| `src/shared/` | Logic dùng chung giữa FE và BE: Chuẩn hóa lịch tuần sân bóng (`schedule.ts`). |
| `src/config/` | Cấu hình frontend: Đường dẫn API gốc (`api.ts`). |
| `lib/` | Thư viện dịch vụ cốt lõi Backend: <br>• `mailer.ts`: Khởi tạo Resend, template email song ngữ (Booking, Training, Member, Shop Stage 1 & Stage 2), VietQR URL builder.<br>• `prisma.ts`: Singleton kết nối Prisma Client qua PostgreSQL pool adapter.<br>• `security.ts`: RBAC Default-Deny, JWT sign/verify, mã hoá bcrypt, rate limiter, security headers.<br>• `schemas.ts` & `validation.ts`: Xác thực và làm sạch dữ liệu đầu vào. |
| `prisma/` | Định nghĩa cơ sở dữ liệu: <br>• `schema.prisma`: Khai báo 15 models (`User`, `Player`, `Court`, `ClosedSlot`, `Booking`, `CoachProfile`, `TrainingCourse`, `TrainingRegistration`, `MemberApplication`, `NewsPost`, `AppConfig`, `GoogleSheetsSyncLog`, `Product`, `Order`, `OrderItem`).<br>• `seed-admin.ts`: Script khởi tạo tài khoản SUPERADMIN/ADMIN mặc định. |
| `scripts/` | Mã nguồn script tiện ích và tích hợp: <br>• `google-apps-script-dva-shop.js`: Toàn bộ mã Google Apps Script kế thừa 100% logic cũ và tự động khởi tạo tab `DonHang_Shop` (19 cột chuẩn + Idempotent Upsert theo `Mã đơn hàng`) ngay trong file Google Spreadsheet hiện tại của CLB. |
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
  - `sendShopOrderConfirmationEmail(order)`: Gửi email Chặng 1 xác nhận đơn hàng DVA Shop (khi khách xác nhận chuyển khoản hoặc Admin duyệt `PAID`), đính kèm chi tiết sản phẩm, size, tên/số in áo và phương thức nhận hàng.
  - `sendShopOrderShippingEmail(order)`: Gửi email Chặng 2 thông báo giao hàng khi Admin chuyển trạng thái sang `SHIPPED` và bấm *"Send Shipping Update"* (báo hàng đã sẵn sàng nhận tại sân BTL Thông Tin kèm bản đồ/ảnh chỉ dẫn cổng vào, hoặc đang giao qua đơn vị vận chuyển COD).

### 3.2. Bảo mật & Phân quyền (`lib/security.ts`)
- **Cơ chế Default-Deny (`apiAccessPolicy`):**
  - Mọi endpoint API dưới `/api` **mặc định đều bị chặn (yêu cầu ADMIN hoặc SUPERADMIN)**, trừ các route được khai báo tường minh trong `PUBLIC_RULES`.
  - Tuyệt đối không tự ý mở public các route mang tính chất ghi dữ liệu nhạy cảm nếu không nằm trong chính sách.
- **Quy tắc phân quyền Route Quản trị & Soft Visibility Toggles:**
  - Các route quản trị (`/api/admin/*`, quản lý users, chỉnh sửa cấu hình sheets `/api/sheets/config`) tự động kiểm tra quyền `ADMIN` hoặc `SUPERADMIN`.
  - Các endpoint toggle trạng thái hiển thị (`PATCH /api/players/:id/visibility` và `PATCH /api/training/courses/:id/visibility`) được bảo vệ nghiêm ngặt dưới chính sách Default-Deny, chỉ cho phép `ADMIN` hoặc `SUPERADMIN` thực hiện.
  - Route quản lý vai trò và xoá người dùng yêu cầu quyền cao nhất: `SUPERADMIN`.
- **Cơ chế Kiểm duyệt Đăng ký Khóa học / Giao lưu (`POST /api/training/register`):**
  - Server kiểm tra trạng thái hoạt động của gói tập được đăng ký: nếu `course.isActive === false`, request bị từ chối ngay lập tức với mã lỗi HTTP 400 (`This training course or scrimmage session is currently inactive and not accepting registrations.`), ngăn chặn việc ghi nhận đơn đăng ký ngoài luồng.
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

### 3.4. Điều phối Google Sheets Webhook (`server.ts` & `scripts/google-apps-script-dva-shop.js`)
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

### 3.5. Chiến lược Database Index, Soft Visibility & Quản trị Database Neon (Database Strategy & Operations)
- **Cơ chế Quản trị Database Neon PostgreSQL (Database Invariant):**
  - Cơ sở dữ liệu chính của dự án chạy trên **Neon Serverless PostgreSQL** (kết nối qua Connection Pooler: `ep-late-resonance-azej7c0f-pooler...`).
  - **Đặc thù Kiến trúc:** Dự án được khởi tạo schema ban đầu không qua Prisma Migrations (chưa có baseline migration history), và Neon pooler không hỗ trợ Shadow Database tự động cho `prisma migrate dev`.
  - **Quy chuẩn Cập nhật Schema Bắt buộc:**
    - Khi thêm trường hoặc bảng mới: Bắt buộc sử dụng giá trị mặc định (`@default(...)`) hoặc trường tùy chọn (`?`) để đảm bảo 100% tính tương thích ngược (backward compatibility) với dữ liệu trực tiếp đang chạy.
    - Quy trình đồng bộ: Sử dụng **`npx prisma db push`** kết hợp **`npx prisma generate`** thay vì `prisma migrate dev` để triệt tiêu hoàn toàn lỗi `P3006 / 42P01` (relation does not exist on shadow database).
    - **Nghiêm cấm Tuyệt đối:** Không chạy bất kỳ lệnh hoặc cờ nào có khả năng drop table/column hoặc reset database (như `--force-reset`, `--accept-data-loss`).
- **Cơ chế Fallback Dữ liệu & Xử lý Lỗi API (Data Integrity Invariant):**
  - Trong backend (`server.ts` và các route handlers), cơ chế fallback trả về mock data (`data/*.json`, `src/data/mockData.ts`) **CHỈ NHẰM MỤC ĐÍCH PHÒNG VỆ CHỐNG SẬP UI KHI MẤT KẾT NỐI MẠNG CỤC BỘ**.
  - Khi kiểm thử tính năng mới, nếu UI xuất hiện mock data giả lập, lập trình viên/Agent **BẮT BUỘC** phải kiểm tra log terminal backend trước để truy vết lỗi Prisma/PostgreSQL (`P2022 ColumnNotFound`, mismatch schema) thay vì ngộ nhận đó là luồng hoạt động bình thường.
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
- **Trạng thái Code sạch & Lazy Loading:**
  - Kiến trúc chia nhỏ độc lập theo miền nghiệp vụ trong `src/pages/admin/` đảm bảo tính module hóa và khả năng mở rộng.
  - File shell điều phối [`src/pages/admin/AdminDashboardPage.tsx`](src/pages/admin/AdminDashboardPage.tsx) hoạt động như orchestration layer mỏng (bọc Provider, kiểm tra quyền `!isAdmin`, render Collapsible Sidebar, Topbar, Banner, ActiveTab và `GuestSessionEmailModal`).
  - File [`src/pages/AdminDashboardPage.tsx`](src/pages/AdminDashboardPage.tsx) giữ vai trò re-export 1 dòng, giúp `src/App.tsx` lazy-load toàn bộ cụm bundle Admin sạch sẽ mà không ảnh hưởng tới bundle trang khách hàng.
- **Cấu trúc Thư mục & Phân nhóm Miền Nghiệp vụ (Spec 005 - Dark Modern Analytics Hub):**
  - `context/`: `AdminDashboardContext.tsx` cung cấp state và hành vi dùng chung toàn trang quản trị.
  - `layout/`:
    - `AdminSidebar.tsx`: Fixed Collapsible Sidebar (`fixed top-0 left-0 bottom-0 z-30 h-screen pt-20` kèm spacer đồng bộ chiều rộng, nội dung menu cuộn độc lập qua `overflow-y-auto`, chỉ Main Content bên phải cuộn theo trục Y) với 4 phân nhóm (Expanded 256px mặc định / Collapsed 72px icon-only lưu trong `localStorage['dva_admin_sidebar_collapsed']` / Mobile drawer):
      1. **Overview**: `Overview & Analytics` (`OVERVIEW`).
      2. **Athletics & Services**: `Squad Roster` (`PLAYERS`), `Training & Scrimmages` (`TRAINING`), `Coaching Staff` (`COACHES`), `Tryout Applications` (`APPLICATIONS`), `Court Schedule & Slots` (`COURTS`).
      3. **Commerce & Competition**: `Court Bookings & VietQR` (`BOOKINGS`), `DVA Store` (`STORE`), `Tournaments` (`TOURNAMENTS`).
      4. **System**: `News & Media` (`NEWS`), `Google Sheets Sync` (`SHEETS`), `Staff & Roles` (`USERS` - SuperAdmin only).
    - `AdminQuickSearch.tsx`: Hybrid Hub Navigator (`⌘K` / `Ctrl+K`) tìm kiếm tức thì trên client qua danh sách Modules, Athletes (`fullName`, `jerseyNumber`) và Court Bookings (`bookingCode`, `customerName`).
    - `AdminHeader.tsx`: Topbar chứa nút toggle sidebar, Hybrid Quick Search bar, vị trí hiển thị duy nhất thông tin Admin kết nối (Avatar initials, Name, Email, Role badge — dropdown trùng lặp trên `Navbar` chính tự động ẩn khi ở route `/admin/*`), nút `Guest Session Email`, nút Refresh dữ liệu và nút thoát ra trang Public.
    - `FeedbackBanner.tsx`: Thông báo trạng thái và kết quả thao tác thời gian thực.
  - `tabs/`: Các component tab độc lập (tích hợp phân trang `Pagination.tsx`):
    - `OverviewTab.tsx`: Trung tâm số liệu phân tích (Analytics & KPI Hub) gồm 3 tầng: (1) Hàng 6 thẻ Metric KPI (`RevenueKpiCards.tsx`: Total Revenue, Est. Training Tuition, Booking Revenue, Shop Revenue [tổng hợp trực tiếp từ các đơn hàng `PAID`, `SHIPPED`, `COMPLETED`], Active Athletes, Pending Approvals); (2) Khu vực giữa gồm Biểu đồ cột chồng SVG 6 tháng (`RevenueTrendChart.tsx` tích hợp doanh thu Training + Court Booking + DVA Shop) và thẻ Tỷ trọng doanh thu/đăng ký giữa các dịch vụ (`Service Revenue Share`); (3) Khu vực dưới "Recent Activity" tóm tắt 5 đơn đặt sân và 5 lượt đăng ký học gần nhất kèm nút `"View All"`.
    - `PlayersTab.tsx` (phân trang 12 thẻ/trang), `TrainingTab.tsx` (6 thẻ khóa học/trang, 10 dòng học viên/trang), `BookingsTab.tsx` (10 dòng/trang), `ApplicationsTab.tsx` (10 dòng/trang), `UsersTab.tsx` (10 dòng/trang), `NewsTab.tsx` (6 bài viết/trang), `CourtsTab.tsx`, `CoachesTab.tsx`, `SheetsTab.tsx`.
    - `StoreTab.tsx`: Phân hệ quản trị thương mại thể thao DVA Store Phase 2 hoàn chỉnh gồm: (1) **Orders Management** với bộ lọc trạng thái (`All`, `Pending`, `Paid`, `Shipped`, `Completed`, `Cancelled`), duyệt thanh toán, cập nhật vận chuyển (tự động đồng bộ đè dòng `DonHang_Shop` trên Google Sheets) và nút **"Send Shipping Update"** kích hoạt Resend API gửi email Chặng 2 khi đơn ở trạng thái `SHIPPED`; (2) **Products Catalog** với modal Thêm/Sửa sản phẩm, tải ảnh mặt trước (`frontImage`) & mặt sau (`backImage`) lên Cloudinary, quản lý kho/size và nút toggle `isActive`.
    - `TournamentsTab.tsx`: Trạng thái Coming Soon của giải đấu kèm thông điệp chuẩn hóa: *"Feature Under Development - Hệ thống quản lý giải đấu đang được phát triển và dịch vụ sẽ sớm được triển khai."*
  - `hooks/`: Các custom hook tách biệt logic khỏi UI (`useAdminData`, `useFeedback`, `useAdminMetrics`, `useApplicationActions`, `useCourtCrud`, `useCourtSlotLock`, `useUsersTab`).
  - `components/`: Sub-components chuyên biệt theo từng miền (bao gồm `overview/RevenueKpiCards.tsx`, `overview/RevenueTrendChart.tsx`, `courts/*`, `bookings/*`, `players/*`, `training/*`, `coaches/*`, `news/*`, `users/*`, `sheets/*`).
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
    - Tự động chuẩn hóa mọi dữ liệu đơn vị tính học phí (`priceUnit`) và tên khóa học từ DB/fallback sang tiếng Anh thông qua `getPriceUnitLabel()`, `normalizeCoursePublicData()` và `toCourseDto()` (`lib/prisma.ts`).
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
  - Toàn bộ giao diện người dùng đọc (Public Facing UI) trên tất cả các trang (`HomePage`, `Navbar`, `Footer`, `NewsPage`, `NewsDetailPage`, `TrainingPage`, `CourseDetailModal`, `CourtBookingPage`, `PlayersPage`, `InformationPage`, `MemberRegisterPage`, `CountrySelect`, `VietQRModal`, `AuthModal`) khởi tạo và hiển thị **100% bằng Tiếng Anh (`lng: 'en'`, `fallbackLng: 'en'`)**.
  - **Static UI:** Toàn bộ Header, Footer (`Opening Hours`, `Court Location`, `All rights reserved`), Navbar, Menu, Nút bấm (CTA), Nhãn (`labels`), Bộ lọc (`filters`), Thanh phân trang (`pagination`), Placeholders ô nhập liệu, Tiêu đề modal và Thông báo toast/alert đều chuẩn hóa 100% tiếng Anh thể thao chuyên nghiệp.
  - **Dynamic UI & Seed/Mock/DB Fallback:**
    - Dữ liệu mẫu (`src/data/mockData.ts`, `data/trainingCourses.json`, `data/players.json`, `data/courts.json`) và các DTO mapper (`lib/prisma.ts`, `src/services/api.ts`) chuẩn hóa 100% sang tiếng Anh cho các trường hiển thị công khai (tên khóa học, đơn vị học phí `/ player / session`, địa chỉ sân, quê quán cầu thủ `Hanoi`, `Ho Chi Minh City`, `Da Nang`...).
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

2. **Bảo toàn Cơ sở Dữ liệu & Quy chuẩn Đồng bộ Neon PostgreSQL:**
   - **TUYỆT ĐỐI KHÔNG** tự ý xóa bảng, xóa cột hoặc thực hiện các thay đổi phá hủy dữ liệu (destructive breaking changes) trên Prisma schema.
   - Thêm trường/bảng mới bắt buộc sử dụng các mẫu tương thích ngược (giá trị mặc định an toàn `@default(...)` hoặc trường tùy chọn `?`).
   - Do Neon pooler không hỗ trợ shadow DB cho `prisma migrate dev`, quy trình đồng bộ schema chuẩn của dự án là **`npx prisma db push`** kết hợp **`npx prisma generate`**. Tuyệt đối không dùng các cờ nguy hiểm (`--force-reset`, `--accept-data-loss`).

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
