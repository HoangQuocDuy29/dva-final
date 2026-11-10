# Quickstart & Validation Guide

**Feature**: `005-admin-modern-analytics-hub`

> [!CAUTION]
> Local `.env` points at the **production Neon database**. Do **not** run `prisma migrate *`, `prisma db push`, `prisma db seed`, `npm run seed`, `npm run prisma:push` or `npm run prisma:migrate` at any point.
> In the browser, validate **read paths only** unless you intentionally want to change live data — toggles and approvals write to production.

## 1. Static gates

```bash
npx tsc --noEmit        # expect: no output, exit 0
npm run build           # expect: prisma generate (local client only) + vite build + esbuild succeed
git diff --stat prisma/ # expect: empty
```

## 2. Run

```bash
npm run dev
```

Watch the **BACKEND** log: there must be no `P2022`, `ColumnNotFound`, or "fallback"/mock warnings.

## 3. Scenarios

| # | Action | Expected |
| :--- | :--- | :--- |
| V1 | Open `/admin` as ADMIN | Sidebar expanded with 4 groups (see [contract](./contracts/admin-ui-contract.md#2-sidebar-groups-order-is-contractual)); `USERS` hidden |
| V2 | Click collapse toggle, reload | Sidebar stays collapsed (icon-only + tooltips) |
| V3 | Resize < 1024px | Sidebar becomes drawer; backdrop click closes it |
| V4 | Overview | 4 KPI cards; Court revenue equals sum of PAID bookings in Bookings tab; Store = `0 đ`; chart renders 6 months |
| V5 | Compare player/course/booking counts with Neon (read-only, e.g. Prisma Studio view only) | Counts match; no mock names (e.g. seed athletes) appear |
| V6 | `⌘K`, type `store` / a player name / a booking code | Matching results; Enter navigates to the target tab |
| V7 | `?tab=tournaments` | Exact Coming Soon copy from [contract §3](./contracts/admin-ui-contract.md#3-tournaments-view--exact-copy-fr-007) |
| V8 | `?tab=store` | Placeholder, no network calls in DevTools |
| V9 | `?tab=users` as ADMIN | Falls back to Overview |
| V10 | Bookings / Training / Players tabs | Same controls as before: deposit approval, `isActive` toggles, Missing Avatar filter present and wired (optional live write test only with a disposable record) |
