# Feature Specification: Hanoi Volleyball Court Map, Daily Session Operations & Captain Portal

**Feature ID**: `009-court-map-venues`  
**Created**: 2026-11-23  
**Status**: Implemented & Verified  

## 1. Overview
Provides an interactive **Hanoi Volleyball Court Map** (`/services/court-map`) and **Club Profile pages** (`/services/court-map/teams/:slug`) alongside a **Master–Detail Admin Workspace** (`SUPERADMIN`) and a scoped **2-tab Captain Self-Service Portal** (`CAPTAIN`).

## 2. Data Model (`prisma/schema.prisma` — Additive-Only)
- **`UserRole` enum:** Added `CAPTAIN` (with dedicated Cyan–Emerald–Gold ring in `RoleAvatarRing`).
- **`VolleyballVenue` (`volleyball_venues`):** Venue coordinates, city/district, surface type, `subCourtsCount`, `venueType` (`COMMERCIAL` | `FREE_PUBLIC`), `isDvaOfficial`, `isFeatured`, and holiday closure (`isClosed`, `closureReason`, `closedUntil`).
- **`CourtClubProfile` (`court_club_profiles`):** Club metadata, images (`logoUrl`, `coverUrl`, `galleryUrls` max 5 on public/captain), captain contact info (`captainName`, `captainPhone`, `captainZalo`, internal-only `captainEmail`), optional 1:1 login link (`captainUserId String? @unique` $\leftrightarrow$ `User.captainedClub`), and 30-day media quota timestamps (`coverUpdatedAt`, `galleryUpdatedAt`).
- **`VenueSessionSlot` (`venue_session_slots`):** Weekly days (`daysOfWeek Int[]`), `startTime`, `endTime`, `subCourts`, `recruitmentStatus`, `genderRule` (`MALE_ONLY` | `MIXED` | `FEMALE_ONLY`), `capacityMode` (`UNLIMITED` | `LIMITED_SLOTS`), `maxPlayers`, per-date cancellations (`cancelledDates String[]`, `cancelReason`, legacy `isCancelled`), and per-date player/position overrides (`dailyOverrides Json` keyed by `YYYY-MM-DD` in `Asia/Ho_Chi_Minh`: `{ currentPlayers, neededPositions: ("OH"|"MB"|"OP"|"S"|"L")[] }`).

## 3. Backend API, RBAC & Quota Guards
- **Public API (`server/modules/venues/venues.routes.ts`):**
  - `GET /api/venues` & `GET /api/venues/teams/:slug` — 5-minute TTL cache (`appCache`), strips internal fields (`captainEmail`, `captainUserId`, `captainUser`, `coverUpdatedAt`, `galleryUpdatedAt`).
- **Admin & Captain API (`requireCaptainOrSuperAdmin` + `CAPTAIN_ALLOWED_RULES`):**
  - `SUPERADMIN`: Full CRUD on venues, clubs, sessions (with sub-court overlap conflict guard `409 SUB_COURT_CONFLICT`), assigning/creating `CAPTAIN` accounts, and unrestricted edits.
  - `CAPTAIN`: Scoped strictly to `GET /api/admin/venues` (own club/venue only), `PATCH/PUT /api/admin/venues/:venueId/clubs/:clubId` (own club only), `PATCH/PUT /api/admin/venues/:venueId/sessions/:sessionId` (own club's sessions only), and `POST /api/cloudinary/sign-upload`. Cross-team, cross-venue, or delete attempts return **HTTP `403`**.
  - **Identity Field Lock (Captain):** Server rejects attempts by `CAPTAIN` to modify `captainPhone`, `captainZalo`, or `captainEmail` with **HTTP `403`** (directing them to contact Quốc Duy — `0768299329`).
  - **30-Day Media Quotas (Captain):** Enforced server-side and client-side (`QUOTA_30D_MS = 30 days`): Cover max 1 image / 1 change per 30 days (`429`), Gallery max 5 images (`400`) / 1 update cycle per 30 days (`429`). `SUPERADMIN` is fully exempt without resetting Captain timestamps.
  - **Cache Invalidation:** All mutations immediately invoke `invalidateCache('venues')`.

## 4. Public UI Behavior (`/services/court-map` & `/services/court-map/teams/:slug`)
- **Date-Aware Status (`src/utils/venueSchedule.ts`):**
  - `LIVE` (`● ĐANG ĐÁNH`) and `UPCOMING` (`⏳ Còn X phút nữa`) ONLY evaluate when viewing **today** (`selectedDay === null || selectedDay === nowVn.dayOfWeek`); filtering another weekday (e.g., viewing `T4` on Monday) returns `SCHEDULED` (`📅 Lịch Thứ 4 (HH:mm - HH:mm)`) with full brightness (`opacity-100`).
  - Per-date cancellations (`cancelledDates`) dim only the cancelled date (`opacity-50`, `⚠️ Hôm nay đội tạm nghỉ`) without affecting other weekdays in the same slot or next week (auto-resets weekly).
  - Per-date capacity (`dailyOverrides[targetDateStr]`) displays exact `currentPlayers / maxPlayers` and `Thiếu vị trí: OH • MB • OP • S • L` for updated dates, and defaults cleanly to `0 / maxPlayers` (empty positions) on unedited dates or subsequent weeks.
- **Filters & Badges:** City selector + "Toàn Việt Nam", Geolocation "Gần tôi" (Haversine sort), Time/Day tabs, Play Style, Gender (`Tất cả` | `♂️ Chỉ Nam` | `⚥ Nam & Nữ` | `♀️ Chỉ Nữ`), Venue Type, and 5-image cap on Club Detail gallery.

## 5. Admin & Captain Workspace (`src/pages/admin/tabs/VenuesTab.tsx`)
- **`SUPERADMIN` (`Court Map & Venues`):**
  - **Sub-tab 1 (`Quản lý Sân & Lịch Ca`):** 2-column Master–Detail (32% searchable/city-filtered venue list / 68% selected venue workspace with inline holiday closure toggle & collapsible Club Accordions) + 1-tap date selector (`T2 23/11`, `T4 25/11`...), `-`/`+` player stepper, `OH/MB/OP/S/L` chips, gender pills, and per-date off toggle. Smart `genderRule` suggestion (`COMPETITIVE` $\rightarrow$ `MALE_ONLY`, others $\rightarrow$ `MIXED`).
  - **Sub-tab 2 (`Danh bạ Đội trưởng`):** Searchable directory with Gmail copy & optional `CAPTAIN` account link / quick creation.
- **`CAPTAIN` (2 Sidebar Tabs under `ĐỘI CỦA TÔI` + Status/Support Sidebar Card):**
  - **`📅 Lịch Chơi & Slot Ca`:** 2-column (`xl:grid-cols-12`) workspace — left 8 cols for 1-tap daily session controls; right 4 cols for client-side **Recruitment Post Generator** (Zalo/Facebook copy) and **Live Public Card Preview**.
  - **`🛡️ Hồ Sơ & Ảnh Đội`:** Full-width 2-column (`xl:grid-cols-12`: 7/5) profile editor reusing the shared club form with locked contact fields (Quốc Duy `0768299329` notice), live Cover+Logo preview, 5-slot Gallery grid, and 30-day quota indicators.
  - **Sidebar Card:** Live venue open/closed status, monthly photo quota (`Ảnh bìa: 0/1|1/1` • `Gallery: X/5`), and direct Zalo support link (`0768299329`).
