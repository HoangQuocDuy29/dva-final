# Phase 0 Research: Modern Dark Analytics & Modular Admin Hub

**Feature**: `005-admin-modern-analytics-hub` | **Date**: 2026-11-10

All findings below come from reading the current codebase (read-only). No database commands were executed.

---

## R-01 — Chart rendering approach

- **Decision**: Native SVG bar/donut chart rendered with React 19 + `motion` (v12, already installed) + Tailwind v4.
- **Rationale**: `recharts` is **not installed** (`npm ls recharts` → empty) and the sandboxed `npm i --dry-run recharts` failed with `E403` on a transitive Tailwind package. Approved by the user at the spec Proposal Gate.
- **Alternatives considered**: `recharts` (needs network + possible React 19 peer issues); `chart.js` (same install problem, imperative canvas API).

## R-02 — Training revenue source ⚠️ RISK (needs approval — see plan Q1)

- **Finding**: The `TrainingRegistration` Prisma model has **no price/amount column**. The API mapper `toRegistrationDto()` (`lib/prisma.ts` L295) returns no `amount`/`price`, so the optional `amount?`/`price?` fields in `src/types/index.ts` are always `undefined` on the admin client.
- **Implication**: "Training & Academy Tuition = sum of CONFIRMED registrations" cannot be read directly. It must be **derived** on the client: `Σ course.price` for each `CONFIRMED` registration, joined via `registration.courseId → coursesList[].id`.
- **Caveats of derivation**:
  - Uses the **current** course price, not the price at time of enrollment.
  - `priceUnit` may be `/ player / session` — a single registration might not equal one payment.
  - Registrations whose course was deleted (cascade) disappear; registrations pointing to a missing course count as `0`.
- **Recommended decision**: Client-side derivation, labelled in the UI as **"Est. Training Tuition"** with a tooltip explaining the basis. Zero backend/schema change.
- **Alternatives**: (a) add an `amount` column — **forbidden** in this task (no schema change); (b) new aggregate endpoint in `server.ts` — unnecessary, the data is already loaded.

## R-03 — Court booking revenue

- **Finding**: `useAdminMetrics().totalRevenue` = `Σ totalPrice` where `paymentStatus === 'PAID'`. Reused unchanged and renamed in the UI to "Court Bookings Revenue".

## R-04 — Tab routing & permission guard

- **Finding**: `AdminDashboardContext` derives `activeModule` from `?tab=` and validates against `VALID_TABS`; `USERS` falls back to `OVERVIEW` for non-SuperAdmins.
- **Decision**: Add `STORE` and `TOURNAMENTS` to `AdminTabId` + `VALID_TABS`. Existing deep links (`?tab=bookings`, etc.) keep working. No change to the guard logic.

## R-05 — Sidebar collapsed state persistence

- **Decision**: Local UI state in `AdminDashboardContext` (`isSidebarCollapsed`, `isMobileNavOpen`), collapsed preference cached in `localStorage` key `dva_admin_sidebar_collapsed`. Pure client UI — no API/DB.
- **Breakpoint**: `lg` (1024px). Below `lg` → off-canvas drawer.

## R-06 — Quick Search data source

- **Decision**: Pure client-side filtering over data already in context (`players`, `bookings`) + a static module registry. No new API calls, no Prisma queries. `⌘K` / `Ctrl+K` focuses the input; `Esc` closes.
- **Result actions**: module → `setActiveModule(id)`; player → switch to `PLAYERS`; booking → switch to `BOOKINGS`. (Pre-filling the destination tab's search box would require touching `PlayersTab`/`BookingsTab` internal state — **out of scope** unless approved; see plan Q3.)

## R-07 — Existing Vietnamese strings in admin (RESOLVED — Q2 default approved)

- **Finding**: ~25 files under `src/pages/admin/` contain Vietnamese text (toasts in `TrainingTab`, labels in form modals, `GuestSessionEmailModal`, `SheetsTab`, `constants.ts` e.g. `'Quản lý Tài Khoản'`, header button `'Gửi Mail Khách Vãng Lai'`).
- **Must NOT be translated** (data/contract values): `'Sân A'`, `'Sân B'`, court names coming from DB, the `đ` currency suffix, `appsScriptTemplate.ts` (Google Sheets column headers — changing them breaks the Apps Script sync).
- **Approved decision (T018)**: In Spec 005, translated **shell + navigation + Overview + new tabs + tab headers/badges** (`'Quản lý Tài Khoản'` → `'Staff & Roles'`, `'Gửi Mail Khách Vãng Lai'` → `'Guest Session Email'`). Internal toast messages and modal form labels across existing tabs are deferred to a dedicated localization follow-up spec to preserve 0-diff logic stability in existing domain tabs.

## R-08 — Build gates baseline

- `npx tsc --noEmit` → 0 errors (baseline, before any code change).
- `npm run build:client` → success (baseline admin chunk 212.97 kB / 48.10 kB gzip).
- Full `npm run build` runs `prisma generate` — this only regenerates the local client from the unchanged schema; it **does not touch the database**. Safe to run.

## R-09 — Documentation drift (RESOLVED — T033)

- **Resolution**: `ARCHITECTURE.md` §3.6 has been synchronized with the exact implemented files (`AdminSidebar.tsx`, `AdminQuickSearch.tsx`, `components/overview/RevenueKpiCards.tsx`, `components/overview/RevenueTrendChart.tsx`, `tabs/StoreTab.tsx`, `tabs/TournamentsTab.tsx`, removal of `AdminTabNav.tsx`, and client-side `trainingRevenue` calculation).
