# Feature Specification: USAV Skill Levels Guide & System-Wide `skillRank` Integration

**Feature ID**: `010-usav-skill-levels`  
**Created**: 2026-11-24  
**Status**: Implemented & Verified  

## 1. Overview
Adds an international **USAV Skill Level Classification** subpage under the `Information` module (`/information/skill-levels`), integrates `skillRank` (`C`, `B`, `BB`, `A`, `AA`, `OPEN`, or `null` / `UNRANKED`) across public `Players`, `Roster Squad`, `Tryout Applications`, `Training & Scrimmage`, and `Court Map / Venues`.

## 2. Database (`prisma/schema.prisma` — Additive-Only)
- `Player`: `skillRank String?` (`"C" | "B" | "BB" | "A" | "AA" | "OPEN" | null`).
- `MemberApplication`: `skillRank String?` (persisted on evaluation/review and synced to `Player.skillRank` upon `APPROVED`).
- `TrainingCourse`: `skillRankLabel String?` (recommended USAV range, e.g., `"C – B"`, `"B – BB"`, `"BB+"`, `"A+"`).
- `VenueSessionSlot`: `skillRankLabel String?` (recommended USAV range per Court Map session).
- Synchronized via `npx prisma db push && npx prisma generate`.

## 3. Backend API
- **Players (`server/modules/players/*`)**: `POST/PUT/PATCH /api/players` validate `SKILL_RANKS`, allow clearing back to `null`, serialize in `toPlayerDto`, and invalidate `['players', 'home']`.
- **Tryouts (`server/modules/tryouts/*`)**: `evaluateApplication`, `sendTryoutEmail` (`RESULT`), `updateTryoutApplication`, and `updateApplicationStatus` persist `skillRank`, copy it to newly promoted `Player` records, and sync updates to already-approved `Player` records.
- **Training & Venues (`server/modules/bookings/*`, `server/modules/venues/*`)**: Persist and clear `skillRankLabel` on courses (`SUPERADMIN`) and venue sessions (`SUPERADMIN` & `CAPTAIN` on own club).

## 4. Public UI
- **`/information/skill-levels` (`src/pages/SkillLevelsPage.tsx`)**:
  - Single-language `CONTENT.vi` / `CONTENT.en` (defaults to `🇻🇳 Tiếng Việt` on mount; top-right Segmented Pill + live Navbar `languageChanged` sync).
  - Direct official USAV citation links (`2026-usa-volleyball-open-national-championship` & `2026-Adult-Opens-Championship-Manual-FINAL.pdf`).
  - 6 tiers (`C → OPEN`) + **USAV ↔ DVA Squad Equivalence** (`Youth: C – B`, `Junior: B – BB`, `Senior: BB – A / AA`) linking directly to `/register?level=YOUTH|JUNIOR|SENIOR` (prefilled via `useSearchParams` in `MemberRegisterPage`).
- **Public `Players` (`src/pages/PlayersPage.tsx`)**: Clickable tier-colored rank badges (`RANK: BB`, etc., or `UNRANKED`) + 1-tap USAV rank filter chips (`All Ranks | C | B | BB | A | AA | OPEN | Unranked`).
- **Scrimmage & Court Map (`TrainingPage.tsx`, `CourtMapPage.tsx`, `CourtClubDetailPage.tsx`)**: Clickable `🇺🇸 USAV: ...` badges linking to `/information/skill-levels`.

## 5. Admin & Captain Workspaces
- **`Roster Squad` (`PlayersTab.tsx`, `PlayerFormModal.tsx`)**: Inline 1-tap rank selector (`PATCH`), modal rank picker, and USAV rank filter chips with live counts.
- **`Tryout Applications` (`EvaluationScorecardModal.tsx`, `ApplicationsTab.tsx`)**: USAV rank chip selector right inside the evaluation scorecard (auto-synced to `Player` on `APPROVED`) and rank badge in the applications table.
- **`Training` & `Court Map` (`CourseFormModal.tsx`, `VenuesTab.tsx`)**: Recommended USAV rank picker for courses and sessions (including 1-tap session dropdown, Captain recruitment post generator, and live preview).

## 6. Verification
- `npx prisma db push && npx prisma generate`
- `npx tsc --noEmit` (0 errors)
- `npm run build` succeeds cleanly.
