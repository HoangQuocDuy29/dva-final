# Feature Specification: Spatial Dark Mode Glassmorphism & Bento Grid Multi-Role Dashboard

**Feature ID**: `011-spatial-glass-bento-dashboard`  
**Created**: 2026-11-26  
**Last Updated**: 2026-11-28 (Extended by `014-spatial-glass-polish-perf`)  
**Status**: Implemented & Verified  

## 1. Objective & Scope
Upgrade the entire DVA Club management dashboard (`/admin/dashboard`) across **all 5 authenticated roles** (`SUPERADMIN`, `ADMIN`, `COACH`, `CAPTAIN`, `PLAYER`) to a cohesive **Spatial Dark Mode Glassmorphism + Bento Grid** design language without installing any external chart libraries or breaking any existing RBAC rules, API endpoints, state, or tab workflows.

## 2. Non-Negotiable Constraints (Zero Bloat & RBAC Integrity)
- **Zero External Chart Dependencies**: Build 2 ultra-lightweight pure SVG + Tailwind CSS primitives (`RingGauge` and `MiniSparkline`, each < 35 lines of code). No Recharts, Chart.js, or external UI template packages.
- **100% Preserved RBAC & API Contracts**:
  - Backend middleware (`server/middlewares/auth.middleware.ts`, `rbac.middleware.ts`) remains untouched.
  - `SUPERADMIN`: Full access to all 13 existing modules + overview analytics.
  - `ADMIN`: Strictly scoped to `ADMIN_ALLOWED_TABS` (`OVERVIEW`, `TOURNAMENTS`, `NEWS`, `APPLICATIONS`). Financial totals and PII remain hidden.
  - `CAPTAIN`: Strictly scoped to own club (`VENUES` / `Lịch Chơi & Slot Ca` and `CAPTAIN_PROFILE` / `Hồ Sơ & Ảnh Đội`) via `/api/admin/venues`.
  - `COACH` & `PLAYER`: Self-service Spatial Portal inside `/admin/dashboard` powered exclusively by `PUBLIC_RULES` endpoints (`GET /api/players`, `GET /api/coaches`, `GET /api/training/courses`, `GET /api/venues`) and authenticated self-profile endpoints (`/api/admin/auth/profile`, `/api/admin/auth/change-password`). Zero unauthorized admin API requests.
  - `<AdminDashboardProvider key={currentUser.id}>` continues to mount only after `!isHubAllowed` check passes.

## 3. Functional & Visual Requirements

### 3.1. Shared Spatial Shell
- **Warm Dark Ambient Mesh Background**: Outer dashboard wrapper uses `bg-[#0B0D12]` with 3 non-interactive ambient light orbs (`pointer-events-none blur-[130px]`): DVA Orange (`bg-orange-500/15`), Cherry Red (`bg-rose-600/15`), and Deep Amber (`bg-amber-900/20`).
- **Left Floating Pill Dock (`hidden lg:flex flex-col`)**:
  - Replaces solid sidebar with a floating vertical pill dock (`rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/15 p-2 shadow-2xl`) positioned `16px` (`left-4`) from the left edge.
  - Displays role-specific navigation icons with an elevated active pill (`bg-white text-slate-950`) and non-clipped hover tooltips showing module name & badge count.
  - On Mobile (`< lg`), renders as a compact floating bottom pill dock (`fixed bottom-3 left-3 right-3 rounded-full`) with quick role icons and a glass drawer toggle when a role has more than 5 modules.
- **Top Floating Glass Bar**:
  - Floating rounded pill bar (`rounded-full bg-[#10131C]/65 backdrop-blur-2xl border border-white/12`) inside a fully transparent sticky wrapper (`bg-transparent pointer-events-none`) aligned at `max-w-[1440px]` with `<main>`, containing quick search, contextual sub-navigation pill tabs, quick actions, and user identity + role badge dropdown on the right.

### 3.2. Bento Grid & Pure SVG Visualizations
- **3-Column Overview KPI Row (`grid-cols-1 md:grid-cols-3 gap-4`)**:
  - Glassmorphic cards (`rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5`) with `MiniSparkline` / `RingGauge`:
    - `SUPERADMIN`: (1) Total Members & Pending Tryout Applications; (2) Total Court & Verified VietQR Revenue; (3) Average Slot Fill Rate (`%`).
    - `ADMIN`: (1) Active Members & Pending Tryout Applications; (2) Scoped Tournaments & News Operations (zero finance/PII); (3) Tryout Processing / Readiness Rate (`%`).
    - `CAPTAIN`: (1) Weekly Sessions Count; (2) Registered Slots / Total Slots; (3) Venue Open / Closed Status.
    - `COACH` / `PLAYER`: (1) USAV Skill Level (`skillRank`); (2) Training Sessions Joined / Coached; (3) Next Upcoming Session Schedule.
- **Bento Gradient Card Grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`)**:
  - Top **Filter Pills** bar: `Tất cả` | `Đang hoạt động` | `Còn nhiều slot` | `Tạm nghỉ`.
  - Gradient glass cards (`rounded-3xl border border-white/15`) cycling subtle top-to-bottom gradients (`from-orange-500/25`, `from-rose-600/25`, `from-emerald-500/25`, `from-indigo-500/25` to `to-white/[0.03]`).
  - Centered `RingGauge` displaying fill/progress percentage, bottom category badge, title, 2-line description, and white circular action button (`w-9 h-9 rounded-full bg-white text-slate-900`) at bottom-right.

### 3.3. Full Tab Preservation, Glassmorphism Unification & GPU Performance (Extended by Spec 014)
- Wrap/upgrade containers across all existing tabs (`Tryout Applications`, `Staff & Roles`, `Roster Squad`, `Court Schedule & Slots`, `Leadership Team`, `Google Sheets Sync`, `Bookings`, `Training`, `Coaches`, `News`, `Store`, `Tournaments`, `Venues`, `Overview`) to `.dva-glass-panel` while keeping 100% of interactive features intact.
- See `specs/014-spatial-glass-polish-perf/spec.md` for full inner-control glass unification (`VenuesTab`, `CourtsTab`, `CourtFormModal`), single-layer `backdrop-blur` GPU performance rules, Instant Label Paint, `ApplicationsTab` column rebalancing, and `0ms` keep-alive tab caching.

## 4. Verification Criteria
- Visual and responsive layout verification across `SUPERADMIN`, `ADMIN`, `CAPTAIN`, `COACH`, and `PLAYER` on Desktop (`1440px`) and Mobile (`375px`).
- `npx tsc --noEmit` exits with **0 errors**.
- `npm run build` completes cleanly with zero bundle regressions.
