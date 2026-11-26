# Task Checklist: `013-court-map-ux-security`

## Phase 1 — Database & Backend Security
- [x] T001: Add `ContactRevealLog` model and `VenueSessionSlot.contactRevealLogs` relation in `prisma/schema.prisma`.
- [x] T002: Add `turnstileSecretKey` to `server/config/env.ts` and document Turnstile env vars in `.env.example`.
- [x] T003: Update `PUBLIC_RULES` in `server/middlewares/auth.middleware.ts` for `/sessions`, `/teams/:slug`, and `POST /sessions/:id/reveal-contact`.
- [x] T004: Implement `maskCaptainPhone`, `sanitizePublicClub`, `listPublicSessions`, `revealSessionContact` (JWT/Turnstile + daily rate limit 15/user, 5/IP + `ContactRevealLog`), and `contactRevealCount` in `server/modules/venues/venues.service.ts` & `venues.routes.ts`.

## Phase 2 — Shared Types, API Client & Schedule Helpers
- [x] T005: Update `src/types/index.ts` with `hasContact`, `contactRevealCount`, and `RevealedSessionContact`.
- [x] T006: Add `venueService.revealSessionContact` and bump SWR cache prefixes (`dva_venues_public_v3`, `dva_venue_club_detail_v2`) in `src/services/api.ts`.
- [x] T007: Add `getSessionAvailableSlots` / `hasAvailableSlots` helpers in `src/utils/venueSchedule.ts`.

## Phase 3 — Frontend UI & UX
- [x] T008: Adjust `<main>` stacking context in `src/App.tsx` so full-screen overlays (`z-[900]`–`z-[980]`) layer above Navbar (`z-50`).
- [x] T009: Enhance `HanoiLeafletMap.tsx` with `isFullscreen` prop and `220ms` `invalidateSize({ animate: true })`.
- [x] T010: Build `ContactRevealModal.tsx` (`z-[980]`, Turnstile + dev fallback + login CTA) and `SessionContactRow.tsx` (`Eye`/`EyeOff`, `sessionStorage` cache, `Nhắn Zalo`, `Gọi điện`, `Copy`).
- [x] T011: Upgrade `CourtMapPage.tsx` with clustered desktop glass Dropdowns (`Ngày` with `Hôm nay` badge, `Gu chơi`, `Đối tượng`, `Loại sân`, `Còn slot`, `Reset`), Mobile Bottom Sheet (`z-[960]`), and Full-Screen Map mode (`100dvh`, `z-[900]`, floating top bar `z-[920]` with `Thu nhỏ`, `Esc` + `history.pushState`/`popstate`, Drawer `z-[950]`).
- [x] T012: Update `CourtClubDetailPage.tsx` for masked contact reveal and `VenuesTab.tsx` to display `contactRevealCount` for Captains/Superadmins.

## Phase 4 — Verification & Build
- [x] T013: Run `npx prisma generate`, `npx tsc --noEmit`, and `npm run build` with 0 errors.
- [x] T014: Run automated logic & RBAC assertions (`maskCaptainPhone`, `hasAvailableSlots`, `apiAccessPolicy`).
