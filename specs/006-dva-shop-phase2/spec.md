# Feature Specification: DVA Shop Module (Phase 2.1) — Quick View, Hierarchical Product Detail (`/shop/[category]/[product-slug]`), Image Zoom Lightbox, Discount Pricing, Temporarily Paused State, Dynamic VietQR & Google Apps Script Sync

**Feature Branch**: `006-dva-shop-phase2`  
**Updated**: 2026-11-11  
**Status**: Approved for Implementation  
**Input**: User specification & business refinement for DVA Shop Module (Phase 2.1)

---

## 1. Executive Summary & Business Refinements

Launch and refine the official **DVA Shop** e-commerce module on `/shop` and `/shop/:category/:productSlug` alongside full administrative management inside the **DVA Store** tab of the Admin Hub (`/admin/dashboard?tab=store`).

### Key Refinements in Phase 2.1:
1. **Navigation & Labels**:
   - The main website Navbar displays the concise label **"Shop"** (instead of "DVA Shop" or "Store").
2. **Fulfillment & Delivery Configuration**:
   - **Default Free Pickup Location**: `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"`.
   - When the customer selects Court Pickup (default), the form displays this fixed pickup address clearly.
   - When the customer selects **"Home Delivery"**, the form reveals a required Delivery Address input accompanied by the explicit notice: *"Shipping fee is paid directly by the recipient to the courier upon delivery (COD)."*
3. **Refined Jersey Order Form, Quantity Selector & Size Matrix**:
   - **Custom Printing**: Remove the "Jersey Number" (`Số áo`) input field from the customer checkout UI. **Retain ONLY `"PLAYER NAME"`** (desired competition name printed on the back of the jersey).
   - **Size Guide & Size Options**: Remove `"XS"`. Sizes start strictly from **`S` and above (`S`, `M`, `L`, `XL`, `2XL`)**.
   - **Quantity Selector (`1, 2, 3...`)**: Available directly inside both the Buy-Now Checkout Modal and the dedicated Product Detail Page (`/shop/[category]/[product-slug]`).
     - Ordering `quantity > 1` applies the same selected size and `"PLAYER NAME"` print to that order, and `totalAmount` automatically multiplies (`price * quantity`).
     - An informational hint notes that if a customer wishes to order multiple items with different sizes or different printed player names, they should submit separate orders for each configuration.
4. **Product Discovery: Quick View Modal, Hierarchical Product Detail Page & High-Res Image Zoom**:
   - **"Quick View" Button on Product Cards**: Opens a rich Quick View modal displaying product specs, front & back image switcher with zoom trigger, size matrix, and instant "Buy Now" action without leaving `/shop`.
   - **Direct Click on Product Image or Title**: Navigates to a dedicated hierarchical Product Detail Page at `/shop/:categorySlug/:productSlug` (e.g., `/shop/mens-sleeveless/dva-pro-jersey-2026`).
   - **High-Res Image Zoom / Lightbox Viewer**: Both the Quick View modal and the Product Detail Page allow customers to inspect `frontImage` and `backImage` with interactive **Zoom In / Zoom Out (`1x` – `3x`) & Fullscreen Lightbox** controls.
5. **Upgraded Admin Product Management (`StoreTab.tsx`)**:
   - **Rich Content Customization**: Admin can edit Product Title (`name`), URL Slug (`slug`), and detailed rich-text/markdown `description`.
   - **Discount & Original Price Policy (`originalPrice` & `price`)**:
     - Added `originalPrice` (list price before discount) alongside `price` (actual selling price).
     - On the Storefront (Cards, Quick View, Detail Page, Checkout): Whenever `originalPrice > price`, display the crossed-out `originalPrice` (strikethrough) next to the highlighted selling `price` along with a promotional discount badge (e.g., `"-20%"`).
   - **Temporarily Paused / Out of Stock State (`isPaused`)**:
     - Admin has an instant toggle switch for **"Temporarily Paused / Hết hàng - Sẽ quay lại sớm"** (`isPaused: boolean`) in addition to complete visibility (`isActive: boolean`).
     - When `isPaused = true` (and `isActive = true`), the product remains visible on `/shop` and `/shop/:category/:productSlug` with a prominent **"Temporarily Out of Stock — Coming Back Soon"** badge, while the **"Buy Now"** button is automatically disabled so customers cannot place orders until resumed.

---

## 2. Database Safety & Schema Invariant

> [!IMPORTANT]
> **ADDITIVE-ONLY DATABASE INVARIANT (NEON POSTGRESQL)**:
> - The local environment connects directly to Neon PostgreSQL via Connection Pooler.
> - **ADDITIVE SCHEMA ONLY**: Append/extend `Product` (`slug`, `originalPrice`, `isPaused`), `Order` (`quantity`), and `OrderItem` (`quantity`) in `prisma/schema.prisma`.
> - **STRICTLY FORBIDDEN**: NEVER modify, rename, or drop any existing models, columns, or data (`User`, `Player`, `Court`, `ClosedSlot`, `Booking`, `CoachProfile`, `TrainingCourse`, `TrainingRegistration`, `MemberApplication`, `NewsPost`, `AppConfig`, `GoogleSheetsSyncLog`).
> - **FORBIDDEN COMMAND**: NEVER run `prisma migrate dev` or `prisma migrate reset`.
> - **REQUIRED SYNC COMMANDS**:
>   ```bash
>   npx prisma db push
>   npx prisma generate
>   ```

---

## 3. User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigation ("Shop"), Storefront Cards, Quick View & Hierarchical Product Detail Page (Priority: P1)

As a Volleyball Player or Supporter browsing the website,  
I want to click **"Shop"** on the main Navbar, see dual-image hover cards (`frontImage` -> `backImage`) with discount badges (`-20%` and strikethrough `originalPrice`) and stock status (`Temporarily Out of Stock / Coming Back Soon`), open a **"Quick View"** modal without leaving the page, or click the product image/title to visit `/shop/[category]/[product-slug]` with high-resolution Zoom In / Zoom Out on both front and back photos,  
So that I can thoroughly inspect jersey fabric, back-print layout, and sizing before buying.

**Acceptance Scenarios**:
1. **Given** the main website Navbar (Desktop & Mobile Drawer), **When** rendered, **Then** the navigation item displays **"Shop"** (linking to `/shop`).
2. **Given** a product on `/shop`, **When** `originalPrice > price`, **Then** the card, Quick View, and Detail Page display `originalPrice` with strikethrough, the active `price`, and a calculated `-[X]%` discount badge.
3. **Given** a product card on `/shop`, **When** the user clicks **"Quick View"**, **Then** a modal opens showing front/back gallery thumbnails, high-res zoom trigger, markdown/rich description, size guide button, and "Buy Now" CTA without navigating away from `/shop`.
4. **Given** a product card on `/shop`, **When** the user clicks directly on the product image or product title, **Then** the browser navigates to `/shop/:categorySlug/:productSlug` (e.g. `/shop/mens-sleeveless/dva-pro-jersey-2026`), where the user can zoom in/out (`1x` to `3x`) on both `frontImage` and `backImage`, select Size (`S`, `M`, `L`, `XL`, `2XL`), enter `"PLAYER NAME"`, choose Quantity (`1, 2, 3...`), and click **"Buy Now"**.
5. **Given** a product with `isPaused = true`, **When** displayed on `/shop`, Quick View, or `/shop/:categorySlug/:productSlug`, **Then** it remains visible with the badge **"Temporarily Out of Stock / Coming Back Soon"** and the **"Buy Now"** button is disabled.

---

### User Story 2 - Refined Guest Buy-Now Checkout, "PLAYER NAME" Print, Quantity Multiplier & Fixed Court Pickup vs. Home Delivery (Priority: P1)

As a Customer purchasing gear via the Buy-Now Modal or Product Detail Page,  
I want to choose sizes starting from `S` (`S`, `M`, `L`, `XL`, `2XL` — no `XS`) using an updated Size Guide, enter only my `"PLAYER NAME"` for jersey printing (no jersey number field), pick my desired `quantity` (`1, 2, 3...`) with automatic total calculation, and choose between the fixed pickup address `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"` or `"Home Delivery"` (COD shipping fee),  
So that checkout is fast, unambiguous, and generates an exact dynamic VietQR code (`DVA [CAT_CODE] [ORDER_CODE_SUFFIX]`).

**Acceptance Scenarios**:
1. **Given** a Jersey product (`SLEEVELESS`, `SHORT_SLEEVE`, `WOMEN`, `JERSEYS`), **When** configuring the order, **Then**:
   - The Size selector & **Size Guide** popup show only sizes from `S` upward (`S`, `M`, `L`, `XL`, `2XL`), with **`XS` completely removed**.
   - The custom print section displays **ONLY `"PLAYER NAME"`** (desired competition name on jersey) and **does NOT display a Jersey Number input**.
   - Height (`cm`) and Weight (`kg`) inputs assist with fit verification.
2. **Given** the **Quantity Selector (`1, 2, 3...`)**, **When** the customer increases quantity to `N > 1`, **Then**:
   - `totalAmount` automatically updates to `price * N` (validated server-side).
   - A clear note explains that all `N` units in this order share the selected Size and `"PLAYER NAME"`, and customers ordering different sizes or different player names should place separate orders.
3. **Given** the Fulfillment / Delivery Method selector, **When** `"Pick up at DVA Court (Free)"` is selected (default), **Then** the form displays the fixed read-only pickup location:
   `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"`.
   **When** `"Home Delivery"` is selected, **Then** the form opens the required shipping address input with the notice that shipping fees are paid directly by the recipient to the courier upon delivery (COD).

---

### User Story 3 - Master Google Apps Script (`DonHang_Shop`) & Idempotent Upsert (Priority: P1)

As a Club Operations Manager,  
I want all Shop orders to sync into the `DonHang_Shop` tab inside the **existing** DVA Google Spreadsheet with idempotent upserts keyed by `Mã đơn hàng` while keeping 100% of existing sheet tabs (`DatSan`, `Training_Registrations`, `DangKyKhoaHoc`, `TuyenThanhVien`) intact.

---

### User Story 4 - Admin Hub Product Discount, Rich Description, Temporarily Paused Toggle & Order Fulfillment (Priority: P1)

As a Club Administrator in `DVA Store` (`/admin/dashboard?tab=store`),  
I want to edit product Title (`name`), Slug (`slug`), detailed Description (`description`), Original Price (`originalPrice`) and Selling Price (`price`), upload `frontImage` & `backImage` via Cloudinary, toggle **"Temporarily Paused / Out of Stock"** (`isPaused`) as well as visibility (`isActive`), filter orders, and trigger Stage 2 *"Send Shipping Update"* Resend emails.

---

## 4. Requirements Summary

- **FR-001 (Database Schema)**: `Product` includes `slug String?`, `originalPrice Int?`, `price Int`, `sizes String[] @default(["S", "M", "L", "XL", "2XL"])`, `isPaused Boolean @default(false)`, `isActive Boolean @default(true)`. `Order` and `OrderItem` include `quantity Int @default(1)`. Synced strictly via `npx prisma db push` and `npx prisma generate`.
- **FR-002 (Navbar Label)**: Main Navbar item MUST be labeled `"Shop"`.
- **FR-003 (Fulfillment Address)**: Default Court Pickup MUST display fixed address `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"`.
- **FR-004 (Jersey Form & Size Guide)**: Remove Jersey Number input; keep ONLY `"PLAYER NAME"`. Remove `"XS"` from Size Guide and size arrays (`S`, `M`, `L`, `XL`, `2XL`).
- **FR-005 (Quantity Selector)**: Support quantity selection (`1, 2, 3...`) in both Checkout Modal and Product Detail Page; multiply total price by `quantity` on client and server.
- **FR-006 (Quick View, `/shop/:category/:productSlug` & Image Zoom)**:
  - Product card **"Quick View"** button opens a Quick View modal.
  - Clicking product card image or title navigates to `/shop/:categorySlug/:productSlug` (e.g., `/shop/mens-sleeveless/dva-pro-jersey-2026`).
  - Interactive Lightbox / Zoom (`Zoom In`, `Zoom Out`, reset, front/back toggle) for `frontImage` and `backImage`.
- **FR-007 (Admin Discount & Temporarily Paused State)**:
  - Admin form supports `originalPrice`, `price`, `name`, `slug`, rich `description`, `isPaused` toggle, and `isActive` toggle.
  - Storefront renders strikethrough `originalPrice` + `-%` badge when `originalPrice > price`, and disables "Buy Now" with `"Temporarily Out of Stock / Coming Back Soon"` badge when `isPaused === true`.
- **FR-008 (Standardized Two-Stage Email Flow & Dedicated Dispatch Modal)**:
  - **Stage 1 (Order Confirmation)**: Triggers strictly once when the customer clicks `"Confirm Order / I Have Transferred"` on the VietQR payment screen. Sends 1 email to the customer with order summary and waiting note for verification, and 1 notification email to Admin (`quocduyhoang42@gmail.com`). All redundant emails on initial order placement, webhook, and Admin PAID approval are eliminated.
  - **Stage 2 (Dedicated Dispatch Email Flow)**: Admin Orders table features `"Send Dispatch Email"` (or `"Resend Dispatch Email"` if already sent) on each row. Clicking opens `DispatchEmailModal` pre-populated with read-only order details. If `HOME_DELIVERY`, provides carrier and tracking code inputs with a COD fee reminder; if `COURT_PICKUP`, provides court pickup instructions (155 Trường Chinh). Clicking `"Confirm & Send Email"` calls the backend, marks order `SHIPPED`, sends bilingual email via Resend, idempotently upserts to Google Sheets `DonHang_Shop`, and shows a success toast.
