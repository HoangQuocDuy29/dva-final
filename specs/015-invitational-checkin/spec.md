# Feature Specification: Invitational Tournament Check-In & Squad Roster Aggregation

**Feature ID**: `015-invitational-checkin`  
**Status**: Approved & Implementing  
**Date**: 2026-11-28

---

## 1. Overview & Business Goals

Enable DVA SuperAdmins (Captains) to create invitational/away tournament check-in campaigns (`Tournament.mode = PARTICIPATING`), configure per-position slot quotas (`OH`, `MB`, `OP`, `S`, `L`), enforce optional hard-lock quota caps, set a per-player estimated fee and exact check-in deadline date + time (`+07:00`), and share a concise public check-in link (`/tournaments/:slug/checkin`) to Zalo groups.

Athletes can check in via a mobile-first Spatial Glassmorphism 2-tab form:
1. **In Squad (`Đã có trong Squad`)**: Select from active club `Player` records to auto-inherit athletic metrics (`position`, `jerseyNumber`, `bornYear`, `gender`, `skillRank`, `spikeTouch`, `blockTouch`) and optionally override playing position for the tournament.
2. **Guest / External (`Chưa có trong Squad / Khách mời`)**: Enter complete scouting & tournament roster metrics (`fullName`, `birthYear`, `gender`, `position`, `skillRank` with inline USAV Skill Level quick-reference bottom sheet, `spikeTouch`, `blockTouch`, `jerseyNumber`, `phone`).

**Strict Constraints**:
- **Zero image/avatar uploads** in the check-in form or `TournamentCheckIn` model.
- Guest check-ins remain scoped to the specific tournament (badged `Ngoài Squad`) and are **never** auto-inserted into the public `players` table.
- Public check-in endpoint exposes safe attendee info (`id`, `fullName`, `position`, `jerseyNumber`, `status`, `isGuest`) while **strictly stripping `phone` (SĐT/Zalo) and sensitive fields**.
- All admin check-in management endpoints and UI actions are restricted to `SUPERADMIN` (`requireSuperAdmin`), matching existing tournament RBAC.

---

## 2. Confirmed Behavioral Rules (4 Locked Decisions)

1. **Hard-Lock Quota Enforcement (`quotaHardLock = true`)**:
   - When a position has reached its `CONFIRMED` quota ceiling (`confirmedCount >= quota`), submitting a `CONFIRMED` check-in automatically downgrades the record to `RESERVE` inside a serializable transaction and returns `{ checkIn, status: "RESERVE", downgraded: true }`.
   - The UI displays a clear notice: *"Vị trí này đã đủ suất chính thức, hệ thống đã ghi nhận bạn vào danh sách Dự bị"*.
   - When `quotaHardLock = false` (soft mode), the UI suggests switching to `Dự bị`, but still permits `CONFIRMED` submissions if the athlete insists (Admin Matrix shows overflow `+N`).
2. **Strict `SUPERADMIN` RBAC**:
   - All admin check-in endpoints (`GET /admin/tournaments/:id/checkins`, `PATCH /admin/tournaments/checkins/:checkInId`, `DELETE /admin/tournaments/checkins/:checkInId`) require `requireSuperAdmin`.
   - No `ADMIN` or `CAPTAIN` access is granted to check-in management.
3. **Public Check-In Page Shows Live Quotas AND Public Attendee List**:
   - `GET /tournaments/:slugOrId/checkin` returns tournament summary, `positionQuotas`, `quotaHardLock`, `feePerPlayer`, `registrationDeadline`, `registrationDeadlineTime`, `isExpired`, `isRegistrationOpen`, per-position `CONFIRMED`/`RESERVE` counts, public active squad picker (`id`, `fullName`, `jerseyNumber`, `position`, `level`, `bornYear`, `gender`, `skillRank`, `spikeTouch`, `blockTouch`), and `attendees[]` containing ONLY `{ id, fullName, position, jerseyNumber, status, isGuest }`.
   - `phone`, `note`, `isPaid`, `paidAt`, and internal admin metadata are **never** returned by public endpoints.
   - `TournamentCheckInView.tsx` renders an attendee roster card grouped cleanly by `Chắc chắn tham gia` (`CONFIRMED`) and `Dự bị` (`RESERVE`), using solid translucent rows (`bg-white/[0.03]`, no per-row `backdrop-blur`).
4. **Exact Deadline Date & Time (`registrationDeadlineTime`)**:
   - `Tournament.registrationDeadlineTime` (`String?`, `HH:mm`, defaults to `"23:59"` when omitted) pairs with `registrationDeadline` (`YYYY-MM-DD`) in Vietnam timezone (`UTC+07:00`).
   - Both backend (`tournaments.checkin.service.ts`) and frontend (`TournamentCheckInView.tsx`) compute deadline expiration using `${registrationDeadline}T${registrationDeadlineTime || '23:59'}:59+07:00` and lock check-in submissions immediately once passed.

---

## 3. Functional Requirements

### 3.1 Admin Configuration (`TournamentFormModal.tsx`)
- For `mode = PARTICIPATING`:
  - Toggle **Open Check-In** (`isRegistrationOpen`).
  - **Check-In Deadline Date** (`registrationDeadline`) + **Deadline Time** (`<input type="time">`, `registrationDeadlineTime`, default `23:59`).
  - **Position Quotas** inputs for `OH`, `MB`, `OP`, `S`, `L` (non-negative integers; preset quick-fill button e.g. `3-2-2-1-1`; toggle to enable/disable check-in campaign).
  - Toggle **Hard-Lock Official Slots** (`quotaHardLock`).
  - **Estimated Fee / Player (VND)** (`feePerPlayer`).
- For `mode = HOSTED`: existing behavior remains 100% unchanged; `registrationDeadlineTime` also optionally available alongside `registrationDeadline`.

### 3.2 Public Check-In Experience (`/tournaments/:slug/checkin`)
- Reuses existing route `/tournaments/:slug/:subView` with `subView = 'checkin'`.
- Displays tournament info header (Name, Schedule, Location, Deadline date+time, Fee/player, real-time Position Quota pills).
- Refetches check-in counts & attendees every 15s (visibility-aware) and immediately after submission.
- **2-Tab Form**:
  - **Tab 1 — `Đã có trong Squad`**: Searchable list of active DVA `Player`s (solid dark rows, no blur). Selecting a player displays inherited summary card (position, jersey, birthYear, gender, USAV rank, spike/block touch). Athlete may adjust position for this tournament and enters Zalo/Phone (required for deduplication & contact).
  - **Tab 2 — `Khách mời / Ngoài Squad`**:
    - `Họ và tên *`, `Năm sinh *` (1950–2016), `Giới tính *` (`♂ Nam` / `♀ Nữ`), `Vị trí thi đấu *` (`OH`/`MB`/`OP`/`S`/`L` with live `used/quota` or `Đã đủ (x/x)` indicator), `Phân hạng USAV *` (`C`, `B`, `BB`, `A`, `AA`, `OPEN`) + orange pill button `Bảng phân cấp USAV` opening an inline bottom-sheet drawer powered by `SKILL_RANK_LIST` (clicking a tier selects it directly without losing form state + external link to `/information/skill-levels`), `Bật đà (cm)` & `Bật chắn (cm)` (`tabular-nums` side-by-side), `Số áo dự kiến` (0–99), `Số Zalo / SĐT *`.
  - Shared controls: `Chắc chắn tham gia` / `Dự bị` segmented toggle + short `Ghi chú` (max 200 chars).
  - **Zero file/image upload inputs anywhere**.
- **Deduplication**:
  - Normalized phone (`+84`/`84` -> `0`, strip spaces/dots/dashes, validate `^0\d{9}$`).
  - Unique constraints `@@unique([tournamentId, playerId])` and `@@unique([tournamentId, phone])` enforced in PostgreSQL & checked cleanly before insert (HTTP 409 with Vietnamese/English message).
  - Soft hint if guest `fullName + birthYear` matches an active Squad player (does not block).
  - Client uses `deduplicatedPost` + server uses `publicWriteLimiter`.
- **Attendee Roster Block**: Shows checked-in athletes (`CONFIRMED` & `RESERVE`) with position badge, jersey number, and `Ngoài Squad` tag when `isGuest === true`.

### 3.3 Admin Roster Aggregation & Export (`CheckInRosterPanel.tsx` in `TournamentsTab.tsx`)
- New sub-tab `CHECKIN` ("Điểm danh & Đội hình") shown in `TournamentsTab.tsx` when `selectedTournament.mode === 'PARTICIPATING'` (and accessible to `SUPERADMIN`).
- **Position Matrix**: Aggregates `CONFIRMED` + `RESERVE` from both Squad and Guest sources across `OH`, `MB`, `OP`, `S`, `L`, with clear status banner:
  - `ĐỦ QUÂN NHẬN GIẢI` (all required positions met) OR `THIẾU VỊ TRÍ: ...` listing exact missing slots.
  - Fee collection summary (`paidCount / confirmedCount`, collected total VND).
- **Quick Actions**:
  - `Copy Link Điểm Danh` (`/tournaments/:slug/checkin`).
  - `Copy Danh Sách Gửi BTC`: copies formatted `CONFIRMED` roster sorted by `S → OH → MB → OP → L` then jersey number (`STT. Họ tên · Năm sinh · Vị trí · #Số áo`).
  - `Mở VietQR Thu Lệ Phí`: opens clean inline VietQR modal using `MB Bank 0002090671521 / HOANG QUOC DUY` with `feePerPlayer` and tone-stripped transfer memo (`DVA <slug> <ten>`), plus per-row quick QR trigger & manual `Đã đóng phí` checkbox (`isPaid` / `paidAt`).
- **Attendee Table / List**: Grouped by position (or filterable by status/position), displaying `Ngoài Squad` badge, birth year, gender, USAV rank, spike/block touch, jersey number, phone, note, quick toggle `Chính thức ⇄ Dự bị`, `Đã đóng phí` toggle, and delete action.

---

## 4. Non-Functional Requirements (GPU & Constitution Compliance)
- **GPU Budget**: Maximum 2 `backdrop-blur` layers per screen (outer glass cards / modal backdrop only). List rows, matrix tiles, and quota chips use solid translucent surfaces (`bg-white/[0.03]`–`bg-white/[0.05]`, `border-white/10`) with zero `backdrop-blur`.
- **Schema Updates**: Applied via `npm run prisma:push` only (no `prisma migrate dev`, no `--accept-data-loss`).
- **Default-Deny API Security**: Explicitly register only `GET` and `POST` `/tournaments/:slugOrId/checkin` in `PUBLIC_RULES` (`server/middlewares/auth.middleware.ts`).
- **Single Source of Truth**: 100% Prisma/PostgreSQL, aligned composite indexes, `ARCHITECTURE.md` updated in the same task.
