# API & Webhook Contracts: DVA Shop Module (Phase 2)

**Branch**: `006-dva-shop-phase2`  
**Date**: 2026-11-10

---

## 1. Public Storefront Endpoints (Whitelisted in `PUBLIC_RULES` in `lib/security.ts`)

### `GET /api/store/products`
- **Access**: Public (returns only `isActive: true` products unless requester is authenticated Staff/Admin with `?all=true`).
- **Query Params**: `category` (optional), `search` (optional), `all` (optional, staff only).
- **Response `200 OK`**: `StoreProduct[]` sorted by `createdAt DESC`.

### `POST /api/store/orders`
- **Access**: Public (Guest Buy-Now supported, protected by `publicWriteLimiter`).
- **Request Body**:
  ```json
  {
    "productId": "prod-jsy-short-01",
    "quantity": 1,
    "size": "L",
    "color": "Red/Gold",
    "height": 182,
    "weight": 74,
    "customName": "QUOC DUY",
    "customNumber": "12",
    "customerName": "Nguyen Van A",
    "customerPhone": "0912345678",
    "customerEmail": "athlete@gmail.com",
    "socialLink": "https://instagram.com/athlete",
    "deliveryMethod": "COURT_PICKUP",
    "shippingAddress": "",
    "notes": "Pick up on Tuesday evening session"
  }
  ```
- **Server-Side Logic**:
  1. Look up `Product` in PostgreSQL (`prisma.product.findUnique`), verify `isActive !== false`.
  2. Calculate `unitPrice = product.price` and `totalAmount = unitPrice * quantity` server-side (never trust client price).
  3. Generate unique `orderCode` (`DVA-SHOP-YYYYMMDD-XXXXXX`) and `transferContent` (`DVA [CAT_CODE] [XXXXXX]`).
  4. Persist `Order` + `OrderItem` in PostgreSQL.
  5. Fire-and-forget `dispatchGoogleSheetsWebhookAsync('Store_Orders', 'DonHang_Shop', sheetRowData)`.
  6. Return `201 Created` with full `StoreOrder` DTO + `vietqrUrl`.

### `POST /api/store/orders/:id/confirm-payment`
- **Access**: Public (Guest payment confirmation button *"I Have Transferred / Confirm Order"*).
- **Server-Side Logic**:
  1. Sets `customerConfirmedAt = new Date()` on the `Order`.
  2. Fire-and-forget Stage 1 Resend Email (`sendShopOrderConfirmationEmail`) to customer (if `customerEmail` provided) + Admin Notification (`sendAdminNotification({ type: 'SHOP_ORDER', ... })`).
  3. Fire-and-forget Google Sheets idempotent upsert to `DonHang_Shop` (updating status note to reflect customer transfer confirmation).
  4. Returns `200 OK` `{ success: true, order: StoreOrder }`.

---

## 2. Admin Store Management Endpoints (`ADMIN` / `SUPERADMIN` Required)

### `POST /api/store/products`
- Creates a new `Product` in PostgreSQL with `sku`, `name`, `category`, `price`, `stock`, `frontImage`, `backImage`, `sizes`, `colors`, `description`, `isActive`.

### `PUT /api/store/products/:id` & `PATCH /api/store/products/:id`
- Updates an existing `Product` in PostgreSQL.

### `PATCH /api/store/products/:id/active`
- Toggles `isActive` visibility of a product (`true` / `false`).

### `DELETE /api/store/products/:id`
- Deletes a product if it has 0 linked `OrderItem` records; otherwise archives it (`isActive = false`) to preserve historical order integrity.

### `GET /api/store/orders`
- Returns all `Order` records (with `items: true`) ordered by `createdAt DESC`.

### `PATCH /api/store/orders/:id/status`
- **Request Body**: `{ "status": "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED" }` (also accepts `"paymentStatus"` alias for backward compatibility).
- **Server-Side Logic**:
  1. Updates `order.status` in PostgreSQL.
  2. Fire-and-forget idempotent upsert to Google Sheets `DonHang_Shop` (matches `Mã đơn hàng` and overwrites `Trạng thái đơn` in-place!).
  3. If transitioning to `PAID` for the first time, triggers `sendShopOrderConfirmationEmail` (Stage 1) + Admin notification.

### `POST /api/store/orders/:id/shipping-email`
- **Purpose**: Triggered by Admin clicking **"Send Shipping Update"** on a `SHIPPED` order.
- **Server-Side Logic**:
  1. Verifies the order has a valid `customerEmail`.
  2. Updates `shippingEmailSentAt = new Date()` in PostgreSQL.
  3. Dispatches Stage 2 Resend Email (`sendShopOrderShippingEmail`) informing the customer that their order is on the way (Home Delivery COD) or ready at DVA Court (BTL Thông Tin - 155 Trường Chinh).
  4. Returns `200 OK` `{ success: true, shippingEmailSentAt, order }`.
