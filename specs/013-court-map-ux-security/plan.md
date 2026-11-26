# Implementation Plan: Court Map UX & Contact Reveal Security

**Spec Reference**: `specs/013-court-map-ux-security/spec.md`

## Architecture & File Changes

### Phase 1: Schema & Backend Security
1. **`prisma/schema.prisma`**:
   - Add `ContactRevealLog` model (`contact_reveal_logs`) with indexes on `(sessionId, createdAt)`, `(viewerUserId, createdAt)`, and `(ipHash, createdAt)`, plus `contactRevealLogs ContactRevealLog[]` relation on `VenueSessionSlot`.
2. **`server/config/env.ts` & `.env.example`**:
   - Add `turnstileSecretKey` getter (`TURNSTILE_SECRET_KEY`) and document `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` in `.env.example`.
3. **`server/middlewares/auth.middleware.ts`**:
   - Allowlist `GET /sessions`, `GET /teams/:slug`, and `POST /sessions/:id/reveal-contact` in `PUBLIC_RULES` (while `attachAuth` still populates `req.user` when a valid Bearer JWT is present).
4. **`server/modules/venues/venues.service.ts` & `venues.routes.ts`**:
   - Add `maskPhone()` and `sanitizePublicClub()` that masks `captainPhone` (`0768 *** ***`), nulls `captainZalo`, strips internal fields, and attaches `hasContact: boolean`.
   - Apply `sanitizePublicClub()` to `listPublicVenues()`, new `listPublicSessions()`, and `getPublicClubBySlug()`.
   - Add `revealSessionContact({ sessionId, user, ip, turnstileToken, humanVerified })`:
     - Verify JWT or Cloudflare Turnstile (`https://challenges.cloudflare.com/turnstile/v0/siteverify`) with dev 1-tap modal fallback when `TURNSTILE_SECRET_KEY` is empty.
     - Hash IP with SHA-256 + server salt; enforce Vietnam-day rate limits (`15/day/userId` for logged-in users, `5/day/IP` for guests) returning HTTP `429`.
     - Insert `ContactRevealLog` and return real `captainPhone`, `captainZalo`, `captainName`, `remainingToday`, `dailyLimit`.
   - Enrich `listAdminVenues()` session objects with `contactRevealCount` for Captain/Superadmin analytics.

### Phase 2: Shared Types, API Client & Utilities
5. **`src/types/index.ts`**:
   - Add `hasContact?: boolean` on `CourtClubProfile`, `contactRevealCount?: number` on `VenueSessionSlot`, and `RevealedSessionContact` interface.
6. **`src/services/api.ts`**:
   - Add `venueService.revealSessionContact(sessionId, payload)` calling `POST /api/sessions/:id/reveal-contact` and helper `getRevealCache` / `setRevealCache` backed by `sessionStorage`.
7. **`src/utils/venueSchedule.ts`**:
   - Add `hasAvailableSlots(session, targetDateStr, venueClosed)` helper for the `Còn slot` toggle.
   - Update `buildZaloContact()` to accept optional revealed `{ captainPhone, captainZalo }`.

### Phase 3: Frontend Components & Pages
8. **`src/App.tsx`**:
   - Remove `z-10` stacking context trap on `<main>` so fixed full-screen map (`z-[900]`), Drawer (`z-[950]`), Mobile Filter Sheet (`z-[960]`), and Turnstile Modal (`z-[980]`) cleanly layer above Navbar (`z-50`).
9. **`src/components/court-map/HanoiLeafletMap.tsx`**:
   - Accept `isFullscreen?: boolean` prop and trigger `setTimeout(() => map.invalidateSize({ animate: true }), 220)` on state toggle alongside existing `ResizeObserver`.
10. **`src/components/court-map/ContactRevealModal.tsx` & `SessionContactActions.tsx`**:
    - Compact frosted-glass verification modal (`z-[980]`) supporting Cloudflare Turnstile (when `VITE_TURNSTILE_SITE_KEY` is configured), dev 1-tap fallback, and quick link to `/login`.
    - Reusable masked phone + `Eye`/`EyeOff` toggle + post-reveal `Nhắn Zalo` / `Gọi điện` / `Copy` row used in both `CourtMapPage.tsx` and `CourtClubDetailPage.tsx`.
11. **`src/pages/CourtMapPage.tsx`**:
    - Clustered glass Dropdowns on Desktop (`Ngày` with `Hôm nay` badge, `Gu chơi`, `Đối tượng`, `Loại sân`) + `Còn slot` chip + contextual `Reset`.
    - Mobile (`< md`) compact bar + frosted-glass Bottom Sheet (`z-[960]`).
    - Full-screen map mode (`100dvh`, `z-[900]`, floating top bar `z-[920]` with `Thu nhỏ`, `Esc` + `history.pushState`/`popstate` mobile back handling, body scroll lock, desktop & mobile venue drawer at `z-[950]`).
12. **`src/pages/CourtClubDetailPage.tsx` & `src/pages/admin/tabs/VenuesTab.tsx`**:
    - Integrate `SessionContactActions` + `ContactRevealModal` on Club Detail page so masked public API works seamlessly.
    - Display `contactRevealCount` badge on Captain/Superadmin session cards in `VenuesTab.tsx`.

### Phase 4: Verification (`/speckit.analyze`)
- Run `npx prisma generate`, `npx prisma db push` (if DB reachable), `npx tsc --noEmit`, `npm run build`.
- Verify live API responses (`/api/venues`, `/api/sessions`, `/api/venues/teams/:slug`, `/api/sessions/:id/reveal-contact` + 429 rate limit) and UI flows on Desktop (`1440×900`) and Mobile (`375×812` & `390×844`).
