---
description: "Task breakdown for 008 — DVA Tournaments & Leagues Module"
---

# Tasks: DVA Tournaments & Leagues Module

**Input**: `/specs/008-tournaments-module/` ([spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md))  
**Verification Gates**: `npx prisma db push`, `npx prisma generate`, `npx tsc --noEmit`, `npm run build`

---

## Phase 1: Database Schema, Shared Engine & Security
- [x] T001 Create branch `feat/tournaments-module` from clean `main`
- [x] T002 Add 6 enums and 5 additive models (`Tournament`, `TournamentTeam`, `TournamentPlayer`, `TournamentMatch`, `TournamentOfficial`) to `prisma/schema.prisma` and sync via `npx prisma db push` & `npx prisma generate`
- [x] T003 Create `src/types/index.ts` Tournament TypeScript interfaces and `src/shared/tournaments.ts` (BO3/BO2 Standings Engine with `W -> FIVB Points -> Set Ratio -> Point Ratio -> Head-to-Head -> Manual/Seed`, Knockout seeding/propagation rules, 1-day 20-match 2-court generator)
- [x] T004 Update `lib/security.ts` (`PUBLIC_RULES`), `lib/schemas.ts`, and `lib/prisma.ts` (Tournament DTO mappers with public PII stripping)

## Phase 2: Backend APIs, VietQR, Mailer & Webhook
- [x] T005 Update `lib/mailer.ts` with `generateTournamentTransferContent` & bilingual `sendTournamentRegistrationEmail`
- [x] T006 Implement Public & Admin Tournament REST endpoints in `server.ts` (including `summary=finance`, transactional `maxTeams` guard for `PAID` slots, mode-change/paid-delete revenue protection, courtside score updates + guarded Knockout propagation, schedule generator, and `/api/webhooks/payment` reconciliation)

## Phase 3: Admin Dashboard & Financial Analytics (Option A)
- [x] T007 Update `src/utils/cloudinary.ts` (`'tournaments'` module) and `src/services/api.ts` (`tournamentService` + SWR caching + `deduplicatedPost`)
- [x] T008 Integrate Option A financial analytics into `useAdminData.ts`, `useAdminMetrics.ts`, `RevenueKpiCards.tsx`, `OverviewTab.tsx`, `RevenueTrendChart.tsx`, `constants.ts`, and `AdminQuickSearch.tsx`
- [x] T009 Replace placeholder `src/pages/admin/tabs/TournamentsTab.tsx` with full modular Tournament Admin workspace (KPI cards, Tournament Form Modal, Teams & VietQR Fees Manager, Squad Import, Roster & Awards Editor, Officials Manager, and Touch-friendly Courtside Live Scoreboard & Bracket Seeder)

## Phase 4: Public Storefront, Routing & i18n
- [x] T010 Add `src/locales/en/tournaments.json`, `src/locales/vi/tournaments.json`, update `src/lib/i18n.ts`, `common.json`, `Navbar.tsx`, `Footer.tsx`, and register `/tournaments`, `/tournaments/:slug`, `/tournaments/:slug/:subView` in `src/App.tsx`
- [x] T011 Implement `src/pages/TournamentsPage.tsx` and `src/components/tournaments/*` (Smart Tournament Switcher, Data-driven Preparation States, Overview & Podium, Symmetrical 2-Wing Live Bracket & Standings, Schedule & Court/Team Filters, Direct `/rules` page with `ShareButton`, Officials, Team Roster Slide-over Drawer, and Captain Registration + VietQR Modal)

## Phase 5: Documentation & Verification Gates
- [x] T012 Update `./ARCHITECTURE.md` and `specs/005-admin-modern-analytics-hub/contracts/admin-ui-contract.md` (note replacement of Tournaments placeholder)
- [x] T013 Run `npx tsc --noEmit` (0 errors) and `npm run build` (clean production bundle)
- [x] T014 Commit cleanly on branch `feat/tournaments-module`
