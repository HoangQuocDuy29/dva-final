# Implementation Plan: Modern Dark Analytics & Modular Admin Hub

**Branch**: `005-admin-modern-analytics-hub` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admin-modern-analytics-hub/spec.md`

## Summary

Swap the admin shell's horizontal tab bar for a collapsible, grouped sidebar plus a topbar with Hybrid Quick Search. Redesign the Overview tab with multi-source revenue KPIs and a native SVG chart. Add two read-only placeholder tabs (`STORE`, `TOURNAMENTS`). Existing domain tabs, hooks, modals and service calls are only re-parented, not rewritten. No backend, API or schema changes.

## Technical Context

**Language/Version**: TypeScript (tsc 7), React 19

**Primary Dependencies**: Vite 8, Tailwind CSS v4, `motion` v12, `lucide-react`, React Router v7. **No new packages.**

**Storage**: Neon PostgreSQL (production). Read-only for this feature, via existing `GET` endpoints only

**Testing**: `npx tsc --noEmit`, `npm run build`, manual scenarios in [quickstart.md](./quickstart.md) (the repo has no automated UI test suite)

**Target Platform**: Modern desktop + mobile browsers

**Project Type**: Fullstack web app (Express + SPA); only `src/pages/admin/` changes

**Performance Goals**: Tab switching under 100ms (client state only). Admin chunk should not grow by more than ~25 kB gzip

**Constraints**: Zero schema/migration/seed commands. Zero changes to `server.ts`, `lib/`, `src/services/api.ts`. Existing tab logic preserved byte-for-byte where possible

**Scale/Scope**: About 6 new files and about 6 modified files in `src/pages/admin/`

## Constitution Check

| Principle | Gate | Status |
| :--- | :--- | :--- |
| I. English-First UI | New/changed admin labels in English; Tournaments VN notice is an explicit user requirement | ✅ PASS (partial-scope pending **Q2**) |
| II. Backward-Compatible API & Schema | No route, DTO or schema change; `totalRevenue` key preserved; existing `?tab=` links valid | ✅ PASS |
| III. PostgreSQL SSoT & Idempotent Mutations | No new mutations; derived metrics are in-memory | ✅ PASS |
| IV. Fire-and-Forget Integrations | Not touched | ✅ N/A |
| V. Modular Admin Architecture & Design System | Thin shell kept; new `layout/AdminSidebar`, `tabs/StoreTab`, `tabs/TournamentsTab`, `components/overview/*`; palette `#0B0F19 / #111827 / #1E293B / #38BDF8 / #FACC15 / #F97316 / #8B0000` | ✅ PASS |
| Workflow §4 Build gates | `tsc` + `npm run build` | ⏳ verified at implementation |
| Workflow §5 ARCHITECTURE.md sync | Already drafted early → see **Q4** | ⚠️ DRIFT |

**Post-design re-check**: Same results. No violations need justification, so Complexity Tracking is empty.

## Proposal Gate — RESOLVED 2026-11-10 (user: "approve defaults")

| # | Decision |
| :--- | :--- |
| Q1 | Client-side estimate `Σ course.price` per CONFIRMED registration, labelled **"Est. Training Tuition"** with tooltip |
| Q2 | Narrow scope: shell, nav, Overview, new tabs, headers/badges. Toasts/modal copy → follow-up spec |
| Q3 | Quick Search results navigate to the target tab only (no pre-filled filter) |
| Q4 | ARCHITECTURE.md §3.6 marked "Planned — Spec 005" until implementation completes |

### Original questions (for reference)

> [!IMPORTANT]
> **Q1 — Training revenue has no stored amount.** `TrainingRegistration` has no price column and the API does not return one (research R-02). The proposal is to estimate it on the client as `Σ course.price` per `CONFIRMED` registration and label it **"Est. Training Tuition"**. This uses the current course price, so it can drift from what was actually paid. Approve, or show Training as a count only?

> [!IMPORTANT]
> **Q2 — Translation scope.** About 25 admin files contain Vietnamese (toasts, modal labels, `GuestSessionEmailModal`, `SheetsTab`). Proposal: translate only the shell, nav, Overview, new tabs and tab headers/badges now, and leave toasts/modal copy for a follow-up spec. `'Sân A'/'Sân B'`, `đ` and `appsScriptTemplate.ts` are never translated (contract values). Approve the narrow scope, or translate everything now (larger diff across logic files)?

> [!NOTE]
> **Q3 — Quick Search deep-select.** Clicking a player or booking result switches to the right tab, but does not pre-fill that tab's own search/filter, because that would mean touching `PlayersTab`/`BookingsTab` state. Is that acceptable?

> [!WARNING]
> **Q4 — ARCHITECTURE.md drift.** The `/speckit.specify` step already wrote §3.6 describing files that do not exist yet. Proposal: mark that block **"Planned — Spec 005"** now and finalize it after implementation.

## Design

### Shell layout (`AdminDashboardPage.tsx`)

```text
<AdminDashboardProvider>
  <div flex min-h-screen bg-[#0B0F19]>
    <AdminSidebar/>                 // lg: fixed w-64 | w-[72px]; <lg: drawer
    <div flex-1 min-w-0>
      <AdminHeader/>                // topbar: toggle · title · QuickSearch · user · actions
      <main> <FeedbackBanner/> {active tab switch — same conditions as today + STORE/TOURNAMENTS} </main>
    </div>
  </div>
  <GuestSessionEmailModal/>
</AdminDashboardProvider>
```

The `!isAdmin` guard block stays unchanged.

### Revenue & chart

- Extend `useAdminMetrics` with the `RevenueBreakdown` fields and a `monthlyRevenue` series ([data-model.md](./data-model.md)). Memoized and NaN-safe.
- `components/overview/RevenueKpiCards.tsx`: 4 cards (Total, Court, Training, Store).
- `components/overview/RevenueTrendChart.tsx`: stacked SVG bars (Court `#F97316`, Training `#38BDF8`, Store `#FACC15`), animated by `motion`, hover tooltip, `viewBox` responsive, empty state.
- The existing "Recent Court Reservations" and "Pending Tryout Candidates" panels stay as they are, including the `handleApproveApplication` wiring. Only the labels are restyled.

## Project Structure

### Documentation (this feature)

```text
specs/005-admin-modern-analytics-hub/
├── spec.md
├── plan.md                       # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/admin-ui-contract.md
├── checklists/requirements.md
└── tasks.md                      # next: /speckit.tasks
```

### Source Code

```text
src/pages/admin/
├── AdminDashboardPage.tsx        # MODIFY: shell layout + 2 new tab cases
├── types.ts                      # MODIFY: AdminTabId += STORE|TOURNAMENTS; nav types; context UI state
├── constants.ts                  # MODIFY: VALID_TABS; ADMIN_NAV_GROUPS registry (buildAdminTabs kept for compat)
├── context/AdminDashboardContext.tsx  # MODIFY: isSidebarCollapsed / isMobileNavOpen (+ localStorage)
├── hooks/useAdminMetrics.ts      # MODIFY: additive revenue fields + monthly series
├── layout/
│   ├── AdminSidebar.tsx          # NEW
│   ├── AdminQuickSearch.tsx      # NEW
│   ├── AdminHeader.tsx           # MODIFY: becomes topbar; same 3 actions (guest mail, refresh, exit)
│   ├── AdminTabNav.tsx           # REMOVE after sidebar works (only used by AdminHeader)
│   └── FeedbackBanner.tsx        # unchanged
├── components/overview/
│   ├── RevenueKpiCards.tsx       # NEW
│   └── RevenueTrendChart.tsx     # NEW
└── tabs/
    ├── OverviewTab.tsx           # MODIFY: KPI + chart on top; existing panels kept
    ├── StoreTab.tsx              # NEW
    ├── TournamentsTab.tsx        # NEW
    └── (Courts|Bookings|Training|Players|Coaches|Applications|News|Users|Sheets)Tab.tsx  # UNCHANGED (unless Q2 = translate all)
```

**Structure Decision**: Keep the existing modular admin structure (constitution V). Everything new lives under `src/pages/admin/`. Untouched: `server.ts`, `lib/**`, `prisma/**`, `src/services/**`.

## Risk Register

| Risk | Mitigation |
| :--- | :--- |
| Accidental production write while testing | Quickstart limits browser validation to read paths; no DB CLI commands are part of this plan |
| Layout change breaks sticky elements inside tabs (e.g. Courts schedule) | `min-w-0` on main column; manual check of V10 |
| Admin bundle growth | No new deps; lucide icons are tree-shaken |
| Training estimate misread as accounting truth | "Est." label + tooltip (Q1) |

## Complexity Tracking

No constitution violations.
