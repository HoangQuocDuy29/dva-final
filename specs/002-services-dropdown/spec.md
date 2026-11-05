# Feature Specification: Services Dropdown Navigation & Route Reorganization

**Feature Branch / ID**: `002-services-dropdown`
**Status**: Completed (Implemented & Verified)
**Scope**: Routing (`src/App.tsx`), Navigation Bar (`src/components/layout/Navbar.tsx`), Locales (`src/locales/en/common.json`, `src/locales/vi/common.json`)

---

## 1. Mục tiêu & Nguyên tắc bảo toàn (Isolation)
- Gom nhóm hai mục dịch vụ rời rạc ("Court Booking" và "Training & Scrimmage") vào một menu dropdown cha duy nhất mang tên **"Services"** trên thanh Navbar (áp dụng cho cả Desktop và Mobile).
- **Nguyên tắc bảo toàn tuyệt đối (Zero Side-Effects)**:
  - Không sửa bất kỳ logic nội bộ nào của `CourtBookingPage` hay `TrainingPage`.
  - Không đụng chạm các module khác: Home, Players, Club Info & Fees, News, Auth/Profile, Admin Dashboard.
  - Tự động chuyển hướng (Redirect) từ các đường dẫn cũ sang đường dẫn mới để bảo toàn các liên kết đã chia sẻ.

---

## 2. Đặc tả Kỹ thuật Chi tiết

### A. Cấu hình Routing (`src/App.tsx`)
- **Route chuẩn mới**:
  - `/services/court-booking`: Hiển thị trang đặt sân (`CourtBookingPage`).
  - `/services/training-scrimmage`: Hiển thị trang đào tạo & giao lưu (`TrainingPage`).
- **Cơ chế Redirect tự động (Bảo toàn Search Query)**:
  - Các đường dẫn cũ (`/booking`, `/court-booking`) ➔ Redirect vĩnh viễn (`replace`) sang `/services/court-booking`.
  - Các đường dẫn cũ (`/training`, `/services/training`) ➔ Redirect vĩnh viễn (`replace`) sang `/services/training-scrimmage`.
  - Helper `RedirectPreserveQuery` đảm bảo các query param (ví dụ: `?courseId=...` hoặc `?courtId=...`) không bị mất khi chuyển hướng.

### B. Giao diện Desktop Navbar (`src/components/layout/Navbar.tsx`)
- Thay 2 nút rời bằng menu cha **"Services"** kèm icon `ChevronDown`.
- **Cơ chế Hover mượt mà**:
  - Mở ngay khi rê chuột vào (`onMouseEnter`).
  - Đóng có độ trễ **150ms** (`setTimeout` / `clearTimeout`) khi chuột rời khỏi vùng menu, tránh hiện tượng rung giật khi lia chuột qua khoảng đệm.
- **Quy chuẩn Dark Theme**:
  - Kính mờ: `backdrop-blur-md`
  - Nền tối: `bg-[#0B0E14]/95`
  - Viền mỏng: `border border-white/10`
  - Đổ bóng: `shadow-2xl shadow-black/80`
- **Cấu trúc mỗi mục con**:
  1. **Court Booking**:
     - Icon: `CalendarDays`
     - Title: `t('nav.courtBooking')` ("Court Booking" / "Đặt sân")
     - Subtitle: *"Reserve indoor courts & practice slots"* (English)
     - Path: `/services/court-booking`
  2. **Training & Scrimmage**:
     - Icon: `Users`
     - Title: `t('nav.training')` ("Training & Scrimmage" / "Huấn luyện & Giao lưu")
     - Subtitle: *"Coaching clinics & weekly open games"* (English)
     - Path: `/services/training-scrimmage`
- **Trạng thái Active**:
  - Hiển thị gạch chân gradient cam-đỏ (`from-red-500 to-orange-500`) dưới chữ "Services" khi người dùng đang truy cập bất kỳ trang con nào thuộc dịch vụ.

### C. Giao diện Mobile Drawer (`src/components/layout/Navbar.tsx`)
- Chuyển thành dạng **Accordion chạm mở** (Click to expand/collapse).
- Icon `ChevronDown` xoay 180° khi mở.
- Tự động mở accordion nếu người dùng đang ở một trong các trang dịch vụ.
- Thụt lề trực quan (`ml-4 pl-3 border-l-2 border-slate-800`), hiển thị đầy đủ Icon + Title + Subtitle.
- Tự động đóng drawer khi người dùng click chọn một dịch vụ.

### D. Bản dịch Đa ngôn ngữ (`src/locales/en/common.json` & `src/locales/vi/common.json`)
- Thêm khóa `nav.services`:
  - Tiếng Anh: `"Services"`
  - Tiếng Việt: `"Dịch vụ"`

---

## 3. Tiêu chuẩn Kiểm thử & Nghiệm thu
- **TypeScript**: `npx tsc --noEmit` hoàn tất với 0 lỗi cú pháp và kiểu dữ liệu.
- **Build**: `npm run build` hoàn tất đóng gói Vite + Prisma + Server thành công.
