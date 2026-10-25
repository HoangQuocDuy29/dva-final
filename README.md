<div align="center">

# 🏐 DVA VOLLEYBALL CLUB PLATFORM
### Nền tảng Quản lý & Đặt sân Câu lạc bộ Bóng chuyền DVA Sports Arena

[![Tech Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20React%20%7C%20PostgreSQL-blue.svg)](#-công-nghệ-sử-dụng)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](#)

</div>

---

## 📌 Giới thiệu dự án

**DVA Volleyball Club Platform** là hệ thống quản trị và vận hành toàn diện cho Câu lạc bộ Bóng chuyền DVA tại Hà Nội. Hệ sinh thái kết nối ban điều hành CLB, các vận động viên và học viên tham gia thi đấu, tập luyện qua một nền tảng số hóa trực quan, đồng bộ và tự động.

Hệ thống hỗ trợ quản lý vận hành đa sân bãi, phân hạng đội hình (Senior / Junior / Youth), đặt lịch thi đấu/tập luyện theo từng sân con độc lập và đồng bộ trực tiếp dữ liệu với Google Sheets cùng cổng thanh toán VietQR.

---

## ✨ Tính năng nổi bật

### 1. Đặt sân trực tuyến & Quản lý sân con (Court Booking)
- Quản lý 3 cơ sở chính: **BTL Thông Tin**, **Thể Công**, và **Mỹ Đình**.
- Cơ chế quản lý theo từng sân con độc lập (Sân A / Sân B tại BTL Thông Tin) với khung ca tập, tình trạng trống và lịch bảo trì riêng biệt.
- Lọc ca theo ngày, kiểm tra trạng thái thời gian thực và ngăn chặn đặt trùng ca (Duplicate Protection).

### 2. Tuyển sinh & Gói tập Scrimmage (Training & Scrimmage)
- Đăng ký các gói Scrimmage, hoàn thiện kỹ năng và lớp tập luyện theo cấp độ (**Senior**, **Junior**, **Youth**).
- Form đăng ký thông minh: hỗ trợ chọn ca tập cụ thể trong tuần (T2, T4, T6, T7, CN) hoặc thỏa thuận lịch trực tiếp với Coach.
- Thu thập đầy đủ thông tin vị trí thi đấu, mục tiêu cải thiện kỹ năng và lưu trữ tập trung.

### 3. Tự động hóa Thanh toán & Đồng bộ Google Sheets
- **Thanh toán VietQR động:** Tự động sinh cú pháp chuyển khoản chuẩn hoá (`DVA [MÃ_GÓI] [SỐ_ĐIỆN_THOẠI]`) và mã QR ngân hàng chính xác số tiền.
- **Google Apps Script Webhook:** Tự động đổ dữ liệu đơn đặt sân (`DatSan`), đăng ký tập luyện (`DangKyKhoaHoc`) và hồ sơ ứng tuyển (`TuyenThanhVien`) về Google Sheets theo thời gian thực với cơ chế chống ghi đè dữ liệu (Idempotent Upsert).

### 4. Quản trị viên Toàn năng (Admin Dashboard)
- Tùy biến cấu hình cơ sở vật chất, bảng giá thuê/giờ, ảnh đại diện sân và tiện ích sân bóng.
- Bộ công cụ cấu hình lịch tuần (Weekly Schedule Settings): linh hoạt chỉnh sửa ca theo từng thứ và hỗ trợ sao chép lịch giữa các sân con.
- Quản lý danh sách cầu thủ, hồ sơ hội viên và đối soát trạng thái đơn hàng.

---

## 🛠 Công nghệ sử dụng

- **Frontend:** React, TypeScript, Vite, Tailwind CSS / Custom UI Components.
- **Backend:** Node.js, Express / RESTful APIs, TSX runtime.
- **Database & ORM:** PostgreSQL 17, Prisma ORM.
- **Tích hợp:** Google Sheets API / Google Apps Script Webhook, VietQR API, Cloudinary (CDN lưu trữ media).

---