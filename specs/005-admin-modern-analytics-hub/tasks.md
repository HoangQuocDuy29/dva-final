---
description: "Task list for 005 — Modern Dark Analytics & Modular Admin Hub"
---

# Tasks: Modern Dark Analytics & Modular Admin Hub

**Input**: Design documents from `/specs/005-admin-modern-analytics-hub/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/admin-ui-contract.md](./contracts/admin-ui-contract.md), [quickstart.md](./quickstart.md)

**Tests**: The spec asks for no automated tests. Verification uses the `tsc` and `build` gates plus the manual scenarios V1–V10 in [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story. Paths are relative to the repo root. All source changes go under `src/pages/admin/`.

> [!CAUTION]
> **Rules for every task:**
> - **Never run:** `prisma migrate *`, `prisma db push`, `prisma db seed`, `npm run seed`, `npm run prisma:push`, `npm run prisma:migrate`.
> - **Never edit:** `prisma/schema.prisma`, `server.ts`, `lib/**`, `src/services/**`.
> - **Data access:** only existing `GET` endpoints, through data already in `AdminDashboardContext`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md

---

## Phase 0: Proposal Gate (BLOCKING, needs your answers)

**Purpose**: Strict Review Mode. No source file may change until each question is answered and recorded in `plan.md`. The default in parentheses applies **only after you explicitly approve it**.

- [x] T001 Record the decision on **Q1, training revenue** in specs/005-admin-modern-analytics-hub/plan.md (default: client-side estimate `Σ course.price` per CONFIRMED registration, labelled "Est. Training Tuition"; alternative: show a count only)
- [x] T002 Record the decision on **Q2, translation scope** in specs/005-admin-modern-analytics-hub/plan.md (default: shell, nav, Overview, new tabs and tab headers/badges only; toasts and modal copy go to a follow-up spec)
- [x] T003 Record the decision on **Q3, Quick Search deep-select** in specs/005-admin-modern-analytics-hub/plan.md (default: navigate to the tab only, no pre-filled filter)
- [x] T004 Record the decision on **Q4, ARCHITECTURE.md drift** in specs/005-admin-modern-analytics-hub/plan.md (default: mark §3.6 "Planned — Spec 005" now)

**Checkpoint**: All four decisions recorded, so implementation can start.

---

## Phase 1: Setup

- [x] T005 Re-run the baseline gates `npx tsc --noEmit` and `npm run build:client`, and write the admin chunk size into specs/005-admin-modern-analytics-hub/research.md (R-08) for later comparison
- [x] T006 If Q4 = default, prefix the §3.6 block of ARCHITECTURE.md with a "Status: Planned — Spec 005 (not yet implemented)" note

---

## Phase 2: Foundational (blocks all user stories)

- [x] T007 Extend `AdminTabId` with `'STORE' | 'TOURNAMENTS'`. Add the `AdminNavGroupId`, `AdminNavItem` and `AdminNavGroup` types and add `isSidebarCollapsed`, `setIsSidebarCollapsed`, `isMobileNavOpen` and `setIsMobileNavOpen` to `AdminDashboardContextValue`, all in src/pages/admin/types.ts
- [x] T008 Add `'STORE'` and `'TOURNAMENTS'` to `VALID_TABS`. Add the static `ADMIN_NAV_GROUPS` registry (4 groups in contract order: id, English label, lucide icon, keywords, `superAdminOnly` for USERS, status `NEW` for STORE and `SOON` for TOURNAMENTS) and a `getAdminNavBadges(metrics)` helper. Keep `buildAdminTabs` exported and unchanged. All in src/pages/admin/constants.ts
- [x] T009 Add sidebar UI state to src/pages/admin/context/AdminDashboardContext.tsx: `isSidebarCollapsed` initialised from `localStorage['dva_admin_sidebar_collapsed']` (wrap in try/catch), persisted on change, and `isMobileNavOpen` closed whenever `activeModule` changes. Do **not** change the existing `activeModule` and USERS guard logic
- [x] T010 Run `npx tsc --noEmit`. It must report 0 errors before continuing

**Checkpoint**: Types, registry and context are ready. The UI is still the old tab bar.

---

## Phase 3: User Story 1, collapsible sidebar and grouped navigation (P1) 🎯 MVP

**Goal**: A 4-group sidebar replaces the horizontal tab bar. It is expanded by default, can collapse to icons only, and becomes a drawer on mobile.

**Independent Test**: quickstart V1, V2, V3 and V9.

- [x] T011 [US1] Create src/pages/admin/layout/AdminSidebar.tsx with these parts:
  - group headers and items rendered from `ADMIN_NAV_GROUPS`, with USERS filtered out when the user isn't a SuperAdmin
  - badges from `useAdminMetrics()` and `NEW`/`SOON` status pills
  - an active-item highlight in the brand gradient
  - widths `w-64` and `w-[72px]` at `lg` and up, with `title`/tooltips when collapsed
  - an off-canvas drawer with backdrop below `lg`
  - item clicks call `setActiveModule(id)`
  - colours per the constitution palette (`#0B0F19`, `#111827`, `#1E293B`)
- [x] T012 [US1] Rebuild src/pages/admin/layout/AdminHeader.tsx as a sticky topbar:
  - left: mobile menu button (`setIsMobileNavOpen(true)`), desktop collapse toggle, current module title from the registry
  - right: admin name, email and role badge
  - the 3 existing actions keep their handlers: `openGuestModal`, `fetchData` (with spinner) and the `Link to="/"` exit
  - remove the `<AdminTabNav />` render
  - leave an empty slot for Quick Search (US5)
- [x] T013 [US1] Change the layout in src/pages/admin/AdminDashboardPage.tsx to the flex shell (`<AdminSidebar/>` plus a `min-w-0` column with `<AdminHeader/>` and `<main>`). Keep the `!isAdmin` guard, `FeedbackBanner`, every existing `activeModule === ...` render line and `GuestSessionEmailModal` exactly as they are
- [x] T014 [US1] Delete src/pages/admin/layout/AdminTabNav.tsx, which is now unused (only `AdminHeader` imported it). Then run `grep -rn AdminTabNav src` and expect no results
- [x] T015 [US1] Run `npx tsc --noEmit` and work through quickstart V1, V2, V3 and V9

**Checkpoint**: Navigation works across all 10 existing tabs.

---

## Phase 4: User Story 3, preserving core athletics and services logic (P1)

**Goal**: Show that the re-parenting changed no behaviour in Bookings, Training or Players. Apply only the header/badge English pass approved in Q2.

**Independent Test**: quickstart V10 and an unchanged `git diff` on tab logic.

- [x] T016 [US3] Run `git diff --stat src/pages/admin/tabs src/pages/admin/hooks src/pages/admin/components`. Only files approved under Q2 may appear, and `hooks/useAdminMetrics.ts` may appear only after US2
- [x] T017 [P] [US3] Translate remaining Vietnamese **labels in headers and badges only** in src/pages/admin/constants.ts (for example `'Quản lý Tài Khoản'` becomes `'Staff & Roles'`) and in src/pages/admin/layout/AdminHeader.tsx (`'Gửi Mail Khách Vãng Lai'` becomes `'Guest Session Email'`). Never touch `'Sân A'`/`'Sân B'`, `đ` or `components/sheets/appsScriptTemplate.ts`
- [x] T018 [US3] If Q2 = "translate all", add follow-up tasks T018a… listing each tab or modal file and its strings, without changing handlers or service calls. If Q2 = default, open a placeholder note in specs/005-admin-modern-analytics-hub/research.md (R-07) for a follow-up spec
- [x] T019 [US3] Check by reading code (no writes to production) that the Bookings deposit approval (`handleUpdateBookingStatus`), the Training `handleToggleCourseVisibility` and status update, and the Players `handleTogglePlayerVisibility` and `missingAvatarOnly` filter are still rendered and wired in src/pages/admin/tabs/BookingsTab.tsx, TrainingTab.tsx and PlayersTab.tsx

**Checkpoint**: Logic preservation is confirmed, so the MVP (US1 + US3) can ship.

---

## Phase 5: User Story 2, revenue analytics and visual charts (P2)

**Goal**: Four KPI revenue cards and a 6-month stacked native SVG chart on the Overview tab.

**Independent Test**: quickstart V4 and V5.

- [x] T020 [US2] Extend src/pages/admin/hooks/useAdminMetrics.ts **additively**:
  - new fields `courtRevenue`, `trainingRevenue` (per Q1), `storeRevenue = 0`, `totalClubRevenue`, `confirmedTrainingCount` and `monthlyRevenue: MonthlyRevenuePoint[]`
  - `monthlyRevenue` covers the last 6 months in local time; bookings are grouped by `bookingDate` and registrations by `createdAt`
  - add `coursesList` to the memo deps
  - keep the existing `totalRevenue` key
  - guard every number with `Number(x) || 0`
- [x] T021 [P] [US2] Create src/pages/admin/components/overview/RevenueKpiCards.tsx with 4 cards (Total Club Revenue, Court Bookings Revenue, Est. Training Tuition or a count per Q1, DVA Store Revenue `0 đ`). Format as `toLocaleString('vi-VN') + ' đ'` and add a tooltip explaining how the training figure is calculated
- [x] T022 [P] [US2] Create src/pages/admin/components/overview/RevenueTrendChart.tsx:
  - stacked SVG bars in a responsive `viewBox`: Court `#F97316`, Training `#38BDF8`, Store `#FACC15`
  - `motion` height animation, a hover tooltip with English month and per-stream values, a legend
  - an empty state reading "No verified revenue in the last 6 months"
  - no new dependencies
- [x] T023 [US2] Update src/pages/admin/tabs/OverviewTab.tsx:
  - add `<RevenueKpiCards/>` and `<RevenueTrendChart/>` above the existing panels
  - move the old pending/tryout/athlete KPIs into a compact "Operations" row
  - keep "Recent Court Reservations" and "Pending Tryout Candidates" with `handleApproveApplication` unchanged
  - replace the 2 Vietnamese strings with English
- [x] T024 [US2] Run `npx tsc --noEmit`, then quickstart V4 (court revenue equals the sum of PAID rows in the Bookings tab) and V5

---

## Phase 6: User Story 5, topbar Quick Search (P2)

**Goal**: A Hybrid Hub Navigator opened with `⌘K`/`Ctrl+K` that finds modules, players and bookings on the client.

**Independent Test**: quickstart V6.

- [x] T025 [US5] Create src/pages/admin/layout/AdminQuickSearch.tsx:
  - an input with a `⌘K` hint and a global keydown listener (cleaned up on unmount) that focuses it; `Esc` closes it
  - a results dropdown grouped into Modules (registry label and keywords, USERS only for SuperAdmins), Athletes (`fullName` or `jerseyNumber`) and Bookings (`bookingCode` or `customerName`), with at most 5 per group
  - Arrow/Enter keyboard navigation
  - selecting a result calls `setActiveModule(target)` (per Q3)
  - no network calls
- [x] T026 [US5] Mount `<AdminQuickSearch/>` in the slot in src/pages/admin/layout/AdminHeader.tsx. Hide it below `md` and show an icon button that opens it as an overlay
- [x] T027 [US5] Run `npx tsc --noEmit` and quickstart V6

---

## Phase 7: User Story 4, DVA Store and Tournaments (P3)

**Goal**: Two read-only placeholder modules.

**Independent Test**: quickstart V7 and V8.

- [x] T028 [P] [US4] Create src/pages/admin/tabs/TournamentsTab.tsx:
  - header "Tournaments & Leagues Hub" and a "Coming Soon" badge
  - the **exact** notice from contracts §3: `Feature Under Development - Hệ thống quản lý giải đấu đang được phát triển và dịch vụ sẽ sớm được triển khai.`
  - 3 roadmap cards: Bracket Generator, Team Registration, Live Scoreboards
  - no write actions
- [x] T029 [P] [US4] Create src/pages/admin/tabs/StoreTab.tsx with KPI cards (Store Revenue `0 đ`, Products 0, Orders 0), category tiles (Jerseys, Volleyballs, Training Gear) and a disabled "Add Product" button with a "Coming in Phase 2" badge. No API calls
- [x] T030 [US4] Add `{activeModule === 'STORE' && <StoreTab />}` and `{activeModule === 'TOURNAMENTS' && <TournamentsTab />}` to src/pages/admin/AdminDashboardPage.tsx
- [x] T031 [US4] Run `npx tsc --noEmit` and quickstart V7 and V8 (DevTools Network tab shows no requests on either view)

---

## Phase 8: Polish and cross-cutting

- [x] T032 Check accessibility: `aria-label` on icon-only buttons, `aria-current="page"` on the active nav item, `role="dialog"` with focus return for the mobile drawer and the search overlay, in src/pages/admin/layout/AdminSidebar.tsx and AdminQuickSearch.tsx
- [x] T033 Finalise ARCHITECTURE.md §3.6: remove the "Planned" note and make sure it matches the real file names (`AdminQuickSearch.tsx`, `components/overview/RevenueKpiCards.tsx`, `RevenueTrendChart.tsx`, removal of `AdminTabNav.tsx`) and the training revenue method (Q1)
- [x] T034 Run the final gates: `npx tsc --noEmit` (0 errors), `npm run build` (succeeds; its `prisma generate` only regenerates the local client), and `git diff --stat prisma/ server.ts lib/ src/services/` (must be empty). Compare the admin chunk size with T005
- [x] T035 Run `npm run dev` and work through quickstart V1–V10. The BACKEND log must show no `P2022`, `ColumnNotFound` or fallback warnings, and the UI must show live Neon data (no mock seed athletes)
- [x] T036 Mark all tasks complete in specs/005-admin-modern-analytics-hub/tasks.md and tick the feature readiness items in checklists/requirements.md

---

## Dependencies & Execution Order

```text
Phase 0 (gate) → Phase 1 → Phase 2 → US1 → US3 ──► MVP
                                       ├─► US2 (needs Q1)
                                       ├─► US5 (needs Header slot from T012)
                                       └─► US4 (needs T007/T008 only; can start right after Phase 2)
                                                         └─► Phase 8
```

- US2, US4 and US5 are independent of each other once US1's shell (T011–T013) exists.
- T030 and T013 both edit `AdminDashboardPage.tsx`, so do them in sequence.
- T012, T017 and T026 all edit `AdminHeader.tsx`, so do them in sequence.

## Parallel Opportunities

- **US2**: T021 ∥ T022 (separate new files), after T020.
- **US4**: T028 ∥ T029.
- **Across stories**: T021/T022 ∥ T025 ∥ T028/T029 once Phase 3 is done.

## Implementation Strategy

1. **MVP**: Phases 0–4 (gate, foundation, sidebar shell, preservation check). These can ship alone with no visual regressions to any module.
2. **Increment 2**: US2 (analytics), the highest business value after navigation.
3. **Increment 3**: US5 (Quick Search).
4. **Increment 4**: US4 (placeholders).
5. **Polish**: Phase 8 and the final gates.
