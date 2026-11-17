# Implementation Plan: DVA Tournaments & Leagues Module

**Branch**: `feat/tournaments-module` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

---

## 1. Architectural Strategy

1. **Database & Shared Engine (`prisma/schema.prisma`, `src/shared/tournaments.ts`, `lib/prisma.ts`)**:
   - Add 6 enums and 5 additive models (`Tournament`, `TournamentTeam`, `TournamentPlayer`, `TournamentMatch`, `TournamentOfficial`).
   - Place deterministic Standings Engine (BO3/BO2, safe Set/Point Ratio, Head-to-Head, Manual Override), Bracket Seeding/Propagation rules, and 1-Day 20-Match 2-Court Schedule Template generator in `src/shared/tournaments.ts` so both backend (`server.ts`) and frontend previews share a single source of truth.
   - Add DTO mappers in `lib/prisma.ts` with explicit `includePrivate` flag so public endpoints strip PII (`captainPhone`, `captainEmail`, `official.phone`, `internalExpenseNote`, `transferContent`) when `!isStaff(req.user)`.

2. **Backend REST API, VietQR & Webhook (`server.ts`, `lib/security.ts`, `lib/schemas.ts`, `lib/mailer.ts`)**:
   - Declare public GET & captain registration/confirmation routes in `PUBLIC_RULES` (`lib/security.ts`).
   - Implement public routes:
     - `GET /api/tournaments` (supports `?summary=finance` for Admin Overview lightweight loading, filters `isActive: true` for public)
     - `GET /api/tournaments/:slugOrId` (full tournament details + computed standings + stripped PII for non-staff + dynamic Cache-Control headers based on `status`)
     - `POST /api/tournaments/:slugOrId/register` (transactional check against `maxTeams` of `PAID` teams, server-side `entryFeeAmount` snapshot, unaccented `transferContent`, VietQR URL, fire-and-forget bilingual captain email + admin alert)
     - `POST /api/tournaments/:slugOrId/teams/:teamId/confirm-payment` (marks `customerConfirmedAt` + notifies Admin)
   - Implement Admin CRUD & Live Operations routes:
     - Tournament CRUD + visibility toggle (`isActive`) + registration toggle (`isRegistrationOpen`) + mode-switch / paid-delete guards
     - Team CRUD + payment status toggle (`PAID`/`PENDING`/`CANCELLED`) + Import DVA Squad players + Manual Pool Rank Override
     - Player CRUD + Individual Awards (`MVP`, `BEST_SETTER`, `BEST_SPIKER`, `BEST_LIBERO`)
     - Match CRUD + `POST /api/tournaments/:id/generate-schedule` (20-match 2-court generator) + `POST /api/tournaments/:id/seed-knockout` (auto-seed QF1–QF4 from Pool A/B) + `PATCH /api/tournaments/:id/matches/:matchId/score` (set scores, live status, court swap, guarded downstream advance)
     - Official CRUD (`TournamentOfficial`)
   - Extend `POST /api/webhooks/payment` in `server.ts` to auto-reconcile `TournamentTeam` (`paymentStatus: 'PENDING'`) matching `transferContent` and `amount >= entryFeeAmount`.

3. **Admin Hub & Financial Sync (`src/pages/admin/`)**:
   - Extend `useAdminData.ts` (`tournamentsSummary` on mount + lazy-loaded full `TOURNAMENTS` scope via `loadedLazyScopesRef`) and `useAdminMetrics.ts` (Option A `tournamentRevenue` + `pendingTournamentFeesCount` + 6th monthly bucket).
   - Update `RevenueKpiCards.tsx`, `OverviewTab.tsx`, `RevenueTrendChart.tsx`, `constants.ts` (remove `'SOON'` status badge on `TOURNAMENTS`, add pending fee badge), and `AdminQuickSearch.tsx`.
   - Build modular `TournamentsTab.tsx` + subcomponents (`src/pages/admin/components/tournaments/*`):
     - Tournament Form Modal (`HOSTED` vs `PARTICIPATING` + `FULL_BRACKET` vs `DVA_FOCUS`, `prizeConfig` builder, `rulesContent`, `entryFeePerTeam`)
     - Teams & Fees Panel (Verify VietQR `PAID`/`PENDING`, roster management, import from DVA Squad, award badges)
     - Courtside Live Score & Bracket Control Panel (`+1 / -1` stepper buttons, Lock Set, Complete Match, 1-tap `Court 1 <-> Court 2` switch, Seed QF, Generate 20 Matches)
     - Officials Panel (`TournamentOfficial` CRUD)

4. **Public Storefront (`src/pages/TournamentsPage.tsx`, `src/components/tournaments/*`, `src/App.tsx`, `Navbar.tsx`, `Footer.tsx`)**:
   - Register routes `/tournaments`, `/tournaments/:slug`, `/tournaments/:slug/:subView` in `App.tsx`.
   - Implement Smart Tournament Resolver (`ONGOING` -> nearest `UPCOMING` -> most recent `COMPLETED`) + persistent Top Tournament Switcher.
   - Implement sub-views with Data-driven Preparation States:
     - **Overview & Podium** (Hero banner, Countdown, Registration Progress bar + Captain Register CTA, Flexible Prize cards, Podium 1st-2nd-3rd & Individual Awards when completed/populated, `DVA_FOCUS` journey layout when `trackingMode === 'DVA_FOCUS'`)
     - **Live Bracket & Standings** (Pool A & B standings tables + symmetrical 2-wing Knockout SVG/Flex tree converging on Central Trophy)
     - **Match Schedule & Results** (`All Courts | Court 1 | Court 2` + Team filter, live indicators, set score chips)
     - **Rules & Regulations** (Direct shareable `/tournaments/:slug/rules` with `ShareButton.tsx`)
     - **Officials & Referees** (Referee cards with Cloudinary `optimizeCloudinaryUrl`)
   - **Team Roster Slide-over Drawer**: Click any team name/logo anywhere to inspect rank, `/players/:level` DVA link, 7–10 player roster with award badges, and match journey.
   - **Captain Registration & VietQR Modal**: Unified team + roster form -> MB Bank VietQR checkout -> 1-click transfer confirmation + background status polling.

---

## 2. File Change Map

```text
prisma/schema.prisma                               # 6 enums + 5 Tournament models
lib/prisma.ts                                      # DTO mappers + PII stripping
lib/schemas.ts                                     # Validation schemas for Tournament module
lib/security.ts                                    # PUBLIC_RULES additions (read + register + confirm-payment)
lib/mailer.ts                                      # Bilingual Tournament Registration & VietQR email
server.ts                                          # Tournament APIs, rate limits, webhook reconciliation
src/shared/tournaments.ts                          # Standings engine, tie-breaker, bracket & 20-match generator
src/types/index.ts                                 # TypeScript interfaces for Tournaments
src/utils/cloudinary.ts                            # Add 'tournaments' to CloudinaryModule
src/services/api.ts                                # tournamentService + SWR caching + deduplicatedPost
src/locales/en/common.json & tournaments.json      # English i18n dictionary (default)
src/locales/vi/common.json & tournaments.json      # Vietnamese i18n dictionary
src/components/layout/Navbar.tsx & Footer.tsx      # Navigation links for /tournaments
src/App.tsx                                        # Lazy route registration (/tournaments/*)
src/pages/TournamentsPage.tsx                      # Public Tournaments Hub
src/components/tournaments/*                       # Switcher, Bracket, Standings, Schedule, Rules, Officials, RosterDrawer, CaptainRegisterModal
src/pages/admin/hooks/useAdminData.ts              # Finance summary + lazy Tournament scope
src/pages/admin/hooks/useAdminMetrics.ts           # Option A tournamentRevenue & monthly bucketing
src/pages/admin/components/overview/*              # RevenueKpiCards (2x4 preserved) + RevenueTrendChart (6th series)
src/pages/admin/tabs/OverviewTab.tsx               # 6th row in Service Revenue Share
src/pages/admin/tabs/TournamentsTab.tsx            # Full Admin Tournaments workspace
src/pages/admin/components/tournaments/*           # Admin modals, courtside live scorer, team/official panels
src/pages/admin/constants.ts & AdminQuickSearch.tsx# Remove SOON status, add quick search & pending badge
ARCHITECTURE.md                                    # Document completed Tournaments module
```
