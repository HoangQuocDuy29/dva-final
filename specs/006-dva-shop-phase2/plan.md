# Implementation Plan: DVA Shop Module (Phase 2.1) — Quick View, `/shop/[category]/[product-slug]` Detail Page, High-Res Image Zoom, Discount Pricing & Temporarily Paused State

**Branch**: `006-dva-shop-phase2` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-dva-shop-phase2/spec.md`

---

## 1. Summary of Phase 2.1 Architecture & Refinements

1. **Additive Database Schema (`prisma/schema.prisma`)**:
   - Added `slug String?`, `originalPrice Int?`, `isPaused Boolean @default(false)` to `Product`, updated default `sizes` to `["S", "M", "L", "XL", "2XL"]` (no `XS`), and added `quantity Int @default(1)` to `Order` (alongside `OrderItem.quantity`).
   - Synchronized safely to Neon PostgreSQL via `npx prisma db push` and `npx prisma generate` (zero destructive changes, zero `prisma migrate dev`).
2. **Navigation & Labels (`Navbar.tsx`, `common.json`)**:
   - Main Navbar link label updated to **"Shop"** (concise athletic label).
3. **Fulfillment & Pickup Address (`ShopPage.tsx`, `ShopProductDetailPage.tsx`, `server.ts`, `lib/mailer.ts`)**:
   - Default Court Pickup displays fixed address: `"155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"`.
   - Selecting `"Home Delivery"` reveals the required Delivery Address input + COD shipping fee notice.
4. **Refined Jersey Form, Size Guide (No XS) & Quantity Selector (`1, 2, 3...`)**:
   - Removed Jersey Number (`customNumber`) input from customer checkout UI; kept **ONLY `"PLAYER NAME"`** (`customName`).
   - Removed `"XS"` from the Size Guide table and product size options (`S`, `M`, `L`, `XL`, `2XL`).
   - Added interactive Quantity Selector (`-` / `+` / numeric `1..50`) in both the Buy-Now Modal and Product Detail Page, multiplying `totalAmount = price * quantity` on both client and server, with a clear note for multi-item orders.
5. **Dual-Path Product Experience: Quick View Modal, Hierarchical Route (`/shop/:categorySlug/:productSlug`) & Image Zoom Lightbox**:
   - **Quick View Button** on each product card opens a Quick View modal with front/back gallery, zoom trigger, description, discount pricing, and instant "Buy Now" CTA without leaving `/shop`.
   - **Clicking Product Image or Title** navigates to `/shop/:categorySlug/:productSlug` (e.g., `/shop/mens-sleeveless/dva-pro-jersey-2026`), handled by `src/pages/ShopProductDetailPage.tsx` (or integrated detail view in `ShopPage.tsx` / router).
   - **Interactive High-Res Image Zoom / Lightbox**: Supports switching between `frontImage` and `backImage` and zooming (`1x`, `1.5x`, `2x`, `3x` + pan/drag) in a dedicated high-resolution lightbox modal.
6. **Admin Product Discount (`originalPrice` vs `price`), Rich Description & Temporarily Paused Toggle (`StoreTab.tsx`)**:
   - Admin can edit `name`, `slug`, rich `description` (with formatting preview/support), `originalPrice` (list price), `price` (selling price), `isPaused` ("Temporarily Paused / Out of Stock - Coming Back Soon"), and `isActive`.
   - Storefront automatically displays strikethrough `originalPrice` + `-[X]%` discount badge when `originalPrice > price`, and disables "Buy Now" with a `"Temporarily Out of Stock / Coming Back Soon"` badge when `isPaused` is enabled.
7. **Standardized Two-Stage Email Architecture & Dedicated Dispatch Modal (`lib/mailer.ts`, `server.ts`, `StoreTab.tsx`)**:
   - **Stage 1 (Order Confirmation)**: Emitted strictly once when customer clicks `"Confirm Order / I Have Transferred"`. Sends 1 receipt to customer with verification instructions and 1 admin alert to `quocduyhoang42@gmail.com`. Redundant triggers removed from order creation, webhook, and Admin PAID status change.
   - **Stage 2 (Dedicated Dispatch Modal)**: Admin can click `"Send Dispatch Email"` (or `"Resend Dispatch Email"`) on any order row. Modal pre-fills order data; accepts Carrier + Tracking Code for Home Delivery (with COD notice) or displays Court address (155 Trường Chinh) for Court Pickup. Emits email via Resend, transitions status to `SHIPPED`, syncs to Google Sheets tab `DonHang_Shop`, and shows success toast.

---

## 2. Category URL Slug Mapping (`/shop/[category]/[product-slug]`)

| Category ID | Category URL Slug (`[category]`) | Example Hierarchical URL |
| :--- | :--- | :--- |
| `SLEEVELESS` | `mens-sleeveless` | `/shop/mens-sleeveless/dva-pro-sleeveless-jersey-2026` |
| `SHORT_SLEEVE` | `short-sleeve` | `/shop/short-sleeve/dva-official-match-jersey-2026` |
| `WOMEN` | `womens-jersey` | `/shop/womens-jersey/dva-womens-elite-jersey-2026` |
| `KNEE_PADS` | `knee-pads` | `/shop/knee-pads/dva-pro-impact-knee-pads` |
| `SOCKS` | `athletic-socks` | `/shop/athletic-socks/dva-compression-crew-socks` |
| `JERSEYS` | `jerseys` | `/shop/jerseys/...` |
| `ACCESSORIES` | `accessories` | `/shop/accessories/...` |

---

## 3. File Modification Map for Phase 2.1

```text
prisma/
└── schema.prisma                   # DONE: Added Product.slug, Product.originalPrice, Product.isPaused, Order.quantity (pushed via npx prisma db push)

lib/
├── prisma.ts                       # MODIFY: Map slug, originalPrice, isPaused, quantity in toProductDto & toOrderDto; update starter seed slugs & sizes (no XS)
├── schemas.ts                      # MODIFY: Allow slug, originalPrice, isPaused in PRODUCT_SCHEMA; quantity in ORDER_CREATE_SCHEMA
└── mailer.ts                       # MODIFY: Update pickup address label to "155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)" and omit empty jersey number

server.ts                           # MODIFY: Support slug, originalPrice, isPaused, PATCH /api/store/products/:id/paused, and server-side quantity * price calculation + paused product guard on POST /api/store/orders

src/
├── types/index.ts                  # MODIFY: Add slug, originalPrice, isPaused to StoreProduct; quantity to StoreOrder; category slug helpers (getCategoryUrlSlug, getProductUrlPath, slugifyProductName)
├── services/api.ts                 # MODIFY: Add storeService.toggleProductPaused(id, isPaused) and getProductBySlug helper
├── App.tsx                         # MODIFY: Register route /shop/:categorySlug/:productSlug alongside /shop
├── components/layout/Navbar.tsx    # MODIFY: Change nav label to "Shop"
├── locales/
│   ├── en/common.json              # MODIFY: Update nav.shop label to "Shop"
│   └── vi/common.json              # MODIFY: Update nav.shop label to "Shop"
└── pages/
    ├── ShopPage.tsx                # MODIFY:
    │                               #  - Card click (image/title) -> navigate to /shop/:categorySlug/:productSlug
    │                               #  - Card "Quick View" button -> Quick View Modal with front/back gallery & Zoom Lightbox
    │                               #  - Discount strikethrough (originalPrice > price) + "-XX%" badge
    │                               #  - Temporarily Paused ("Temporarily Out of Stock / Coming Back Soon") badge & disabled Buy Now
    │                               #  - Product Detail View (/shop/:categorySlug/:productSlug) with interactive Zoom In/Out Lightbox
    │                               #  - Checkout Form: ONLY "PLAYER NAME" (no Jersey Number), Size Guide from S+ (no XS), Quantity Selector (1, 2, 3...), fixed Pickup Address "155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)"
    └── admin/tabs/StoreTab.tsx     # MODIFY:
                                    #  - Add originalPrice, price (with live discount % preview), slug, rich/markdown description editor
                                    #  - Add "Temporarily Paused / Out of Stock" (isPaused) toggle switch on product cards & form modal
                                    #  - Remove XS from default size presets (S, M, L, XL, 2XL)
```
