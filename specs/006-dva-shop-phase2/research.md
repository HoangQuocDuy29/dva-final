# Phase 0 Research: DVA Shop Module (Phase 2)

**Branch**: `006-dva-shop-phase2`  
**Date**: 2026-11-10  
**Related Spec**: [spec.md](./spec.md)

---

## R-01: Inheriting Court Booking VietQR Payment Architecture

- **Existing Pattern**:
  - `server.ts` defines `BANK = { id: 'MB', accountNo: '0002090671521', accountName: 'HOANG QUOC DUY' }`.
  - `lib/mailer.ts` exports `buildBookingVietQrUrl(amount, transferContent)` which formats:
    `https://img.vietqr.io/image/MB-0002090671521-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`.
  - `CourtBookingPage.tsx` and `/api/bookings/:id/confirm-payment` allow guests to place a reservation, view the dynamic VietQR modal, and click **"I Have Transferred / Confirm Order"**, which records `customerConfirmedAt` and dispatches confirmation emails without blocking.
- **Decision for DVA Shop**:
  - Reuse `buildBookingVietQrUrl(order.totalAmount, order.transferContent)` for Shop orders.
  - Format `orderCode` as `DVA-SHOP-YYYYMMDD-XXXXXX` (where `XXXXXX` is a 6-digit numeric suffix, e.g., `849201`).
  - Format `transferContent` strictly as `DVA [CAT_CODE] [ORDER_CODE_SUFFIX]`:
    - `SLEEVELESS` / `SHORT_SLEEVE` / `WOMEN` / `JERSEYS` -> `JSY`
    - `KNEE_PADS` -> `PAD`
    - `SOCKS` -> `SCK`
    - `VOLLEYBALLS` -> `BAL`
    - `TRAINING_GEAR` / `ACCESSORIES` -> `ACC`
    - Example: `DVA JSY 849201` or `DVA PAD 849201`.

---

## R-02: Single Master Google Spreadsheet & Idempotent Apps Script Upsert (`DonHang_Shop`)

- **Clarified Operational Requirement**:
  1. **NO new standalone Google Spreadsheet file**: All Shop orders MUST flow into the **exact same existing Google Spreadsheet** of the club (which currently contains `DatSan`, `Training_Registrations`, `DangKyKhoaHoc`, `TuyenThanhVien`) via the existing configured `googleScriptUrl` webhook (`getGoogleScriptUrl()`).
  2. **Auto-Create Tab `DonHang_Shop`**: The Google Apps Script (`SpreadsheetApp.getActiveSpreadsheet()`) inherits 100% of existing code and automatically creates the new sub-sheet (tab) `DonHang_Shop` inside the active spreadsheet on the first incoming `DonHang_Shop` webhook if it does not yet exist (`ss.getSheetByName('DonHang_Shop') || ss.insertSheet('DonHang_Shop')`).
  3. **Project Script File Purpose**: `scripts/google-apps-script-dva-shop.js` (and `src/pages/admin/components/sheets/appsScriptTemplate.ts`) serves purely as the canonical source code repository file for the Admin to copy and paste into the Apps Script Editor (`Extensions > Apps Script`) of the existing Google Sheet.
- **Idempotent Upsert Upgrade**:
  - In the existing Apps Script (`appsScriptTemplate.ts` lines 159–178), row deduplication checks:
    ```javascript
    var idColIndex = headers.indexOf('Mã đặt sân');
    if (idColIndex === -1) idColIndex = headers.indexOf('Mã đăng ký');
    if (idColIndex === -1) idColIndex = headers.indexOf('Mã đơn hàng');
    ```
  - By adding `if (idColIndex === -1) idColIndex = headers.indexOf('Mã đơn hàng');`, whenever an Admin updates a Shop order status (`PENDING` -> `PAID` -> `SHIPPED` -> `COMPLETED` / `CANCELLED`) or a customer confirms transfer, the backend dispatches the updated row payload to `DonHang_Shop` with the same `Mã đơn hàng` (`order.orderCode`), and Apps Script overwrites that exact row in-place (`sheet.getRange(r + 2, 1, 1, rowValues.length).setValues([rowValues])`) instead of appending a duplicate row.

---

## R-03: 2-Stage Resend Transactional Emails (`lib/mailer.ts`)

- **Existing Pattern**:
  - `lib/mailer.ts` uses `getResendClient()` and `getSenderEmail()` (`DVA Volleyball <contact@dva-volleyball-hanoi.com>`) with dark athletic bilingual HTML templates (`#0b0f19` outer background, `#111827` card, orange-red header gradient) and `sendAdminNotification()`.
- **Decision for DVA Shop**:
  - **Stage 1 (`sendShopOrderConfirmationEmail`)**: Sent when customer clicks *"I Have Transferred / Confirm Order"* (`POST /api/store/orders/:id/confirm-payment`) or when Admin updates status to `PAID` (`PATCH /api/store/orders/:id/status`). Includes order summary, customization details (Size, Height/Weight, Custom Jersey Name/Number), Delivery Method (Court Pick-up at 155 Trường Chinh vs. Home Delivery COD), embedded VietQR code, and venue entrance guide if Court Pick-up is selected. Also triggers `sendAdminNotification({ type: 'SHOP_ORDER', ... })`.
  - **Stage 2 (`sendShopOrderShippingEmail`)**: Triggered explicitly by Admin clicking **"Send Shipping Update"** (`POST /api/store/orders/:id/shipping-email`) when an order is `SHIPPED`. Sends a bilingual fulfillment notification tailored to `deliveryMethod`:
    - `COURT_PICKUP`: Notifies the athlete that their order has arrived at **DVA Court (BTL Thông Tin - 155 Trường Chinh)** and is ready for pick-up at the court desk.
    - `HOME_DELIVERY`: Notifies the customer that their parcel has been handed over to the courier to `shippingAddress` (with reminder that shipping fee is paid directly to the courier upon delivery).

---

## R-04: Admin Hub & Overview Revenue Integration

- **Existing State in `src/pages/admin/`**:
  - `useAdminData.ts` already manages `storeProducts` and `storeOrders` state via `storeService.getProducts()` and `storeService.getOrders()`.
  - Currently, `useAdminData.ts` lazy-loads `STORE` scope only when `activeModule === 'STORE'`. However, because `OverviewTab` (the default landing tab) displays `Shop Revenue` KPI card, `Service Revenue Share`, and `RevenueTrendChart`, `storeProducts` and `storeOrders` should be fetched alongside `bookings` and `trainingRegs` in `fetchData()` so `OverviewTab` immediately reflects real Shop revenue on load!
  - In `useAdminMetrics.ts`, `paidStoreOrders` should include orders whose status is `'PAID'`, `'SHIPPED'`, or `'COMPLETED'` (since shipped and completed orders are also paid revenue).
