# Implementation Plan: DVA Tournaments & Leagues Module

**Branch**: `feat/tournaments-module` | **Date**: 2026-11-17 (Updated 2026-11-19) | **Spec**: [spec.md](./spec.md)

---

## 1. Architectural Strategy

1. **Database & Shared Engine (`prisma/schema.prisma`, `src/shared/tournaments.ts`, `server/utils/standings.engine.ts`, `server/config/prisma.ts`)**:
   - Add 6 enums and 5 additive models (`Tournament`, `TournamentTeam`, `TournamentPlayer`, `TournamentMatch`, `TournamentOfficial`) pushed to Supabase PostgreSQL via `npx prisma db push`.
   - Place deterministic Standings Engine (`BO3`, `BO2`, `BO1_25`, safe Set/Point Ratio, Head-to-Head, Manual Override), Bracket Seeding/Propagation rules, `DREAM_TEAM_SLOTS`, `buildGroupStage12MatchPlan()`, and 1-Day 20-Match 2-Court Schedule Template (`buildStandard20MatchPlan()`, `normalizeTournamentCourtName()`) in `src/shared/tournaments.ts` + `server/utils/standings.engine.ts`.
   - Add DTO mappers in `server/config/prisma.ts` with explicit `includePrivate` flag so public endpoints strip PII (`captainPhone`, `captainEmail`, `official.phone`, `internalExpenseNote`, `transferContent`, `birthYear`, `rejectionReason`) when `!isStaff(req.user)`.

2. **Backend REST API, VietQR & Webhook (`server/modules/tournaments/*`, `server/middlewares/auth.middleware.ts`, `server/utils/schemas.ts`, `server/utils/email.service.ts`)**:
   - Declare public GET & captain registration/confirmation routes in `PUBLIC_RULES` and read-only access in `ADMIN_ALLOWED_RULES` (`server/middlewares/auth.middleware.ts`); enforce `requireSuperAdmin` on `/api/admin/tournaments/finance-summary` and all write routes.
   - Implement public routes:
     - `GET /api/tournaments` & `GET /api/tournaments/:slugOrId` (with `appCache` TTL caching, `applyPublicCacheHeaders`, PII stripping, and `isActive` filtering for non-staff)
     - `POST /api/tournaments/:slugOrId/register` (transactional check against `maxTeams` of `PAID` teams, server-side `entryFeeAmount` snapshot, unaccented `transferContent`, VietQR URL, fire-and-forget bilingual captain email + admin alert)
     - `POST /api/tournaments/:slugOrId/teams/:teamId/confirm-payment` (marks `customerConfirmedAt` + notifies Admin)
   - Implement Admin CRUD & Live Operations routes (`requireSuperAdmin`):
     - Tournament CRUD + visibility toggle (`isActive`) + registration toggle (`isRegistrationOpen`) + roster lock (`isRosterLocked`) + mode-switch / paid-delete guards
     - Team CRUD + payment status toggle + Verify Roster + Import DVA Squad players + Manual Pool Rank Override
     - Player CRUD + `PUT /api/tournaments/:id/dream-team` (8-slot FIVB Dream Team)
     - Match CRUD (`matchCode` & `matchOrder` editable) + `POST /api/admin/tournaments/:id/generate-schedule` + split seeding (`seed-quarterfinals` / `seed-knockout`, `seed-semifinals`, `seed-finals`) + `PATCH /api/tournaments/:id/matches/:matchId/score` (set scores, live status, court swap, guarded downstream advance)
     - Official CRUD (`TournamentOfficial`)
   - Extend `POST /api/webhooks/payment` (`server/modules/bookings/*`) to auto-reconcile `TournamentTeam` (`paymentStatus: 'PENDING'`) matching `transferContent` and `amount >= entryFeeAmount`.

3. **Admin Hub & Financial Sync (`src/pages/admin/`)**:
   - Extend `useAdminData.ts` (`tournamentsSummary` via `/api/admin/tournaments/finance-summary` + lazy-loaded full `TOURNAMENTS` scope) and `useAdminMetrics.ts` (Option A `tournamentRevenue` + `pendingTournamentFeesCount` + 6th monthly bucket).
   - Update `RevenueKpiCards.tsx`, `OverviewTab.tsx`, `RevenueTrendChart.tsx`, `constants.ts` (remove `'SOON'` badge, add pending fee badge), and `AdminQuickSearch.tsx`.
   - Build modular `TournamentsTab.tsx` + subcomponents (`src/pages/admin/components/tournaments/*`):
     - `TournamentFormModal` (`HOSTED` vs `PARTICIPATING`, `FULL_BRACKET` vs `DVA_FOCUS`, `BO3` / `BO2` / `BO1_25`, `prizeConfig` builder, `rulesContent`, `entryFeePerTeam`)
     - `TeamsFeesPanel` (Verify VietQR `PAID`/`PENDING`, roster verification, import from DVA Squad)
     - `CourtsideMatchesPanel` (`+1 / -1` stepper buttons, Lock Set, Complete Match, `Court A <-> Court B` switch, `matchCode`/`matchOrder` editing, split QF/SF/Finals seeding, Generate 12-match Group Stage)
     - `OfficialsPanel` (`TournamentOfficial` CRUD) & `DreamTeamAwardsPanel` (8 FIVB awards)

4. **Public Storefront, Routing & Mobile Responsive Polish (`src/pages/TournamentsPage.tsx`, `src/components/tournaments/*`, `src/index.css`, `src/App.tsx`, `Navbar.tsx`, `Footer.tsx`)**:
   - Register routes `/tournaments`, `/tournaments/:slug`, `/tournaments/:slug/:subView` in `App.tsx`.
   - Implement Smart Tournament Resolver (`ONGOING` -> nearest `UPCOMING` -> most recent `COMPLETED`) + persistent Top Tournament Switcher (`<select>` constrained within `overflow-hidden` header + gradient fade mask + CSS `::picker-icon` suppression in `src/index.css`).
   - Implement sub-views with Data-driven Preparation States & mobile-safe responsive layouts (`MatchScoreboardRow.tsx`, `PoolStandingsTable.tsx`, `OfficialAvatar.tsx`, upgraded `TournamentRulesAndOfficialsView.tsx`, 2-col mobile tabs/filters, 1-line `Court A/B` headers, bottom outcome pill strip `< 640px`).
   - **Team Roster Slide-over Drawer**: Click any team name/logo anywhere to inspect rank, `/players/:level` DVA link, 7–10 player roster with award badges, and match journey.
   - **Captain Registration & VietQR Modal**: Unified team + roster form -> MB Bank VietQR checkout -> 1-click transfer confirmation + background status polling.

---

## 2. File Change Map

```text
prisma/schema.prisma                               # 6 enums + 5 Tournament models
server/config/prisma.ts                            # DTO mappers + PII stripping (lib/prisma.ts shim)
server/utils/schemas.ts                            # Validation schemas for Tournament module (lib/schemas.ts shim)
server/middlewares/auth.middleware.ts              # PUBLIC_RULES & ADMIN_ALLOWED_RULES (lib/security.ts shim)
server/utils/email.service.ts                      # Bilingual Tournament Registration & VietQR email (lib/mailer.ts shim)
server/modules/tournaments/*                       # Tournament routes & service (server.ts shim)
server/utils/standings.engine.ts                   # Server standings & bracket seeding helpers
src/shared/tournaments.ts                          # Standings engine (BO3/BO2/BO1_25), tie-breaker, Dream Team & schedule plans
src/types/index.ts                                 # TypeScript interfaces for Tournaments
src/utils/cloudinary.ts                            # Add 'tournaments' to CloudinaryModule
src/services/api.ts                                # tournamentService + SWR caching + deduplicatedPost
src/index.css                                      # select.appearance-none::picker-icon suppression & no-scrollbar
src/locales/en/common.json & tournaments.json      # English i18n dictionary (default)
src/locales/vi/common.json & tournaments.json      # Vietnamese i18n dictionary
src/components/layout/Navbar.tsx & Footer.tsx      # Navigation links for /tournaments
src/App.tsx                                        # Lazy route registration (/tournaments/*)
src/pages/TournamentsPage.tsx                      # Public Tournaments Hub (mobile-responsive header & switcher)
src/components/tournaments/*                       # Overview, Bracket, StandingsTable, Schedule, MatchScoreboardRow, Rules&Officials, OfficialAvatar, RosterDrawer, CaptainRegisterModal
src/pages/admin/hooks/useAdminData.ts              # Finance summary + lazy Tournament scope
src/pages/admin/hooks/useAdminMetrics.ts           # Option A tournamentRevenue & monthly bucketing
src/pages/admin/components/overview/*              # RevenueKpiCards (2x4 preserved) + RevenueTrendChart (6th series)
src/pages/admin/tabs/OverviewTab.tsx               # 6th row in Service Revenue Share
src/pages/admin/tabs/TournamentsTab.tsx            # Full Admin Tournaments workspace
src/pages/admin/components/tournaments/*           # TournamentFormModal, TeamsFeesPanel, CourtsideMatchesPanel, OfficialsPanel, DreamTeamAwardsPanel
src/pages/admin/constants.ts & AdminQuickSearch.tsx# Remove SOON status, add quick search & pending badge
ARCHITECTURE.md                                    # Document completed & updated Tournaments module
```
