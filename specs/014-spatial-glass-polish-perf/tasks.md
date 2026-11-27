# Task Breakdown: Spatial Glassmorphism Polish, Venues/Courts Unification & Render Performance

**Feature**: `014-spatial-glass-polish-perf`

- [x] **T1 — Header Top-Left Seam Fix, `1440px` Shell & Tryouts Table Alignment**
  - Made `AdminHeader.tsx` sticky wrapper `bg-transparent pointer-events-none` and tuned pill glass surface (`bg-[#10131C]/65 backdrop-blur-2xl`)
  - Widened `AdminHeader.tsx` & `AdminDashboardPage.tsx` `<main>` synchronously to `max-w-[1440px] px-3 sm:px-5 lg:px-6`
  - Rebalanced `ApplicationsTab.tsx` `colgroup` (`20/11/15/13/16/25%`, `min-w-[1180px]`), removed duplicated score from `✓ ĐÃ DUYỆT`, and added `flex-wrap justify-end` on Actions
- [x] **T2 — `Court Map & Venues` Spatial Glassmorphism (`VenuesTab.tsx`)**
  - Replaced all legacy solid dark surfaces across left venue list, right detail workspace, holiday closure bar, club accordion, session cards, captains table, and shared DRY modal
  - Implemented accessible zero-dependency `UsavRankDropdown` custom glass popover dropdown for USAV rank selection
- [x] **T3 — `Court Schedule & Slots` Spatial Glassmorphism (`CourtsTab` + `components/courts/*`)**
  - Upgraded `CourtsTab.tsx`, `CourtCard.tsx`, `SlotLockPanel.tsx`, `CourtFormModal.tsx`, and `WeeklyScheduleEditor.tsx` to `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-input`, `.dva-glass-modal`, and translucent `rounded-full` pills
- [x] **T4 — GPU Blur Optimization, Instant Label Paint & Keep-Alive Tab Cache**
  - Removed `backdrop-blur` from `.dva-glass-card`, `.dva-glass-pill`, and repeated inner buttons/badges/cards (core list/table `backdrop-blur` count reduced `103 → 10`, `-90.3%`)
  - Replaced `transition-all` with `transition-colors duration-150` / `transition-colors transition-transform duration-150` and shortened `.dva-content-reveal` to `180ms`
  - Enabled Instant Label Paint in `PlayersTab`, `ApplicationsTab`, `UsersTab`, and `VenuesTab` (headers, toolbars, static filter labels, and `<thead>` paint on frame 1; skeletons scoped to data body only)
  - Implemented `visitedModules` + CSS `hidden` keep-alive tab caching in `AdminDashboardPage.tsx` and parallel `Promise.allSettled` fetching in `useAdminData.ts`
- [x] **T5 — Verification & Spec Kit Documentation Sync (`/speckit.analyze`)**
  - Verified 0 remaining legacy solid surfaces in `VenuesTab` and `CourtsTab` + `components/courts/*`
  - Passed `npx tsc --noEmit` (0 errors) and `npm run build` cleanly
  - Created `specs/014-spatial-glass-polish-perf/*` and synced `ARCHITECTURE.md`, `specs/011-spatial-glass-bento-dashboard/spec.md`, and `specs/system-overview.md`
- [x] **T6 — Remaining Dashboard Tabs & CRUD Modals Spatial Glass Unification (Zero GPU Overload)**
  - Upgraded `PlayersTab` (94-card high-perf translucent grid, single Portal-rendered USAV Rank Custom Glass Popover Dropdown, `Chưa rõ giới tính` pill next to USAV filter bar, circular `w-8 h-8` actions, `rounded-full` gender pill) & `PlayerFormModal`
  - Upgraded `BookingsTab` (`.dva-glass-panel`, Instant Label Paint, `bg-white/[0.04]` table header, `tabular-nums`, rounded `PAID` pill, circular Edit/Delete controls) & `BookingFormModal`
  - Upgraded `CoachesTab`, `CoachFormModal`, `LeadershipTab` (including inline CRUD modal), `TrainingTab`, `CourseFormModal`, `NewsTab`, and `NewsFormModal` (with Custom Glass Popover Dropdown replacing native `<select>` for Category)
  - Polished secondary panels/modals (`SheetsTab`, `GuestSessionsPanel`, `CreateUserModal`, `ResetPasswordModal`, `ChangePasswordModal`, `StaffProfileModal`)
  - Verified 0 legacy solid dark classes in all 11 primary upgraded files, strict Single-Layer GPU Blur discipline (0 `backdrop-blur` on repeated cards/buttons), `npx tsc --noEmit` (0 errors), and `npm run build` green
