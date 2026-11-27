# Implementation Plan: Spatial Glassmorphism Polish, Venues/Courts Unification & Render Performance

**Spec Reference**: `specs/014-spatial-glass-polish-perf/spec.md`

## 1. Architecture & File Map

### Phase A — Shell Polish & Tryouts Table Alignment
1. `src/pages/admin/layout/AdminHeader.tsx`:
   - Remove `bg-gradient-to-b from-[#0B0D12] via-[#0B0D12]/90 to-transparent` from sticky wrapper (`bg-transparent pointer-events-none`), apply `pointer-events-auto` to `<header>` and profile dropdown, refine glass pill to `bg-[#10131C]/65 backdrop-blur-2xl border-white/12`, and widen container to `max-w-[1440px] px-3 sm:px-5 lg:px-6`.
2. `src/pages/admin/AdminDashboardPage.tsx`:
   - Widen `<main>` container to `max-w-[1440px] px-3 sm:px-5 lg:px-6`.
3. `src/pages/admin/tabs/ApplicationsTab.tsx`:
   - Rebalance `colgroup` (`20/11/15/13/16/25%` at `min-w-[1180px]` for `SUPERADMIN`; `26/15/14/19/26%` at `min-w-[960px]` for `ADMIN`/`COACH`), remove redundant score inside `✓ ĐÃ DUYỆT`, and add `flex-wrap justify-end` on Actions.

### Phase B — Venues & Courts Full Spatial Glassmorphism
4. `src/pages/admin/tabs/VenuesTab.tsx`:
   - Upgrade all panels, venue cards, detail header buttons (`h-9`), holiday closure bar, club accordion cards, session cards, captains table, and shared DRY modal to `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-input`, and `.dva-glass-modal`.
   - Add zero-dependency `UsavRankDropdown` custom glass popover replacing native `<select>` inside session cards.
5. `src/pages/admin/tabs/CourtsTab.tsx`, `src/pages/admin/components/courts/CourtCard.tsx`, `SlotLockPanel.tsx`, `CourtFormModal.tsx`, `WeeklyScheduleEditor.tsx`:
   - Replace all solid slate/navy containers, inputs, and buttons with `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-input`, `.dva-glass-modal`, and translucent `rounded-full` pills.

### Phase C — GPU Compositing, Instant Label Paint & Keep-Alive Caching
6. `src/index.css`:
   - Remove `backdrop-blur-*` from `.dva-glass-card` and `.dva-glass-pill`; keep blur strictly on `.dva-glass-panel` and `.dva-glass-modal`.
   - Replace `transition-all` with `transition-colors duration-150`; shorten `.dva-content-reveal` to `180ms`.
7. `src/pages/admin/tabs/UsersTab.tsx`, `PlayersTab.tsx`, `ApplicationsTab.tsx`, `VenuesTab.tsx`, `CourtsTab.tsx`, `components/courts/*`, `src/pages/PlayersPage.tsx`, `src/pages/CourtMapPage.tsx`:
   - Remove nested `backdrop-blur-*` and `transition-all` from repeated buttons, badges, and list cards.
   - Render static headers, toolbars, filter labels, and `<thead>` immediately on mount; defer only dynamic counts and scope skeletons strictly to data rows/grids.
8. `src/pages/admin/AdminDashboardPage.tsx` & `src/pages/admin/hooks/useAdminData.ts`:
   - Keep visited tabs mounted via `visitedModules` state + CSS `hidden` (`0ms` tab switch, `scrollTo({ top: 0, behavior: 'auto' })`).
   - Run independent API initializations, refreshes, and multi-endpoint scope loads concurrently via `Promise.allSettled`.

## 2. Verification Strategy
1. Audit `VenuesTab` and `CourtsTab` + `components/courts/*` for zero remaining legacy solid dark classes.
2. Audit `backdrop-blur` counts across core list/table views (verify >85% reduction).
3. Run `npx tsc --noEmit` (0 errors) and `npm run build` (clean production build).
4. Synchronize `ARCHITECTURE.md`, `specs/011-spatial-glass-bento-dashboard/spec.md`, and `specs/system-overview.md`.
