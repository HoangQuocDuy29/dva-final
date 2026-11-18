# Feature Specification: DVA Tournaments & Leagues Management Module

**Feature Branch**: `feat/tournaments-module`  
**Base Commit**: `8529372` (`main`)  
**Created**: 2026-11-17  
**Last Amended**: 2026-11-19  
**Status**: Implemented & Extended  
**Input**: Comprehensive Spec-Driven specification for DVA Volleyball Club Tournaments Module (Database, Backend API, Financial Analytics Sync, Admin Hub, Public Storefront & Captain Registration + VietQR).

---

## 1. Executive Summary & Purpose

Build the end-to-end **Tournaments & Leagues Hub** for DVA Volleyball Club covering:
1. **Two Competition Modes (`HOSTED` vs. `PARTICIPATING`)** with strict financial isolation (`PARTICIPATING` tournaments never contribute prize money or entry fees to club revenue).
2. **Standard 1-Day 8-Team Tournament Format** across two parallel courts (`Court A` & `Court B`, normalized via `normalizeTournamentCourtName()`): 2 pools (`Pool A` & `Pool B`, 12 round-robin matches via `buildGroupStage12MatchPlan()` / 20 full-day plan via `buildStandard20MatchPlan()`), Live Standings Engine (**`BO3`**, **`BO2`**, and **`BO1_25`** 1-set-to-25 format), and symmetrical 8-team Knockout bracket (`QF1–QF4` $\rightarrow$ `SF1–SF2` $\rightarrow$ `3rd Place` & `Final`).
3. **4-Phase Data-Driven Lifecycle & Preparation State** allowing `HOSTED` tournaments to open team captain registration with dynamic VietQR + MB Bank webhook reconciliation while sub-views (`/bracket`, `/schedule`, `/officials`) cleanly show preparation status until pool draws/matches are published, and preserving full historical archives of past `COMPLETED` tournaments via a persistent **Tournament Switcher**.
4. **Option A Financial Integration** into the Admin Overview 8-card (2×4) KPI grid (`useAdminMetrics.ts`, `OverviewTab.tsx`, `RevenueTrendChart.tsx`) plus dedicated KPI & management controls inside `TournamentsTab.tsx` (including `DreamTeamAwardsPanel.tsx` for 8 FIVB Dream Team awards).
5. **100% English-First Public UI & Mobile-Safe Responsive Layout** (`lng: 'en'` default, optional `vi` toggle via `src/locales/{en,vi}/tournaments.json`) adhering to DVA's Dark Athletic design tokens (`#0B0F19`, `#111827`, `#1E293B`, `#F97316`, `#FACC15`, `#38BDF8`, `#8B0000`).

---

## 2. Database Safety & Schema Invariant (Supabase PostgreSQL)

- **Additive-Only Changes**: Add enums (`TournamentMode`, `TournamentTrackingMode`, `TournamentStatus`, `MatchStage`, `MatchStatus`, `OfficialRole`) and 5 new models (`Tournament`, `TournamentTeam`, `TournamentPlayer`, `TournamentMatch`, `TournamentOfficial`) to `prisma/schema.prisma`. Zero modifications or drops to existing tables or rows.
- **Forbidden Commands**: NEVER execute `prisma migrate dev`, `prisma migrate reset`, `--force-reset`, or `--accept-data-loss`.
- **Sync Commands**: `npx prisma db push` followed by `npx prisma generate`.

---

## 3. User Scenarios & Testing

### User Story 1 - Public Tournament Explorer, Smart Switcher & Data-Driven Preparation State (Priority: P1)
As a player, team captain, or fan visiting `/tournaments`, I want the page to automatically load the most relevant tournament (`ONGOING` $\rightarrow$ nearest `UPCOMING` $\rightarrow$ most recent `COMPLETED`), allow me to switch to any historical or upcoming tournament via a persistent **Tournament Switcher**, and clearly see either preparation progress (when registration is open and draws aren't published yet) or full live standings, bracket, schedule, rules, and officials.

**Independent Test**:
- Visit `/tournaments` with 1 `UPCOMING` tournament (no pools/matches) and 1 `COMPLETED` tournament: defaults to `UPCOMING`, shows registration progress (`X / 8 Confirmed`) and Captain Registration CTA on Overview while `/bracket` & `/schedule` display the preparation state with links to `/rules`.
- Switch to the `COMPLETED` tournament via Switcher: URL navigates to `/tournaments/:oldSlug`, rendering full Podium (1st–3rd), Individual Awards, Pool Standings, Knockout Bracket, Match Results, and Team Roster Drawer.

### User Story 2 - Team Captain 1-Form Registration & VietQR Payment (Priority: P1)
As a visiting team captain registering for an open `HOSTED` tournament, I want to fill out one unified form with team info (name, abbreviation, optional logo, captain contact) and 7–10 players (jersey number, name, position, captain flag, optional height/reach), then receive an instant MB Bank VietQR payment screen calculated strictly from the server's `entryFeePerTeam`, with 1-click transfer confirmation and automatic webhook reconciliation.

**Independent Test**:
- Submit captain registration for an open `HOSTED` tournament (`maxTeams = 8`).
- Verify server creates `TournamentTeam` (`PENDING`) + `TournamentPlayer[]`, computes `entryFeeAmount` server-side from `tournament.entryFeePerTeam`, generates unique unaccented `transferContent`, returns VietQR URL, blocks over-capacity once `PAID` teams reach `maxTeams`, and auto-reconciles `PAID` via `/api/webhooks/payment` or Admin 1-click mark paid.

### User Story 3 - Live Standings Engine, Bracket Auto-Advance & Courtside Admin Ops (Priority: P1)
As a Club Admin running a 1-day 8-team tournament on 2 parallel courts, I want to generate the standard 20-match 2-court schedule in 1 click, update live scores using touch-friendly `+1 / -1` controls, separate set-lock from match completion, hot-swap `Court 1 <-> Court 2`, auto-calculate pool standings (`W -> FIVB Points -> Set Ratio -> Point Ratio -> Head-to-Head -> Manual Override`), and safely advance winners (`QF -> SF -> 3rd/Final`) without corrupting already-live/completed downstream matches.

**Independent Test**:
- Generate 20-match schedule for 8 pooled teams (`Pool A` & `Pool B`).
- Enter scores for all 12 pool matches (testing both BO3 and BO2 ties + zero-loss `Infinity` protection).
- Seed Quarterfinals from pool ranks, score `QF1..QF4` to `COMPLETED`, verify `SF1`/`SF2` populate automatically only while `SCHEDULED`, and complete `3rd Place` and `Final` to populate Podium rankings.

### User Story 4 - Team Roster Slide-over Drawer, Officials & Direct Rules Link (Priority: P2)
As a spectator or team captain, I want to click any team logo/name in standings, brackets, or schedules to open a Slide-over Drawer showing the team's rank, DVA squad link (`/players/:level` when `isDvaTeam`), 7–10 player roster with MVP/individual award badges, and full match history; view the Tournament Officials & Referees; and open/share `/tournaments/:slug/rules` directly in Zalo captain groups.

### User Story 5 - Option A Financial Sync on Admin Overview & Participating Mode Isolation (Priority: P1)
As a Club Executive, I want `HOSTED` tournament entry fees marked `PAID` to flow into `Total Revenue` (`verifiedClubRevenue`), `Pending Approvals` count, `Service Revenue Share` (6th row `#EC4899`), and `RevenueTrendChart` (6th series) without altering the balanced 8-card (2×4) KPI grid, while `PARTICIPATING` tournaments (`FULL_BRACKET` & `DVA_FOCUS`) stay 100% excluded from club revenue.

---

## 4. Functional Requirements

- **FR-001 (Database Models)**: Add `Tournament`, `TournamentTeam`, `TournamentPlayer`, `TournamentMatch`, `TournamentOfficial` and supporting enums to `prisma/schema.prisma` with composite indexes matching query prefixes.
- **FR-002 (Security & Default-Deny)**:
  - Expose only read endpoints (`GET /api/tournaments`, `GET /api/tournaments/:slugOrId`), public registration (`POST /api/tournaments/:slugOrId/register`), and payment confirmation (`POST /api/tournaments/:slugOrId/teams/:teamId/confirm-payment`) in `PUBLIC_RULES` inside `server/middlewares/auth.middleware.ts` (`lib/security.ts` shim), keeping `/api/admin/tournaments/finance-summary` and all write endpoints `SUPERADMIN`-only (`ADMIN` role has read-only access to `/tournaments*`).
  - Strip PII and private finance fields (`captainPhone`, `captainEmail`, `transferContent`, `entryFeeAmount`, `internalExpenseNote`, `official.phone`, `birthYear`, `rejectionReason`, and unapproved `PENDING` team entries from public team rosters) when `!isStaff(req.user)` (and financial/PII fields unless `SUPERADMIN`).
  - Apply `publicWriteLimiter` to public registration routes and `deduplicatedPost()` on client POST actions.
- **FR-003 (Financial Integration — Option A)**:
  - Compute `tournamentRevenue` strictly where `tournament.mode === 'HOSTED'` and `team.paymentStatus === 'PAID'`, summing `team.entryFeeAmount ?? tournament.entryFeePerTeam`, bucketed in `RevenueTrendChart` by `team.paidAt ?? team.createdAt`.
  - Preserve the exact 8 KPI cards (2×4 grid) in `RevenueKpiCards.tsx`; reflect `tournamentRevenue` inside `Total Revenue` subtitle/total, include `pendingTournamentTeamsCount` in `Pending Approvals`, add a 6th stream (`Tournament Fees`, `#EC4899`) to `Service Revenue Share` (`OverviewTab.tsx`) and `RevenueTrendChart.tsx`, and render 3 dedicated KPI cards at the top of `TournamentsTab.tsx`.
  - Guard historical revenue: disallow deleting `PAID` teams/tournaments (must cancel first) and disallow switching `mode` from `HOSTED` to `PARTICIPATING` when `PAID` teams exist.
- **FR-004 (Standings, Formats & Split Bracket Seeding)**:
  - Supported `TOURNAMENT_SET_FORMATS`: `BO3` (`2-0` = 3 pts, `2-1` = 2 pts, `1-2` = 1 pt, `0-2` = 0 pts), `BO2` (`2-0` = 3 pts, `1-1` = 1 pt each with `winnerTeamId = null`, `0-2` = 0 pts), and `BO1_25` (single set to 25+ pts with 2-point lead: win = 3 pts, loss = 0 pts).
  - Tie-breaker hierarchy: `Wins (W) -> FIVB Points -> Set Ratio (safe division) -> Point Ratio (safe division) -> Head-to-Head -> manualRankOverride / seedOrder`.
  - Split seeding endpoints: `seed-quarterfinals` (`seed-knockout` alias), `seed-semifinals`, and `seed-finals` (guarding `LIVE`/`COMPLETED` matches unless `forceOverride` is explicitly requested), plus `matchCode` / `matchOrder` editing.
  - Knockout pairings: Left Wing `QF1 (1A vs 4B)` & `QF3 (3A vs 2B)` $\rightarrow$ `SF1`; Right Wing `QF2 (2A vs 3B)` & `QF4 (4A vs 1B)` $\rightarrow$ `SF2`; Center `THIRD_PLACE` & `FINAL`.
- **FR-005 (Public Routing, Mobile Responsive UI & Cloudinary Optimization)**:
  - Routes in `App.tsx`: `/tournaments`, `/tournaments/:slug`, `/tournaments/:slug/:subView` (`bracket | schedule | rules | officials`) mapped to lazy `TournamentsPage`.
  - Mobile responsive invariants (`< 640px` in `TournamentsPage.tsx`, `MatchScoreboardRow.tsx`, `TournamentScheduleView.tsx`, `src/index.css`): constrain tournament `<select>` within `overflow-hidden` card (`w-full min-w-0 max-w-full truncate pr-9 sm:pr-10 box-border`) with gradient mask and CSS `::picker-icon` hiding; arrange mobile navigation tabs & stage filters in a 2-column grid; preserve single-line `Court A` / `Court B` badges via `whitespace-nowrap shrink-0`; move long advancement/medal outcome badges into a bottom pill strip (`flex sm:hidden`) beneath `[Logo 1] [Name 1] — [Score] — [Name 2] [Logo 2]` so team names never clip on 375px–390px viewports.
  - Add `'tournaments'` to `CloudinaryModule` (`src/utils/cloudinary.ts`), using `optimizeCloudinaryUrl(url, 96)` for bracket/standings logos, `'thumb'` (`w_160`) in Roster Drawer, and `'detail'` + `srcSet` for banners.
  - Conditional 15s live polling ONLY when `status === 'ONGOING'` and `document.visibilityState === 'visible'`.
- **FR-006 (Language & Navigation)**:
  - Public UI strictly 100% professional athletic English by default (`en` fallback) with `src/locales/{en,vi}/tournaments.json` and `nav.tournaments` in `Navbar.tsx` and `Footer.tsx`.

---

## 5. Measurable Success Criteria

- **SC-001**: `npx prisma db push` and `npx prisma generate` succeed cleanly without destructive changes.
- **SC-002**: `npx tsc --noEmit` exits with **0 TypeScript errors**.
- **SC-003**: `npm run build` produces clean client and server bundles (`dist/`).
- **SC-004**: `PARTICIPATING` tournaments contribute `0 đ` to `verifiedClubRevenue`, while `HOSTED` + `PAID` teams immediately increment `Total Revenue`, `Service Revenue Share`, and `RevenueTrendChart` without breaking the 2×4 Overview grid.
- **SC-005**: Unauthenticated requests to admin tournament endpoints return `401`, and public GET responses strip all PII (`captainPhone`, `captainEmail`, `official.phone`, `internalExpenseNote`).
