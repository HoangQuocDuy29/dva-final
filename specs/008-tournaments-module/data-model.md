# Data Model: DVA Tournaments & Leagues Module

**Feature**: `008-tournaments-module` | **Database**: Neon PostgreSQL (Additive-Only via `npx prisma db push`)

---

## 1. Entity Relationship Overview

```text
Tournament (1) ──< (N) TournamentTeam (1) ──< (N) TournamentPlayer
    │                      │
    │                      ├──< TournamentMatch (homeTeamId / awayTeamId / winnerTeamId)
    │
    ├──< (N) TournamentMatch >── (0..1) TournamentOfficial (officialId)
    └──< (N) TournamentOfficial
```

---

## 2. Models & Key Constraints

1. **`Tournament` (`tournaments`)**:
   - `mode`: `HOSTED` | `PARTICIPATING` (`PARTICIPATING` forces `entryFeePerTeam = 0` and excludes all teams from revenue analytics).
   - `trackingMode`: `FULL_BRACKET` | `DVA_FOCUS` (`DVA_FOCUS` disables Pool A/B & 8-team bracket placeholders on public UI).
   - `status`: `UPCOMING` | `ONGOING` | `COMPLETED` | `CANCELLED`.
   - `startDate`, `endDate`, `startTime`, `endTime`: `YYYY-MM-DD` dates and `HH:mm` times (supports 1-day morning-to-evening or multi-day ranges).
   - `isActive`: Soft visibility flag (`false` hides unfinished drafts from `/tournaments`).
   - `isRegistrationOpen`, `isRosterLocked`, `requireBirthYear`, `maxTeams` (default `8`), `registrationDeadline`.
   - `groupSetFormat` & `knockoutSetFormat`: `"BO3"` | `"BO2"`.
   - `prizeConfig` (Json): Flexible array `[{ rank, label, cashAmount?, nonCashReward?, prizeMode? }]` (`prizeMode`: `'HONOR_ONLY' | 'CASH_AND_TROPHIES'`, display-only awards for both `HOSTED` and `PARTICIPATING`).
   - `podiumOverride` (Json): Optional podium override (`firstName`/`secondName`/`thirdName`), 8-slot FIVB `dreamTeam` (`MVP`, `BEST_OH_1`, `BEST_OH_2`, `BEST_MB_1`, `BEST_MB_2`, `BEST_OP`, `BEST_SETTER`, `BEST_LIBERO`), and legacy `awards` summary.
   - `internalExpenseNote`: Admin-only text field (stripped from public DTOs).

2. **`TournamentTeam` (`tournament_teams`)**:
   - `pool`: `"A"` | `"B"` | `null`.
   - `isDvaTeam` + `dvaSquadLevel` (`SENIOR` | `JUNIOR` | `YOUTH`): Links Roster Drawer directly to `/players/:level`.
   - `paymentStatus` (`PENDING` | `PAID` | `CANCELLED`), `entryFeeAmount` (immutable fee snapshot), `paidAt` (monthly chart bucket timestamp), `transferContent` (`@unique` nullable VietQR memo), `customerConfirmedAt`.
   - `captainPhone` & `captainEmail`: Stripped from public DTOs.

3. **`TournamentPlayer` (`tournament_players`)**:
   - Denormalized `tournamentId` for single-query awardee retrieval across the tournament.
   - Soft `linkedPlayerId` (no strict FK constraint to `players.id` so historical tournament rosters remain intact if club squad changes).
   - `birthYear` (`Int?`), `eligibilityStatus` (`PENDING_CHECK` | `VERIFIED` | `FLAGGED` | `REJECTED`), `rejectionReason` (`String?`): `birthYear` and `rejectionReason` are stripped from all public DTOs (`includePrivate = false`), and `REJECTED` players are hidden publicly.
   - `awards` (`String[]`): e.g., `["MVP"]`, `["BEST_SETTER"]`, `["BEST_SPIKER"]`, `["BEST_LIBERO"]`.

4. **`TournamentMatch` (`tournament_matches`)**:
   - `homeTeamId` & `awayTeamId` nullable (supports pre-draw `1st Pool A vs 4th Pool B` placeholders via `homeLabel`/`awayLabel`, and ad-hoc opponent names in `DVA_FOCUS`).
   - `setScores` (Json): `[{ set: number, home: number, away: number, isCompleted: boolean }]` so in-progress live sets do not increment `homeSetsWon`/`awaySetsWon` prematurely.
   - `winnerTeamId` nullable (supports `1-1` draws in `BO2` group matches).

5. **`TournamentOfficial` (`tournament_officials`)**:
   - `role`: `MAIN_REFEREE` | `LINE_JUDGE` | `SCORER` | `SUPERVISOR`.
   - `phone`: Stripped from public DTOs.
