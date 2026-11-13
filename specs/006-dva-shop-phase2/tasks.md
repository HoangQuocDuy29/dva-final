---
description: "Task list for 006 — DVA Shop Module (Phase 2 & Phase 2.1 Refinement)"
---

# Tasks: DVA Shop Module (Phase 2.1 Refinement)

**Input**: Design documents from `/specs/006-dva-shop-phase2/` ([spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md))  
**Verification Gates**: `npx prisma db push`, `npx prisma generate`, `npx tsc --noEmit`, `npm run build`

---

## Phase 1–6: Base DVA Shop Implementation (Completed)

- [x] T001–T023 Core DVA Shop models, Google Apps Script `DonHang_Shop` with Idempotent Upsert, Dynamic VietQR, 2-Stage Resend Email, and Admin Overview Revenue KPIs.

---

## Phase 7: Phase 2.1 Specification & Business Refinements

**Goal**: Implement all 6 mandatory business & UX refinements requested for DVA Shop:
1. Navbar concise `"Shop"` label.
2. Default Court Pickup fixed address `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"` vs. Home Delivery COD.
3. Jersey Form & Size Matrix: Remove Jersey Number (keep ONLY `"PLAYER NAME"`), remove `"XS"` from Size Guide & size presets (`S, M, L, XL, 2XL`), and add Quantity Selector (`1, 2, 3...`) with auto-multiplied total and multi-item notice.
4. Product Viewing Experience: `"Quick View"` modal on product cards, hierarchical Product Detail route (`/shop/:categorySlug/:productSlug` when clicking product image/title), and high-resolution Image Zoom / Lightbox (`Zoom In` / `Zoom Out` on `frontImage` & `backImage`).
5. Admin Product Management: Editable Title & Rich Description, Discount pricing (`originalPrice` strikethrough + `price` + `-%` badge), and `"Temporarily Paused / Out of Stock"` (`isPaused`) toggle switch.

### Tasks

- [x] T024 Update `prisma/schema.prisma` with additive fields (`Product.slug`, `Product.originalPrice`, `Product.isPaused`, `Order.quantity`) and sync to Neon PostgreSQL via `npx prisma db push` & `npx prisma generate`
- [x] T025 Update `src/types/index.ts`, `lib/prisma.ts`, and `lib/schemas.ts` to support `slug`, `originalPrice`, `isPaused`, `quantity`, category URL slug mapping (`/shop/[category]/[product-slug]`), and sizes `S, M, L, XL, 2XL` (no `XS`)
- [x] T026 Update `server.ts` and `lib/mailer.ts` to handle `originalPrice`, `isPaused` (blocking orders on paused products + `PATCH /api/store/products/:id/paused`), `quantity` multiplication, fixed pickup address `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"`, and `"PLAYER NAME"` only customization
- [x] T027 Update `src/components/layout/Navbar.tsx`, `src/locales/en/common.json`, and `src/locales/vi/common.json` so the main navigation displays `"Shop"`
- [x] T028 Upgrade `src/pages/ShopPage.tsx` and `src/App.tsx`:
  - Route `/shop/:categorySlug/:productSlug` (e.g. `/shop/mens-sleeveless/dva-pro-jersey-2026`) when clicking product image or title
  - `"Quick View"` button on product cards opening the Quick View modal without leaving `/shop`
  - Interactive High-Res Image Zoom / Lightbox (`Zoom In` / `Zoom Out` / Pan for both `frontImage` and `backImage`)
  - Discount display (`originalPrice` strikethrough + active `price` + `-XX%` badge when `originalPrice > price`)
  - Temporarily Paused state (`isPaused === true` shows `"Temporarily Out of Stock / Coming Back Soon"` badge and disables `"Buy Now"`)
  - Checkout Form & Product Detail Form: Remove Jersey Number (keep ONLY `"PLAYER NAME"`), remove `"XS"` from Size Guide, add Quantity Selector (`1, 2, 3...` with auto-multiplied total and multi-item instruction), and display fixed Court Pickup address `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"`
- [x] T029 Upgrade `src/pages/admin/tabs/StoreTab.tsx` and `src/services/api.ts`:
  - Add `originalPrice` (Original Price) & `price` (Sale Price) inputs with live discount badge preview (`-XX%`)
  - Add URL `slug` input (auto-generated from Title if blank) and Rich Text / Markdown `description` editor
  - Add `"Temporarily Paused / Out of Stock"` (`isPaused`) toggle switch on both the Product Table/Cards and Product Form Modal
  - Update size presets to start from `S` (`S`, `M`, `L`, `XL`, `2XL`)
- [x] T030 Run `npx tsc --noEmit` (0 errors) and `npm run build` (clean build)
- [x] T031 Comprehensive UI/UX Refinement: Unified image ratio `aspect-[3/4]` across Storefront Cards, Quick View Modal, and Detail View with `object-cover object-center rounded-2xl bg-slate-900/40`; navbar `"Shop"` label alignment; currency wrapping `whitespace-nowrap` on all prices (`350.000 đ`); and `min-h-[48px]` price container lock for zero so le card alignment.
