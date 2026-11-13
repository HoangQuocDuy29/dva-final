# Quickstart & Verification Guide: DVA Shop Module (Phase 2)

**Branch**: `006-dva-shop-phase2`  
**Date**: 2026-11-10

---

## 1. Safe Database Synchronization (Neon PostgreSQL)

Run ONLY the additive Prisma sync commands (NEVER run `prisma migrate dev`):

```bash
npx prisma db push
npx prisma generate
```

---

## 2. Updating the Existing Google Spreadsheet's Apps Script

1. Open the **existing** DVA Volleyball Club Google Spreadsheet (the same file containing `DatSan`, `DangKyKhoaHoc`, `TuyenThanhVien`).
2. In the top menu, click **Extensions** -> **Apps Script**.
3. Open `scripts/google-apps-script-dva-shop.js` from this project repository (or click **"Copy Apps Script Code"** in Admin Hub -> `Google Sheets Sync`), and paste it into `Code.gs`, replacing the old script.
4. Click **Save** and **Deploy** -> **Manage deployments** -> **Edit** (pencil icon) -> **Version: New version** -> **Deploy** (this keeps your existing Web App URL unchanged, or you can create a New deployment and paste the URL in Admin Hub).
5. When the first Shop order arrives (or when you click **Test Send to Sheet** in Admin Hub), the script will automatically create the `DonHang_Shop` tab inside your existing Spreadsheet with all 19 headers formatted in DVA red (`#B91C1C`).

---

## 3. Verification Checklist

1. **Type & Build Gate**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
2. **Public Storefront (`/shop`)**:
   - Visit `/shop` (or via Navbar -> `Services` -> `DVA Shop` / top nav link).
   - Hover over product cards to see `frontImage` smoothly transition to `backImage`.
   - Click **Buy Now** on a Jersey -> test **Size Guide** popup, enter Size, Height, Weight, Custom Name, Jersey Number, choose Court Pickup or Home Delivery -> click **Proceed to VietQR Payment**.
   - Verify VietQR image renders with `DVA JSY [SUFFIX]` and MB Bank `0002090671521` (`HOANG QUOC DUY`).
   - Click **I Have Transferred / Confirm Order** -> verify Stage 1 Resend email and `DonHang_Shop` row creation.
3. **Admin Store & Stage 2 Shipping Email (`/admin/dashboard?tab=store`)**:
   - Add/edit a product with Cloudinary Front & Back image uploads; toggle `isActive`.
   - In `Orders & VietQR`, filter orders by `Pending`, `Paid`, `Shipped`, `Completed`.
   - Mark an order as `PAID` -> verify `DonHang_Shop` updates the existing row in-place (`Trạng thái đơn = PAID`) and Overview KPI `Shop Revenue` + `Total Revenue` increase immediately.
   - Mark the order as `SHIPPED` and click **Send Shipping Update** -> verify Stage 2 Resend email is delivered.
