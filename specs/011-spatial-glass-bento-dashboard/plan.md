# Implementation Plan: Spatial Dark Mode Glassmorphism & Bento Grid Dashboard

**Spec Reference**: `specs/011-spatial-glass-bento-dashboard/spec.md`

## 1. Architecture & File Map

### New Modular Components (Zero External Dependencies)
1. `src/pages/admin/components/spatial/RingGauge.tsx` (< 35 lines)
   - Pure SVG radial arc gauge using `strokeDasharray` / `strokeDashoffset`, centered `%` label, optional sub-label and stroke color class.
2. `src/pages/admin/components/spatial/MiniSparkline.tsx` (< 35 lines)
   - Pure SVG smooth polyline + subtle gradient area fill + terminal highlight dot, accepting `values: number[]` and `strokeColor`.
3. `src/pages/admin/components/spatial/SpatialKpiRow.tsx`
   - 3-column (`grid-cols-1 md:grid-cols-3 gap-4`) role-aware glassmorphic KPI row supporting `SUPERADMIN`, `ADMIN`, `CAPTAIN`, `COACH`, and `PLAYER`.
4. `src/pages/admin/components/spatial/SpatialBentoGrid.tsx`
   - Reusable Bento Gradient Card Grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`) with Filter Pills (`Tất cả`, `Đang hoạt động`, `Còn nhiều slot`, `Tạm nghỉ`), rotating 4 gradient themes, centered `RingGauge`, category badge, title, 2-line description, and white circular `w-9 h-9` CTA button.
5. `src/pages/admin/tabs/MemberPortalTab.tsx`
   - Dedicated Spatial Dashboard tab for `COACH` & `PLAYER` roles (`MEMBER_OVERVIEW`, `MEMBER_SCHEDULE`, `MEMBER_VENUES`), consuming only public endpoints (`players`, `coaches`, `training/courses`, `venues`) + self profile.

### Core Shell & Context Updates
1. `src/pages/admin/types.ts` & `src/pages/admin/constants.ts`:
   - Add `MEMBER_OVERVIEW`, `MEMBER_SCHEDULE`, `MEMBER_VENUES` to `AdminTabId`.
   - Extend `getVisibleNavGroups(role)` to return tailored icon navigation groups for `SUPERADMIN`, `ADMIN`, `CAPTAIN`, `COACH`, and `PLAYER`.
   - Expose `isCoach`, `isPlayer`, `isMemberRole` booleans in `AdminDashboardContextValue`.
2. `src/pages/admin/hooks/useAdminData.ts`:
   - Keep existing lazy-loading logic for `SUPERADMIN`, `ADMIN`, `CAPTAIN` intact.
   - Add public-only data loader for `COACH` / `PLAYER` (`playerService.getPlayers()`, `coachService.getCoaches()`, `trainingService.getCourses()`, `venueService.getVenues()`).
   - For `SUPERADMIN` on `OVERVIEW`, optionally also load lightweight public `venueService.getVenues()` once so the Bento Grid and average slot occupancy KPI show real venue fill rates immediately.
3. `src/pages/admin/AdminDashboardPage.tsx`:
   - Expand `isHubAllowed` to include `SUPERADMIN`, `ADMIN`, `CAPTAIN`, `COACH`, `PLAYER`, `STAFF`.
   - Wrap shell in `bg-[#0B0D12]` with 3 warm ambient glow orbs (`orange-500/15`, `rose-600/15`, `amber-900/20`, `blur-[130px] pointer-events-none`).
   - Adjust layout padding for left Floating Pill Dock on `lg+` and bottom Floating Pill Dock on `< lg`.
4. `src/pages/admin/layout/AdminSidebar.tsx`:
   - Transform into **Left Floating Pill Dock** (`hidden lg:flex flex-col fixed left-4`) with fixed-position non-clipped hover tooltips and active `bg-white text-slate-950` icon pills.
   - Add **Mobile Floating Bottom Pill Dock** (`lg:hidden fixed bottom-3 left-3 right-3`) + full glass drawer overlay for roles with >5 items.
5. `src/pages/admin/layout/AdminHeader.tsx` & `AdminQuickSearch.tsx`:
   - Transform into **Top Floating Glass Bar** (`rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/10`) with quick search pill, role-contextual sub-navigation pills, and user avatar + role badge cluster.
6. `src/components/layout/Navbar.tsx` & `src/components/auth/AuthModal.tsx`:
   - Harmonize `/admin/*` navbar strip with `#0B0D12` + `border-white/10`.
   - Allow `COACH` & `PLAYER` to open their Spatial Dashboard directly from the Navbar user menu.

### Tab Glassmorphism Upgrades
- `OverviewTab.tsx` + `RevenueKpiCards.tsx` + `RevenueTrendChart.tsx` + `GuestSessionsPanel.tsx`: integrate `SpatialKpiRow` & `SpatialBentoGrid` at the top and unify all sub-panels to `bg-white/[0.04] backdrop-blur-xl border border-white/10`.
- `VenuesTab.tsx`: add CAPTAIN `SpatialKpiRow` & `SpatialBentoGrid` (own club sessions/slots) and SUPERADMIN Bento Venue Cards with Filter Pills above Master-Detail workspace; upgrade all panel surfaces to glassmorphism.
- All remaining tabs (`ApplicationsTab`, `UsersTab`, `PlayersTab`, `CourtsTab`, `LeadershipTab`, `SheetsTab`, `BookingsTab`, `TrainingTab`, `CoachesTab`, `NewsTab`, `StoreTab`, `TournamentsTab`): upgrade outer panel containers to `rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10` without altering any functional controls.

## 2. Verification Strategy
1. Run `npx tsc --noEmit` (must pass with 0 errors).
2. Run `npm run build` (must succeed cleanly).
3. Inspect key components for code size (`RingGauge` & `MiniSparkline` < 35 lines), RBAC isolation, and responsive classes (`1440px` desktop & `375px` mobile).
4. Update `ARCHITECTURE.md` with Spec 011 documentation.
