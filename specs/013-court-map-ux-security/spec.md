# Feature Specification: Court Map Dropdown Filters, Mobile-First Full-Screen Map & Authenticated Captain Contact Reveal

**Feature ID**: `013-court-map-ux-security`  
**Created**: 2026-11-26  
**Status**: Implemented & Verified  
**Builds On**: `009-court-map-venues`, `012-public-spatial-glassmorphism`

## 1. Objectives
1. **Clustered Glass Dropdown Filters & Mobile Bottom Sheet (`/services/court-map`)**:
   - Consolidate multi-row desktop filter pills into compact frosted-glass dropdown clusters (`Ngày`, `Gu chơi`, `Đối tượng`, `Loại sân`) plus a quick-toggle `Còn slot` (`availableSlots > 0`) chip, search input, city selector (`Hà Nội`, `Đà Nẵng`, `TP.HCM`, `Toàn Việt Nam`), `📍 Gần tôi`, and contextual `Reset` button.
   - Auto-highlight today's weekday in `Asia/Ho_Chi_Minh` timezone with a `Hôm nay` badge inside the `Ngày` filter.
   - Collapse mobile (`< md`) controls into Search + `Bộ lọc (N)` + `📍 Gần tôi`, opening a touch-friendly frosted-glass Bottom Sheet (`z-[960]`, safe-area padded, `Áp dụng` / `Đặt lại`).
2. **Mobile & Desktop Full-Screen Map Mode**:
   - Provide a top-right `Maximize2` button on the map frame.
   - Transition map container seamlessly into `fixed inset-0 z-[900] h-[100dvh] w-screen bg-[#0B0D12]` without unmounting Leaflet, locking body scroll (`document.body.style.overflow = 'hidden'`).
   - Float a safe-area-aware top bar (`z-[920]`) with inline filters (Desktop dropdowns / Mobile `Bộ lọc` + `Gần tôi`) and a prominent touch-friendly `Minimize2` + `Thu nhỏ` exit button (`min-h-[42px]`).
   - Support desktop `Esc` and mobile swipe-back / browser Back via `history.pushState({ mapFullscreen: true }, '')` + `popstate`.
   - Keep venue/session detail Drawer/Bottom Sheet at `z-[950]` above full-screen map (`z-[900]`) and trigger Leaflet `invalidateSize({ animate: true })` via `ResizeObserver` + `220ms` timer to prevent grey tiles or off-center markers.
3. **Default Phone/Zalo Masking & Verified Contact Reveal (Backend + Frontend)**:
   - Mask captain phone (`0768 *** ***`) and strip real `captainZalo` across all public endpoints (`GET /api/venues`, `GET /api/sessions`, `GET /api/venues/teams/:slug`, `GET /api/teams/:slug`), returning `hasContact: true`.
   - Expose `POST /api/sessions/:id/reveal-contact` supporting JWT authentication (instant reveal, **15 reveals/day/userId**) or Cloudflare Turnstile verification (guests, **5 reveals/day/IP**, with dev 1-tap modal fallback when `TURNSTILE_SECRET_KEY` is unset). Exceeding limits returns HTTP `429` with clear Vietnamese messaging.
   - Persist reveal events in `ContactRevealLog` (`id`, `sessionId`, `viewerUserId`, `ipHash`, `createdAt`) and surface total contact reveal counts to Captains/Superadmins in `VenuesTab`.
   - Frontend defaults to masked phone + glass `Eye` icon (`w-9 h-9`), caches revealed contacts per session in `sessionStorage`, shows Turnstile/Login modal (`z-[980]`) for guests, and upgrades revealed state to `EyeOff` + full phone + `Nhắn Zalo`, `Gọi điện`, and `Copy` actions.

## 2. Zero-Bloat Constraints
- Zero new npm packages or external UI/animation libraries.
- Reuse `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-pill` from `src/index.css` and existing `lucide-react` icons (`Maximize2`, `Minimize2`, `Eye`, `EyeOff`, `SlidersHorizontal`, `RotateCcw`, `Copy`, `Phone`, `MessageCircle`, `ChevronDown`).
- Strictly additive Prisma schema change (`ContactRevealLog` + relation on `VenueSessionSlot`).
