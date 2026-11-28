# Implementation Plan: Invitational Tournament Check-In (`015-invitational-checkin`)

## 1. Database Layer (`prisma/schema.prisma`)
1. Add 4 fields + relation to `Tournament`:
   - `registrationDeadlineTime String?` (`HH:mm`, default `"23:59"` at runtime)
   - `positionQuotas Json?` (`{ OH, MB, OP, S, L }`)
   - `quotaHardLock Boolean @default(false)`
   - `feePerPlayer Int @default(0)`
   - `checkIns TournamentCheckIn[]`
2. Add back-relation `checkIns TournamentCheckIn[]` to `Player`.
3. Create model `TournamentCheckIn` mapped to `tournament_check_ins`:
   - `id`, `tournamentId` (Cascade), `playerId String?` (SetNull), `fullName`, `birthYear`, `gender`, `position` (`VolleyballPosition`), `skillRank`, `spikeTouch Float?`, `blockTouch Float?`, `jerseyNumber Int?`, `phone`, `status` (`"CONFIRMED"` | `"RESERVE"`), `note String? @db.VarChar(200)`, `isPaid Boolean @default(false)`, `paidAt DateTime?`, `createdAt`, `updatedAt`.
   - Constraints & Indexes:
     - `@@unique([tournamentId, playerId])`
     - `@@unique([tournamentId, phone])`
     - `@@index([tournamentId, status, position])`
     - `@@index([tournamentId, createdAt(sort: Asc)])`
4. Push schema via `npm run prisma:push` (and verify Prisma client regeneration).

## 2. Backend Layer
1. **`server/config/prisma.ts`**:
   - Update `toTournamentDto` to expose `registrationDeadlineTime`, `positionQuotas`, `quotaHardLock`, `feePerPlayer`.
2. **`server/utils/schemas.ts`**:
   - Add `OPTIONAL_POSITION_QUOTAS` rule validating `{ OH, MB, OP, S, L }` integers `0..20` (or `null` to disable).
   - Extend `TOURNAMENT_SCHEMA` with `registrationDeadlineTime: OPTIONAL_TIME`, `positionQuotas: OPTIONAL_POSITION_QUOTAS`, `quotaHardLock: B`, `feePerPlayer: I(0, 50_000_000)`.
   - Add `TOURNAMENT_CHECKIN_PUBLIC_SCHEMA` and `TOURNAMENT_CHECKIN_ADMIN_SCHEMA`.
3. **`server/middlewares/auth.middleware.ts`**:
   - Add 2 entries to `PUBLIC_RULES`:
     - `rule('GET', /^\/tournaments\/[^/]+\/checkin\/?$/)`
     - `rule('POST', /^\/tournaments\/[^/]+\/checkin\/?$/)`
4. **`server/modules/tournaments/tournaments.service.ts`**:
   - Allow `isRegistrationOpen` to be controlled for `PARTICIPATING` tournaments (when check-in is configured) while still forcing `entryFeePerTeam: 0` for `PARTICIPATING` and keeping `registerTeamPublic` strictly restricted to `mode === 'HOSTED'`.
   - Persist `registrationDeadlineTime`, `positionQuotas`, `quotaHardLock`, `feePerPlayer` in `createTournament` and `updateTournament` (handling explicit `null`/empty clearing via `rawBody`).
5. **`server/modules/tournaments/tournaments.checkin.service.ts` (New)**:
   - `isCheckInDeadlinePassed(registrationDeadline, registrationDeadlineTime)` using `+07:00` offset.
   - `normalizeCheckInPhone(raw)` (`+84`/`84` -> `0`, digits only, strict `^0\d{9}$`).
   - `getPublicTournamentCheckIn(slugOrId)`: returns tournament check-in info, position quotas & live `CONFIRMED`/`RESERVE` counts, active Squad picker (public fields only, no phone), and public `attendees[]` (`id`, `fullName`, `position`, `jerseyNumber`, `status`, `isGuest`).
   - `submitPublicTournamentCheckIn(slugOrId, data)`:
     - Validates tournament is active, `PARTICIPATING`, has `positionQuotas`, `isRegistrationOpen === true`, and deadline not passed.
     - Resolves Squad player snapshot server-side if `playerId` provided (including fallback phone from `User.phoneNumber` if athlete didn't pass phone), or validates complete guest fields.
     - Runs inside `prisma.$transaction(..., { isolationLevel: 'Serializable' })` with 1 retry on serialization conflict (`P2034`):
       - Checks duplicates (`playerId` or normalized `phone`) -> HTTP 409.
       - Counts current `CONFIRMED` in `position`; if `quotaHardLock && requestedStatus === 'CONFIRMED' && confirmedCount >= quota`, sets `status = 'RESERVE'` and `downgraded = true`.
       - Creates `TournamentCheckIn` record and invalidates tournament check-in cache.
       - Soft-checks guest `fullName + birthYear` against active Squad players to attach non-blocking `squadMatchHint`.
   - `listAdminTournamentCheckIns(tournamentId)`: returns full check-in records + aggregated matrix & fee totals.
   - `updateAdminTournamentCheckIn(checkInId, data)`: updates `status`, `isPaid` (auto-stamps `paidAt`), `note`, `jerseyNumber`, `position`.
   - `deleteAdminTournamentCheckIn(checkInId)`: deletes check-in record.
6. **`server/modules/tournaments/tournaments.routes.ts`**:
   - Wire 5 routes:
     - `GET /tournaments/:slugOrId/checkin` (public, `maxAgeSec: 5, swrSec: 10`)
     - `POST /tournaments/:slugOrId/checkin` (public, `publicWriteLimiter`)
     - `GET /admin/tournaments/:id/checkins` (`requireSuperAdmin`)
     - `PATCH /admin/tournaments/checkins/:checkInId` (`requireSuperAdmin`)
     - `DELETE /admin/tournaments/checkins/:checkInId` (`requireSuperAdmin`)

## 3. Shared Helpers, Types, API Client & i18n
1. **`src/types/index.ts`**:
   - Add `PositionQuotas`, `CheckInStatus`, `TournamentCheckIn`, `PublicCheckInAttendee`, `PublicCheckInSquadOption`, `TournamentCheckInPublicResponse`, `TournamentCheckInAdminResponse`, `TournamentCheckInSubmitPayload`, `TournamentCheckInSubmitResponse`.
   - Extend `Tournament` with `registrationDeadlineTime?`, `positionQuotas?`, `quotaHardLock?`, `feePerPlayer?`.
2. **`src/shared/tournaments.ts`**:
   - Add `POSITION_ORDER_QUOTA` (`['OH', 'MB', 'OP', 'S', 'L']`), `POSITION_ORDER_BTC` (`['S', 'OH', 'MB', 'OP', 'L']`), `normalizeCheckInPhone`, `isCheckInDeadlinePassed`, `formatCheckInDeadlineDisplay`, `buildPositionMatrix`, `formatBtcRosterText`, `buildCheckInVietQrUrl` (with client-side tone stripping matching MB Bank `0002090671521` / `HOANG QUOC DUY`).
3. **`src/services/api.ts`**:
   - Add 5 methods to `tournamentService`: `getPublicCheckIn`, `submitPublicCheckIn` (using `deduplicatedPost`), `getAdminCheckIns`, `updateAdminCheckIn`, `deleteAdminCheckIn`.
4. **`src/locales/vi/tournaments.json` & `src/locales/en/tournaments.json`**:
   - Add `tabs.checkin` and `checkin.*` keys.

## 4. Frontend Layer
1. **`src/components/tournaments/TournamentCheckInView.tsx` (New)**:
   - Public mobile-first Spatial Glassmorphism view (max 2 `backdrop-blur` layers: Header Card + Form Card; Attendee Roster Card uses solid `#111827`/dark glass without stacking extra blur or keeps total <= 2).
   - Live position quota badges, 15s visibility-aware refresh, exact Vietnam timezone deadline countdown/lockout.
   - 2-tab form (Squad Picker vs Guest Form — zero file inputs).
   - Inline USAV Skill Level bottom-sheet drawer powered by `SKILL_RANK_LIST` from `src/shared/skillRanks.ts` (click-to-select + external link to `/information/skill-levels`).
   - Clear auto-downgrade confirmation notice when `downgraded: true`.
   - Public Attendee List card grouped into `Chắc chắn tham gia` & `Dự bị` with `Ngoài Squad` badge, solid `bg-white/[0.03]` rows (zero per-row `backdrop-blur`).
2. **`src/pages/TournamentsPage.tsx`**:
   - Add `'checkin'` to `SubView` and `VALID_SUBVIEWS`.
   - Show Check-In nav tab when `activeTournament.mode === 'PARTICIPATING' && Boolean(activeTournament.positionQuotas)`.
   - Render `<TournamentCheckInView tournament={activeTournament} />`.
3. **`src/pages/admin/components/tournaments/TournamentFormModal.tsx`**:
   - Add `<input type="time">` for `registrationDeadlineTime` next to `registrationDeadline`.
   - In `PARTICIPATING` section: add Invitational Check-In Config block (Enable Check-In toggle, Open Check-In toggle, Deadline Date + Time, 5 Position Quota inputs `OH/MB/OP/S/L` + default preset button, `quotaHardLock` toggle, `feePerPlayer` VND input).
4. **`src/pages/admin/components/tournaments/CheckInRosterPanel.tsx` (New)**:
   - Admin Position Matrix (5 solid tiles, `ĐỦ QUÂN NHẬN GIẢI` / `THIẾU VỊ TRÍ` banner, reserve counts, paid fee summary).
   - Action bar: `Copy Link Điểm Danh`, `Copy Danh Sách Gửi BTC`, `VietQR Thu Lệ Phí` (opens inline VietQR modal with general or per-player transfer memo).
   - Grouped attendee list (solid rows, no `backdrop-blur`) showing Squad vs `Ngoài Squad`, birth year, gender, USAV rank, spike/block touch, jersey #, phone, note, status toggle (`CONFIRMED` ⇄ `RESERVE`), `isPaid` checkbox, per-player QR button, and delete button.
5. **`src/pages/admin/tabs/TournamentsTab.tsx`**:
   - Add `'CHECKIN'` to `AdminTourSubTab` (visible for `SUPERADMIN` when `selectedTournament.mode === 'PARTICIPATING'`).
   - Allow `Reg Open / Reg Closed` toggle & `Copy Check-In Link` button in header bar for `PARTICIPATING` tournaments with check-in enabled.
   - Auto-reset `subTab` away from `CHECKIN` if user switches to a `HOSTED` tournament.

## 5. Documentation & Verification
- Update `ARCHITECTURE.md` with new model, routes, components, and helpers.
- Run `npx tsc --noEmit` (0 errors) and `npm run build` (clean production build).
