# Feature Specification: Navigation Renaming & Information Page Schedule Update with Call-to-Action

**Feature Branch / ID**: `003-information-page-update`
**Status**: Completed (Implemented & Verified)
**Scope**:
- Navigation bar (`src/components/layout/Navbar.tsx`)
- Translation locales (`src/locales/en/common.json`, `src/locales/vi/common.json`)
- Information page (`src/pages/InformationPage.tsx`)

---

## 1. Mục tiêu & Bối cảnh (Context & Objectives)
Nhằm tối ưu trải nghiệm người dùng, tinh giản hệ thống điều hướng và làm rõ lịch sinh hoạt các tuyến vận động viên của CLB bóng chuyền DVA:
1. **Tinh gọn Navigation**: Rút gọn tên mục điều hướng từ *"Club Info & Fees"* thành *"Information"* trên cả Desktop Navbar và Mobile Drawer để menu thông thoáng, hiện đại và chuẩn nhận diện.
2. **Minh bạch hóa Lịch tập luyện (Arena Schedule)**: Tách riêng tuyến **Youth** (thanh thiếu niên/đội trẻ) khỏi đội **Junior** để người xem dễ dàng nắm bắt khung giờ sinh hoạt độc lập.
3. **Thúc đẩy Chuyển đổi (Conversion Optimization)**: Thêm khối Call-to-Action (CTA) bắt mắt ở cuối trang `InformationPage` để kết nối trực tiếp độc giả đang tìm hiểu CLB sang quy trình ứng tuyển / đăng ký hội viên (`/register`).

---

## 2. Đặc tả Kỹ thuật Chi tiết

### A. Đổi tên Module Navigation
- **Component**: `src/components/layout/Navbar.tsx`
  - Secondary nav link: `{ label: t('nav.clubInfo', 'Information'), path: '/information' }`
- **Tập tin Đa ngôn ngữ**:
  - `src/locales/en/common.json`: `"clubInfo": "Information"`
  - `src/locales/vi/common.json`: `"clubInfo": "Thông tin"`
- **Phạm vi áp dụng**: Hiển thị đồng bộ cả trên màn hình Desktop (Capsule Navbar) và màn hình điện thoại (Mobile Drawer).

### B. Tách biệt Lịch tập luyện Đội Youth (Mục 2. Weekly Arena Schedule)
Cập nhật cả 2 chế độ hiển thị (*Responsive Multi-View*):

#### 1. Chế độ Mobile Vertical Cards (`md:hidden`)
- **Card 1 — Senior Squad**: Giữ nguyên Mon · Wed · Sat (19:00 – 21:30) tại BTL Thong Tin · Court A.
- **Card 2 — Junior Squad (Play)**: Giữ nguyên Friday Evening (19:00 – 21:30) tại BTL Thong Tin · Court A.
- **Card 3 — Junior Squad (Matchplay)**: Tách riêng cho Junior, Sunday Afternoon (14:00 – 16:30) tại BTL Thong Tin · Court A & B.
- **Card 4 — Youth Squad (Mới)**:
  - Badge Level: `YOUTH` (`bg-emerald-950 text-emerald-300 border-emerald-800`).
  - Thời gian: `Sunday Evening (17:00 – 19:00)`.
  - Hoạt động: `Youth Squad – Training & Matchplay`.
  - Phân bổ sân: `BTL Thong Tin · Court A`.

#### 2. Chế độ Desktop & Tablet Table (`hidden md:block`)
- **Row 1**: Senior Squad — Mon · Wed · Sat (19:00 – 21:30) | `SENIOR` | BTL Thong Tin Court · Court A.
- **Row 2**: Junior Squad (Play) — Friday Evening (19:00 – 21:30) | `JUNIOR` | BTL Thong Tin Court · Court A.
- **Row 3**: Junior Squad (Matchplay) — Sunday Afternoon (14:00 – 16:30) | `JUNIOR` | BTL Thong Tin Court · Court A & B.
- **Row 4 (Mới)**: Youth Squad — Sunday Evening (17:00 – 19:00) | `YOUTH` | BTL Thong Tin Court · Court A.

### C. Khối Call-to-Action (CTA) ở cuối trang InformationPage
- **Vị trí**: Section 5, đặt ngay sau Mục 4 (*Taraflex Court Shoe Etiquette*) và trước phần kết trang.
- **Thiết kế UI chuẩn Dark Sports**:
  - Nền chuyển sắc: `bg-gradient-to-br from-[#161F30] via-[#1A1225] to-[#0E1524]`
  - Viền mỏng cao cấp: `border border-orange-500/30`
  - Hiệu ứng ánh sáng nền (*Ambient Glow*): Vòng tròn mờ ảo đỏ cam (`bg-red-600/10` và `bg-orange-500/10`) với `blur-3xl`.
  - Badge trên cùng: `"Join the DVA Squad"` kèm icon `Sparkles`.
  - Tiêu đề chính (H2): **"Ready to Step on the Court?"**
  - Dòng phụ: *"Register today to secure your training spot and become part of our volleyball community."*
  - Nút bấm:
    - Nhãn: **"Register Now"** kèm icon `UserPlus` & `ArrowRight`.
    - Điều hướng: Link tới trang tuyển quân `/register`.
    - Gradient cam đỏ (`from-red-600 to-orange-500`), đổ bóng `shadow-red-900/40`, phóng to nhẹ khi hover (`hover:scale-[1.02]`).

---

## 3. Ràng buộc Bất biến (Invariants)
- **Zero Side-Effects**: Tuyệt đối không can thiệp các module khác (Court Booking, Training, Players, News, Auth).
- **Public UI 100% English**: Toàn bộ nội dung hiển thị công khai mặc định là tiếng Anh chuẩn mực.
- **Query & Route Stability**: Đường dẫn trang vẫn là `/information`, không làm gãy bookmark hay liên kết điều hướng ngoài.

---

## 4. Tiêu chuẩn Kiểm thử & Nghiệm thu
- `npx tsc --noEmit`: 0 lỗi biên dịch kiểu dữ liệu.
- `npm run build`: Hoàn tất build bundle Vite + Prisma Client + Node server thành công.
