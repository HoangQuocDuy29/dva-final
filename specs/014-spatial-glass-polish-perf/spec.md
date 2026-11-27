# Feature Specification: Spatial Glassmorphism Polish, Venues/Courts Unification & Render Performance

**Feature ID**: `014-spatial-glass-polish-perf`  
**Created**: 2026-11-28  
**Extends**: `011-spatial-glass-bento-dashboard`, `012-public-spatial-glassmorphism`  
**Status**: Implemented & Verified  

## 1. Objective & Scope
Eliminate visual defects and GPU/rendering bottlenecks across the Spatial Dark Glassmorphism UI (Admin Dashboard and Public views) while completing 100% Spatial Glassmorphism unification for `Court Map & Venues` (`VenuesTab`) and `Court Schedule & Slots` (`CourtsTab` + `CourtFormModal`), with **Zero Bloat** (no external libraries, no new runtime dependencies).

## 2. Functional & Visual Requirements

### 2.1. Dashboard Shell Polish & Tryouts Table Alignment
- **Seamless Top-Left Ambient Blend (`AdminHeader.tsx`, `AdminDashboardPage.tsx`)**:
  - Remove the opaque black gradient (`from-[#0B0D12] via-[#0B0D12]/90`) from the sticky wrapper in `AdminHeader.tsx`, using `bg-transparent pointer-events-none` with `pointer-events-auto` on `<header>` and the profile dropdown so the left ambient glow flows uninterrupted beside `AdminSidebar` at rest and while scrolling.
  - Tune the floating `<header>` surface to `bg-[#10131C]/65 backdrop-blur-2xl border-white/12 shadow-[0_12px_36px_rgba(0,0,0,0.28)]`.
  - Synchronize workspace max width to `max-w-[1440px]` with `px-3 sm:px-5 lg:px-6` across both `AdminHeader` and `<main>` in `AdminDashboardPage`.
- **Non-Overlapping Tryout Applications Table (`ApplicationsTab.tsx`)**:
  - Rebalance `table-fixed` proportions (`min-w-[1180px]` for `SUPERADMIN`, `colgroup`: `20% / 11% / 15% / 13% / 16% / 25%`; `min-w-[960px]` and `26% / 15% / 14% / 19% / 26%` for `ADMIN`/`COACH`) and remove hardcoded `max-w-[195px]`/`max-w-[180px]` truncation clamps.
  - Keep **Evaluation & Scorecard** as the single source of truth for status (`APPROVED`), score (`11/20`), coach notes, and result-email badge; remove duplicated score text from the `✓ ĐÃ DUYỆT` pill and add `flex-wrap justify-end` to Actions so buttons never bleed leftward across Desktop or Mobile (`375px`).

### 2.2. Full Spatial Glassmorphism for `Court Map & Venues` (`VenuesTab.tsx`)
- Replace all remaining flat dark solid surfaces (`#0F172A`, `#111827`, `#0B0F19`, `bg-slate-800/900`, `border-slate-700/800`) across the left venue list, right venue detail header, holiday closure tray, club accordion cards, session control cards, Captains directory table, and shared DRY modal (`venue` / `club` / `session` / `captain`) using `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-input`, and `.dva-glass-modal`.
- Replace the native `<select>` for recommended USAV rank inside session cards with an accessible custom glass popover dropdown (`UsavRankDropdown`, menu `bg-[#0E1118]/95 backdrop-blur-2xl border-white/15`, outside-click & `Escape` dismissal).
- Standardize action controls (`+ Sân`, `+ Thêm Đội/CLB`, `+ Ca`, `Sửa Sân`, `Trash`, gender pills, date pills, slot counter pill, `Nghỉ buổi` pill, `rounded-xl` missing-position chips) to cohesive translucent glass styling.

### 2.3. Full Spatial Glassmorphism for `Court Schedule & Slots` (`CourtsTab.tsx` & `components/courts/*`)
- Upgrade `CourtsTab`, `CourtCard`, `SlotLockPanel`, `CourtFormModal`, and `WeeklyScheduleEditor` to `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-input` (with `[color-scheme:dark]` and `tabular-nums`), and `.dva-glass-modal`.
- Standardize court card buttons (`Tạm dừng sân (Bảo trì)`, `Kích hoạt lại`, `Sửa Sân & Lịch Tuần`, circular `Trash`), court/sub-court selector pills, `OPEN`/`CLOSED`/`BOOKED` badges, `Khóa ca`/`Mở lại ca` pills, and weekly schedule editor actions (`Tải ảnh từ máy`, `Sao chép sang T2 - T6`, `Sao chép lịch sang Sân B`, `Áp dụng tất cả`, preset slots) to translucent `rounded-full` glass pills.

### 2.4. GPU Blur Performance, Instant Label Paint & `0ms` Tab Switching
- **Single-Layer `backdrop-blur` Rule (`src/index.css` & Repeated Lists/Tables)**:
  - Restrict `backdrop-blur-xl` / `backdrop-blur-2xl` strictly to top-level containers (`.dva-glass-panel`, `.dva-glass-modal`, Floating Header/Sidebar, and floating popover dropdowns).
  - Remove `backdrop-blur` from `.dva-glass-card`, `.dva-glass-pill`, and repeated buttons/badges/cards inside lists/tables (`VenuesTab`, `UsersTab`, `ApplicationsTab`, `PlayersTab`, `CourtCard`, `SlotLockPanel`, `WeeklyScheduleEditor`, `PlayersPage`, `CourtMapPage`) — replacing with lightweight translucent fills (`bg-white/[0.06] hover:bg-white/[0.12] border-white/12`) to cut GPU compositing layers by ~90%.
  - Replace broad `transition-all` on interactive pills/cards/inputs with targeted `transition-colors duration-150` / `transition-colors transition-transform duration-150`, and tighten `.dva-content-reveal` to `180ms` (`translateY(4px)`).
- **Instant Label Paint**:
  - Render static headers, action buttons, toolbars, filter labels (e.g. `Chưa rõ giới tính`, `Missing Avatar`, `Pending`, `Approved`, `Tất cả`, `Hà Nội`), and table `<thead>` immediately on first paint in `PlayersTab`, `ApplicationsTab`, `UsersTab`, and `VenuesTab`; display dynamic count badges only once data loads, and scope skeletons strictly to data rows/card grids.
- **Keep-Alive Dashboard Tabs & Parallel API Fetching (`AdminDashboardPage.tsx`, `useAdminData.ts`)**:
  - Keep visited tabs mounted via `visitedModules` state + CSS `hidden` in `AdminDashboardPage.tsx` so switching back to any previously opened tab renders in `0ms` without losing filter/pagination state, while SWR revalidation refreshes silently via `.dva-top-loader`.
  - Execute independent initialization, refresh, and multi-endpoint scope requests concurrently via `Promise.allSettled` in `useAdminData.ts`.

## 3. Verification Criteria
- Zero legacy opaque dark surfaces in `VenuesTab` and `CourtsTab` + `components/courts/*`.
- Nested `backdrop-blur` count reduced by >85% across core list/table views (103 → 10).
- Responsive layout verified for Desktop (`1440×900`) and Mobile (`375×812`) with zero button text overlap or horizontal overflow.
- `npx tsc --noEmit` exits with **0 errors** and `npm run build` succeeds cleanly.
