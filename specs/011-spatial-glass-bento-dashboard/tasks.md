# Task Breakdown: Spatial Dark Mode Glassmorphism & Bento Grid Dashboard

**Feature**: `011-spatial-glass-bento-dashboard`

- [x] **T1 — SVG Primitives (< 35 lines each)**
  - Created `src/pages/admin/components/spatial/RingGauge.tsx` (31 lines)
  - Created `src/pages/admin/components/spatial/MiniSparkline.tsx` (34 lines)
- [x] **T2 — Multi-Role Types, Navigation Registry & Context**
  - Updated `src/pages/admin/types.ts` and `src/pages/admin/constants.ts` with `COACH`/`PLAYER` nav items & role badges
  - Updated `src/pages/admin/context/AdminDashboardContext.tsx` & `src/pages/admin/hooks/useAdminData.ts` for all 5 roles with strict RBAC preservation
  - Updated `src/components/layout/Navbar.tsx` so all authenticated roles can open their Spatial Dashboard and harmonized `/admin` top strip
- [x] **T3 — Shared Spatial Shell, Floating Pill Dock & Floating Glass Topbar**
  - Upgraded `src/pages/admin/AdminDashboardPage.tsx` with `#0B0D12` ambient mesh background (`orange-500/15`, `rose-600/15`, `amber-900/20`, `blur-[130px]`)
  - Redesigned `src/pages/admin/layout/AdminSidebar.tsx` into Desktop Left Floating Pill Dock (`left-4`) + Mobile Bottom Floating Pill Dock + Glass Drawer
  - Redesigned `src/pages/admin/layout/AdminHeader.tsx` & `AdminQuickSearch.tsx` into Top Floating Glass Pill Bar with sub-nav pills and User/Role badge cluster
- [x] **T4 — Role KPI Row, Bento Gradient Grid & Member/Coach Portal**
  - Created `src/pages/admin/components/spatial/SpatialKpiRow.tsx` (3-column KPI row for `SUPERADMIN`, `ADMIN`, `CAPTAIN`, `COACH`, `PLAYER`)
  - Created `src/pages/admin/components/spatial/SpatialBentoGrid.tsx` (4-col Bento Gradient cards + `RingGauge` + Filter Pills + circular white CTA button)
  - Created `src/pages/admin/tabs/MemberPortalTab.tsx` for `COACH` & `PLAYER`
  - Upgraded `src/pages/admin/tabs/OverviewTab.tsx` + `overview/` subcomponents (`RevenueKpiCards`, `RevenueTrendChart`, `GuestSessionsPanel`)
- [x] **T5 — Glassmorphism Container Unification Across All Admin Tabs**
  - Upgraded `VenuesTab.tsx` (added CAPTAIN KPI row & Bento cards + SUPERADMIN Bento Venue grid + glass containers)
  - Unified outer containers to `rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10` across `ApplicationsTab`, `UsersTab`, `PlayersTab`, `CourtsTab`, `SlotLockPanel`, `LeadershipTab`, `SheetsTab`, `BookingsTab`, `TrainingTab`, `CoachesTab`, `NewsTab`, `StoreTab`, `TournamentsTab` & tournament subpanels
- [x] **T6 — Analyze, Verify & Document (`/speckit.analyze`)**
  - Verified `RingGauge.tsx` (31 lines) and `MiniSparkline.tsx` (34 lines) strictly < 35 lines, zero new npm dependencies
  - Verified strict RBAC isolation and responsive Desktop (`1440px`) + Mobile (`375px`) classes across all 5 roles
  - Passed `npx tsc --noEmit` (0 errors) and `npm run build` cleanly
  - Synced `ARCHITECTURE.md` with Spec 011
