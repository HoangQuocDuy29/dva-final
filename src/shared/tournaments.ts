import type {
  DreamTeamSlotKey,
  Tournament,
  TournamentDreamTeamSelection,
  TournamentIndividualAward,
  TournamentMatch,
  TournamentMatchStage,
  TournamentPrizeMode,
  TournamentPrizeTier,
  TournamentSetFormat,
  TournamentSetScore,
  TournamentStandingRow,
  TournamentTeam,
  VolleyballPosition,
} from '../types';

export interface DreamTeamSlotMeta {
  slotKey: DreamTeamSlotKey;
  awardCode: TournamentIndividualAward;
  label: string;
  shortLabel: string;
  suggestedPosition: VolleyballPosition | 'ALL';
  pairedSlot?: DreamTeamSlotKey;
  isMvp?: boolean;
}

export const DREAM_TEAM_SLOTS: readonly DreamTeamSlotMeta[] = [
  {
    slotKey: 'MVP',
    awardCode: 'MVP',
    label: 'Most Valuable Player (MVP)',
    shortLabel: 'MVP',
    suggestedPosition: 'ALL',
    isMvp: true,
  },
  {
    slotKey: 'BEST_OH_1',
    awardCode: 'BEST_OUTSIDE_HITTER',
    label: 'Best Outside Hitter #1',
    shortLabel: 'Best OH #1',
    suggestedPosition: 'OH',
    pairedSlot: 'BEST_OH_2',
  },
  {
    slotKey: 'BEST_OH_2',
    awardCode: 'BEST_OUTSIDE_HITTER',
    label: 'Best Outside Hitter #2',
    shortLabel: 'Best OH #2',
    suggestedPosition: 'OH',
    pairedSlot: 'BEST_OH_1',
  },
  {
    slotKey: 'BEST_MB_1',
    awardCode: 'BEST_MIDDLE_BLOCKER',
    label: 'Best Middle Blocker #1',
    shortLabel: 'Best MB #1',
    suggestedPosition: 'MB',
    pairedSlot: 'BEST_MB_2',
  },
  {
    slotKey: 'BEST_MB_2',
    awardCode: 'BEST_MIDDLE_BLOCKER',
    label: 'Best Middle Blocker #2',
    shortLabel: 'Best MB #2',
    suggestedPosition: 'MB',
    pairedSlot: 'BEST_MB_1',
  },
  {
    slotKey: 'BEST_OP',
    awardCode: 'BEST_OPPOSITE',
    label: 'Best Opposite Spiker',
    shortLabel: 'Best Opposite',
    suggestedPosition: 'OP',
  },
  {
    slotKey: 'BEST_SETTER',
    awardCode: 'BEST_SETTER',
    label: 'Best Setter',
    shortLabel: 'Best Setter',
    suggestedPosition: 'S',
  },
  {
    slotKey: 'BEST_LIBERO',
    awardCode: 'BEST_LIBERO',
    label: 'Best Libero',
    shortLabel: 'Best Libero',
    suggestedPosition: 'L',
  },
] as const;

export const DREAM_TEAM_AWARD_CODES = new Set<string>(
  DREAM_TEAM_SLOTS.map((s) => s.awardCode)
);

/** Derive initial 8-slot Dream Team selection from podiumOverride.dreamTeam, falling back to player.awards. */
export function resolveDreamTeamSelection(
  dreamTeam?: TournamentDreamTeamSelection | null,
  players: Array<{ id: string; awards: string[] }> = []
): TournamentDreamTeamSelection {
  const base: TournamentDreamTeamSelection = {
    MVP: dreamTeam?.MVP ?? null,
    BEST_OH_1: dreamTeam?.BEST_OH_1 ?? null,
    BEST_OH_2: dreamTeam?.BEST_OH_2 ?? null,
    BEST_MB_1: dreamTeam?.BEST_MB_1 ?? null,
    BEST_MB_2: dreamTeam?.BEST_MB_2 ?? null,
    BEST_OP: dreamTeam?.BEST_OP ?? null,
    BEST_SETTER: dreamTeam?.BEST_SETTER ?? null,
    BEST_LIBERO: dreamTeam?.BEST_LIBERO ?? null,
  };

  if (Object.values(base).some(Boolean)) {
    return base;
  }

  const pickByAward = (code: string, excludeId?: string | null): string | null =>
    players.find((p) => p.id !== excludeId && Array.isArray(p.awards) && p.awards.includes(code))?.id ?? null;

  base.MVP = pickByAward('MVP');
  base.BEST_OH_1 = pickByAward('BEST_OUTSIDE_HITTER');
  base.BEST_OH_2 = pickByAward('BEST_OUTSIDE_HITTER', base.BEST_OH_1);
  base.BEST_MB_1 = pickByAward('BEST_MIDDLE_BLOCKER');
  base.BEST_MB_2 = pickByAward('BEST_MIDDLE_BLOCKER', base.BEST_MB_1);
  base.BEST_OP = pickByAward('BEST_OPPOSITE');
  base.BEST_SETTER = pickByAward('BEST_SETTER');
  base.BEST_LIBERO = pickByAward('BEST_LIBERO');
  return base;
}

/**
 * Determine whether a tournament's prize configuration uses Cash + Trophies or Honors Only.
 * Defaults to HONOR_ONLY when empty or when all cash amounts are 0 without explicit cash opt-in.
 */
export function resolveTournamentPrizeMode(
  prizeConfig?: TournamentPrizeTier[] | null
): TournamentPrizeMode {
  if (!Array.isArray(prizeConfig) || prizeConfig.length === 0) {
    return 'HONOR_ONLY';
  }
  if (prizeConfig.some((p) => (Number(p?.cashAmount) || 0) > 0)) {
    return 'CASH_AND_TROPHIES';
  }
  if (prizeConfig.some((p) => p?.prizeMode === 'CASH_AND_TROPHIES')) {
    return 'CASH_AND_TROPHIES';
  }
  return 'HONOR_ONLY';
}

/** Sum cash payouts across prize tiers (strictly display-only; never included in club revenue). */
export function computeTotalCashPrize(prizeConfig?: TournamentPrizeTier[] | null): number {
  if (!Array.isArray(prizeConfig)) return 0;
  return prizeConfig.reduce((sum, p) => {
    if (p?.prizeMode === 'HONOR_ONLY') return sum;
    return sum + Math.max(0, Number(p?.cashAmount) || 0);
  }, 0);
}

/** Convert tournament title into clean URL slug. */
export function slugifyTournamentName(name: string): string {
  return (
    (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'tournament'
  );
}

/** Local YYYY-MM-DD date helper avoiding UTC off-by-one shifts. */
export function getTodayLocalYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convert YYYY-MM-DD to DD/MM/YYYY cleanly without UTC timezone shifts. */
export function formatYmdToDdMmYyyy(dateStr?: string | null): string {
  if (!dateStr) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr.trim();
}

/**
 * Format Tournament Date & Time Range:
 * - Single-day (`startDate === endDate` or omitted): `DD/MM/YYYY · 07:30 – 19:00` (or `DD/MM/YYYY · 07:30`)
 * - Multi-day (`startDate !== endDate`): `DD/MM/YYYY (07:30) – DD/MM/YYYY (19:00)`
 */
export function formatTournamentScheduleDisplay(params: {
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}): string {
  const start = formatYmdToDdMmYyyy(params.startDate);
  const cleanEnd = params.endDate?.trim() || '';
  const isSingleDay = !cleanEnd || cleanEnd === params.startDate.trim();
  const sTime = params.startTime?.trim() || '';
  const eTime = params.endTime?.trim() || '';

  if (isSingleDay) {
    if (sTime && eTime) return `${start} · ${sTime} – ${eTime}`;
    if (sTime) return `${start} · ${sTime}`;
    if (eTime) return `${start} · – ${eTime}`;
    return start;
  }

  const end = formatYmdToDdMmYyyy(cleanEnd);
  const left = sTime ? `${start} (${sTime})` : start;
  const right = eTime ? `${end} (${eTime})` : end;
  return `${left} – ${right}`;
}

/**
 * Smart Default Tournament Resolver:
 * 1. ONGOING (earliest startDate first; HOSTED prioritized on tie)
 * 2. Nearest UPCOMING (startDate >= todayLocal ASC, fallback latest UPCOMING)
 * 3. Most recent COMPLETED (startDate DESC)
 */
export function resolveDefaultTournament<T extends Pick<Tournament, 'status' | 'isActive' | 'startDate' | 'mode'>>(
  list: T[]
): T | null {
  const visible = list.filter((t) => t.isActive !== false && t.status !== 'CANCELLED');
  if (visible.length === 0) return null;

  const ongoing = visible
    .filter((t) => t.status === 'ONGOING')
    .sort((a, b) => {
      if (a.mode !== b.mode) return a.mode === 'HOSTED' ? -1 : 1;
      return a.startDate.localeCompare(b.startDate);
    });
  if (ongoing.length > 0) return ongoing[0];

  const today = getTodayLocalYmd();
  const upcomingFuture = visible
    .filter((t) => t.status === 'UPCOMING' && t.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (upcomingFuture.length > 0) return upcomingFuture[0];

  const upcomingAny = visible
    .filter((t) => t.status === 'UPCOMING')
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (upcomingAny.length > 0) return upcomingAny[0];

  const completed = visible
    .filter((t) => t.status === 'COMPLETED')
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (completed.length > 0) return completed[0];

  return visible[0];
}

/** Normalize raw JSON setScores array into typed TournamentSetScore[]. */
export function normalizeSetScores(raw: unknown): TournamentSetScore[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      const setNum = Math.max(1, Math.min(5, Math.round(Number(obj.set) || idx + 1)));
      const home = Math.max(0, Math.min(99, Math.round(Number(obj.home) || 0)));
      const away = Math.max(0, Math.min(99, Math.round(Number(obj.away) || 0)));
      const isCompleted = Boolean(obj.isCompleted);
      return { set: setNum, home, away, isCompleted };
    })
    .filter((s): s is TournamentSetScore => s !== null)
    .sort((a, b) => a.set - b.set);
}

/**
 * Compute match sets won, total points, and winnerTeamId from setScores.
 * Only sets marked `isCompleted === true` count toward `homeSetsWon` / `awaySetsWon`.
 */
export function computeSetTotals(
  rawScores: unknown,
  setFormat: TournamentSetFormat | string,
  homeTeamId?: string | null,
  awayTeamId?: string | null,
  matchStatus?: string
): {
  setScores: TournamentSetScore[];
  homeSetsWon: number;
  awaySetsWon: number;
  homePointsTotal: number;
  awayPointsTotal: number;
  winnerSide: 'HOME' | 'AWAY' | null;
  winnerTeamId: string | null;
} {
  const setScores = normalizeSetScores(rawScores);
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  let homePointsTotal = 0;
  let awayPointsTotal = 0;

  for (const s of setScores) {
    homePointsTotal += s.home;
    awayPointsTotal += s.away;
    if (s.isCompleted && s.home !== s.away) {
      if (s.home > s.away) homeSetsWon += 1;
      else awaySetsWon += 1;
    }
  }

  let winnerSide: 'HOME' | 'AWAY' | null = null;
  const format = String(setFormat || 'BO3').toUpperCase();
  if (format === 'BO2') {
    if (homeSetsWon === 2 && awaySetsWon === 0) winnerSide = 'HOME';
    else if (awaySetsWon === 2 && homeSetsWon === 0) winnerSide = 'AWAY';
    else if (matchStatus === 'COMPLETED' && homeSetsWon !== awaySetsWon) {
      winnerSide = homeSetsWon > awaySetsWon ? 'HOME' : 'AWAY';
    }
  } else {
    if (homeSetsWon >= 2 && homeSetsWon > awaySetsWon) winnerSide = 'HOME';
    else if (awaySetsWon >= 2 && awaySetsWon > homeSetsWon) winnerSide = 'AWAY';
    else if (matchStatus === 'COMPLETED' && homeSetsWon !== awaySetsWon) {
      winnerSide = homeSetsWon > awaySetsWon ? 'HOME' : 'AWAY';
    }
  }

  const winnerTeamId =
    winnerSide === 'HOME'
      ? homeTeamId ?? null
      : winnerSide === 'AWAY'
      ? awayTeamId ?? null
      : null;

  return {
    setScores,
    homeSetsWon,
    awaySetsWon,
    homePointsTotal,
    awayPointsTotal,
    winnerSide,
    winnerTeamId,
  };
}

/** Safe ratio comparison avoiding Infinity/NaN & float drift via cross-multiplication. */
function compareRatiosDesc(aNum: number, aDen: number, bNum: number, bDen: number): number {
  const aEmpty = aNum === 0 && aDen === 0;
  const bEmpty = bNum === 0 && bDen === 0;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (aDen === 0 && bDen === 0) return bNum - aNum;
  if (aDen === 0) return -1; // A has undefeated ratio -> ahead
  if (bDen === 0) return 1;

  return bNum * aDen - aNum * bDen;
}

function safeRatioValue(num: number, den: number): number {
  if (den === 0) return num > 0 ? 999.99 : 0;
  return Math.round((num / den) * 1000) / 1000;
}

/**
 * Compute live Pool Standings (Pool A or Pool B).
 * Confirmed tie-breaker order:
 *   1. Wins (W) DESC
 *   2. FIVB Points DESC (BO3: 2-0=3, 2-1=2, 1-2=1, 0-2=0 | BO2: 2-0=3, 1-1=1 each, 0-2=0)
 *   3. Set Ratio (Sets Won / Sets Lost) DESC
 *   4. Point Ratio (Points For / Points Against) DESC
 *   5. Head-to-Head result between tied teams
 *   6. seedOrder ASC
 * Supports optional `manualRankOverride` for coin-toss / organizer resolution.
 */
export function computePoolStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
  pool: 'A' | 'B'
): TournamentStandingRow[] {
  const poolTeams = teams.filter(
    (t) =>
      String(t.pool || '').toUpperCase() === pool &&
      t.paymentStatus !== 'CANCELLED'
  );
  if (poolTeams.length === 0) return [];

  const stageTarget: TournamentMatchStage = pool === 'A' ? 'POOL_A' : 'POOL_B';
  const completedPoolMatches = matches.filter(
    (m) => m.status === 'COMPLETED' && (m.stage === stageTarget || m.stage === 'GROUP')
  );

  const statsMap = new Map<string, TournamentStandingRow>();
  const h2hWins = new Map<string, number>(); // key `${winnerId}:${loserId}` -> count

  for (const t of poolTeams) {
    statsMap.set(t.id, {
      rank: 0,
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName,
      logoUrl: t.logoUrl || undefined,
      isDvaTeam: t.isDvaTeam,
      pool,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      fivbPoints: 0,
      setsWon: 0,
      setsLost: 0,
      setRatio: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointRatio: 0,
      manualRankOverride: t.manualRankOverride ?? null,
      hasTieWarning: false,
    });
  }

  for (const m of completedPoolMatches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const home = statsMap.get(m.homeTeamId);
    const away = statsMap.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    home.setsWon += m.homeSetsWon;
    home.setsLost += m.awaySetsWon;
    away.setsWon += m.awaySetsWon;
    away.setsLost += m.homeSetsWon;

    home.pointsFor += m.homePointsTotal;
    home.pointsAgainst += m.awayPointsTotal;
    away.pointsFor += m.awayPointsTotal;
    away.pointsAgainst += m.homePointsTotal;

    const format = String(m.setFormat || 'BO3').toUpperCase();
    const isDraw =
      format === 'BO2' && m.homeSetsWon === m.awaySetsWon && !m.winnerTeamId;

    if (isDraw) {
      home.draws += 1;
      away.draws += 1;
      home.fivbPoints += 1;
      away.fivbPoints += 1;
    } else {
      const homeWon =
        m.winnerTeamId === home.teamId ||
        (!m.winnerTeamId && m.homeSetsWon > m.awaySetsWon);
      if (homeWon) {
        home.wins += 1;
        away.losses += 1;
        if (format === 'BO2') {
          home.fivbPoints += 3;
        } else {
          const isSweep = m.awaySetsWon === 0;
          home.fivbPoints += isSweep ? 3 : 2;
          away.fivbPoints += isSweep ? 0 : 1;
        }
        h2hWins.set(`${home.teamId}:${away.teamId}`, (h2hWins.get(`${home.teamId}:${away.teamId}`) || 0) + 1);
      } else {
        away.wins += 1;
        home.losses += 1;
        if (format === 'BO2') {
          away.fivbPoints += 3;
        } else {
          const isSweep = m.homeSetsWon === 0;
          away.fivbPoints += isSweep ? 3 : 2;
          home.fivbPoints += isSweep ? 0 : 1;
        }
        h2hWins.set(`${away.teamId}:${home.teamId}`, (h2hWins.get(`${away.teamId}:${home.teamId}`) || 0) + 1);
      }
    }
  }

  const seedById = new Map(poolTeams.map((t) => [t.id, t.seedOrder]));
  const rows = Array.from(statsMap.values()).map((r) => ({
    ...r,
    setRatio: safeRatioValue(r.setsWon, r.setsLost),
    pointRatio: safeRatioValue(r.pointsFor, r.pointsAgainst),
  }));

  // Natural athletic sort
  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.fivbPoints !== a.fivbPoints) return b.fivbPoints - a.fivbPoints;

    const setCmp = compareRatiosDesc(a.setsWon, a.setsLost, b.setsWon, b.setsLost);
    if (setCmp !== 0) return setCmp;

    const ptCmp = compareRatiosDesc(a.pointsFor, a.pointsAgainst, b.pointsFor, b.pointsAgainst);
    if (ptCmp !== 0) return ptCmp;

    const aBeatB = h2hWins.get(`${a.teamId}:${b.teamId}`) || 0;
    const bBeatA = h2hWins.get(`${b.teamId}:${a.teamId}`) || 0;
    if (aBeatB !== bBeatA) return bBeatA - aBeatB;

    return (seedById.get(a.teamId) ?? 0) - (seedById.get(b.teamId) ?? 0);
  });

  // Flag exact statistical ties (after matches played) so Admin sees when H2H / manual tiebreak matters
  for (let i = 0; i < rows.length - 1; i++) {
    const cur = rows[i];
    const nxt = rows[i + 1];
    if (
      cur.played > 0 &&
      nxt.played > 0 &&
      cur.wins === nxt.wins &&
      cur.fivbPoints === nxt.fivbPoints &&
      compareRatiosDesc(cur.setsWon, cur.setsLost, nxt.setsWon, nxt.setsLost) === 0 &&
      compareRatiosDesc(cur.pointsFor, cur.pointsAgainst, nxt.pointsFor, nxt.pointsAgainst) === 0
    ) {
      cur.hasTieWarning = true;
      nxt.hasTieWarning = true;
    }
  }

  // Apply manualRankOverride if Admin pinned specific ranks
  const hasAnyManual = rows.some((r) => r.manualRankOverride !== null && r.manualRankOverride !== undefined);
  let ordered = rows;
  if (hasAnyManual) {
    const result: (TournamentStandingRow | null)[] = new Array(rows.length).fill(null);
    const unpinned: TournamentStandingRow[] = [];

    for (const r of rows) {
      const targetIdx =
        r.manualRankOverride !== null && r.manualRankOverride !== undefined
          ? r.manualRankOverride - 1
          : -1;
      if (targetIdx >= 0 && targetIdx < result.length && !result[targetIdx]) {
        result[targetIdx] = r;
      } else {
        unpinned.push(r);
      }
    }

    let uIdx = 0;
    for (let i = 0; i < result.length; i++) {
      if (!result[i]) {
        result[i] = unpinned[uIdx++];
      }
    }
    ordered = result.filter((r): r is TournamentStandingRow => r !== null);
  }

  return ordered.map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }));
}

export interface GeneratedMatchTemplate {
  matchCode: string;
  stage: TournamentMatchStage;
  bracketSide: 'LEFT' | 'RIGHT' | 'CENTER' | null;
  courtName: string;
  scheduledTime: string;
  matchOrder: number;
  setFormat: TournamentSetFormat;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string;
  awayLabel: string;
}

/**
 * Generates the balanced 20-match 1-day schedule across 2 parallel courts:
 * - Pool A (6 matches) & Pool B (6 matches) interleaved so every team rests between matches
 * - QF1 (1A vs 4B), QF3 (3A vs 2B) -> Left Wing -> SF1
 * - QF2 (2A vs 3B), QF4 (4A vs 1B) -> Right Wing -> SF2
 * - 3RD (Loser SF1 vs Loser SF2) & FINAL (Winner SF1 vs Winner SF2) -> Center
 */
export function buildStandard20MatchPlan(
  poolATeams: TournamentTeam[],
  poolBTeams: TournamentTeam[],
  groupSetFormat: TournamentSetFormat = 'BO3',
  knockoutSetFormat: TournamentSetFormat = 'BO3'
): GeneratedMatchTemplate[] {
  const a = [...poolATeams].sort((x, y) => x.seedOrder - y.seedOrder);
  const b = [...poolBTeams].sort((x, y) => x.seedOrder - y.seedOrder);

  const labelOrSeed = (arr: TournamentTeam[], idx: number, prefix: string) =>
    arr[idx]?.name || `${prefix}${idx + 1}`;
  const idOrNull = (arr: TournamentTeam[], idx: number) => arr[idx]?.id ?? null;

  const matches: GeneratedMatchTemplate[] = [
    // Round 1 Pool A (08:00)
    {
      matchCode: 'PA-1',
      stage: 'POOL_A',
      bracketSide: null,
      courtName: 'Court A',
      scheduledTime: '08:00',
      matchOrder: 1,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(a, 0),
      awayTeamId: idOrNull(a, 3),
      homeLabel: labelOrSeed(a, 0, 'A'),
      awayLabel: labelOrSeed(a, 3, 'A'),
    },
    {
      matchCode: 'PA-2',
      stage: 'POOL_A',
      bracketSide: null,
      courtName: 'Court B',
      scheduledTime: '08:00',
      matchOrder: 2,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(a, 1),
      awayTeamId: idOrNull(a, 2),
      homeLabel: labelOrSeed(a, 1, 'A'),
      awayLabel: labelOrSeed(a, 2, 'A'),
    },
    // Round 1 Pool B (08:50)
    {
      matchCode: 'PB-1',
      stage: 'POOL_B',
      bracketSide: null,
      courtName: 'Court A',
      scheduledTime: '08:50',
      matchOrder: 3,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(b, 0),
      awayTeamId: idOrNull(b, 3),
      homeLabel: labelOrSeed(b, 0, 'B'),
      awayLabel: labelOrSeed(b, 3, 'B'),
    },
    {
      matchCode: 'PB-2',
      stage: 'POOL_B',
      bracketSide: null,
      courtName: 'Court B',
      scheduledTime: '08:50',
      matchOrder: 4,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(b, 1),
      awayTeamId: idOrNull(b, 2),
      homeLabel: labelOrSeed(b, 1, 'B'),
      awayLabel: labelOrSeed(b, 2, 'B'),
    },
    // Round 2 Pool A (09:40)
    {
      matchCode: 'PA-3',
      stage: 'POOL_A',
      bracketSide: null,
      courtName: 'Court A',
      scheduledTime: '09:40',
      matchOrder: 5,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(a, 0),
      awayTeamId: idOrNull(a, 2),
      homeLabel: labelOrSeed(a, 0, 'A'),
      awayLabel: labelOrSeed(a, 2, 'A'),
    },
    {
      matchCode: 'PA-4',
      stage: 'POOL_A',
      bracketSide: null,
      courtName: 'Court B',
      scheduledTime: '09:40',
      matchOrder: 6,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(a, 1),
      awayTeamId: idOrNull(a, 3),
      homeLabel: labelOrSeed(a, 1, 'A'),
      awayLabel: labelOrSeed(a, 3, 'A'),
    },
    // Round 2 Pool B (10:30)
    {
      matchCode: 'PB-3',
      stage: 'POOL_B',
      bracketSide: null,
      courtName: 'Court A',
      scheduledTime: '10:30',
      matchOrder: 7,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(b, 0),
      awayTeamId: idOrNull(b, 2),
      homeLabel: labelOrSeed(b, 0, 'B'),
      awayLabel: labelOrSeed(b, 2, 'B'),
    },
    {
      matchCode: 'PB-4',
      stage: 'POOL_B',
      bracketSide: null,
      courtName: 'Court B',
      scheduledTime: '10:30',
      matchOrder: 8,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(b, 1),
      awayTeamId: idOrNull(b, 3),
      homeLabel: labelOrSeed(b, 1, 'B'),
      awayLabel: labelOrSeed(b, 3, 'B'),
    },
    // Round 3 Pool A (11:20)
    {
      matchCode: 'PA-5',
      stage: 'POOL_A',
      bracketSide: null,
      courtName: 'Court A',
      scheduledTime: '11:20',
      matchOrder: 9,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(a, 0),
      awayTeamId: idOrNull(a, 1),
      homeLabel: labelOrSeed(a, 0, 'A'),
      awayLabel: labelOrSeed(a, 1, 'A'),
    },
    {
      matchCode: 'PA-6',
      stage: 'POOL_A',
      bracketSide: null,
      courtName: 'Court B',
      scheduledTime: '11:20',
      matchOrder: 10,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(a, 2),
      awayTeamId: idOrNull(a, 3),
      homeLabel: labelOrSeed(a, 2, 'A'),
      awayLabel: labelOrSeed(a, 3, 'A'),
    },
    // Round 3 Pool B (12:10)
    {
      matchCode: 'PB-5',
      stage: 'POOL_B',
      bracketSide: null,
      courtName: 'Court A',
      scheduledTime: '12:10',
      matchOrder: 11,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(b, 0),
      awayTeamId: idOrNull(b, 1),
      homeLabel: labelOrSeed(b, 0, 'B'),
      awayLabel: labelOrSeed(b, 1, 'B'),
    },
    {
      matchCode: 'PB-6',
      stage: 'POOL_B',
      bracketSide: null,
      courtName: 'Court B',
      scheduledTime: '12:10',
      matchOrder: 12,
      setFormat: groupSetFormat,
      homeTeamId: idOrNull(b, 2),
      awayTeamId: idOrNull(b, 3),
      homeLabel: labelOrSeed(b, 2, 'B'),
      awayLabel: labelOrSeed(b, 3, 'B'),
    },
    // Quarterfinals (Afternoon)
    {
      matchCode: 'QF1',
      stage: 'QUARTERFINAL',
      bracketSide: 'LEFT',
      courtName: 'Court A',
      scheduledTime: '14:00',
      matchOrder: 13,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: '1st Pool A',
      awayLabel: '4th Pool B',
    },
    {
      matchCode: 'QF3',
      stage: 'QUARTERFINAL',
      bracketSide: 'LEFT',
      courtName: 'Court B',
      scheduledTime: '14:00',
      matchOrder: 14,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: '3rd Pool A',
      awayLabel: '2nd Pool B',
    },
    {
      matchCode: 'QF2',
      stage: 'QUARTERFINAL',
      bracketSide: 'RIGHT',
      courtName: 'Court A',
      scheduledTime: '15:00',
      matchOrder: 15,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: '2nd Pool A',
      awayLabel: '3rd Pool B',
    },
    {
      matchCode: 'QF4',
      stage: 'QUARTERFINAL',
      bracketSide: 'RIGHT',
      courtName: 'Court B',
      scheduledTime: '15:00',
      matchOrder: 16,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: '4th Pool A',
      awayLabel: '1st Pool B',
    },
    // Semifinals
    {
      matchCode: 'SF1',
      stage: 'SEMIFINAL',
      bracketSide: 'LEFT',
      courtName: 'Court A',
      scheduledTime: '16:15',
      matchOrder: 17,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: 'Winner QF1',
      awayLabel: 'Winner QF3',
    },
    {
      matchCode: 'SF2',
      stage: 'SEMIFINAL',
      bracketSide: 'RIGHT',
      courtName: 'Court B',
      scheduledTime: '16:15',
      matchOrder: 18,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: 'Winner QF2',
      awayLabel: 'Winner QF4',
    },
    // 3rd Place & Final
    {
      matchCode: '3RD',
      stage: 'THIRD_PLACE',
      bracketSide: 'CENTER',
      courtName: 'Court B',
      scheduledTime: '17:30',
      matchOrder: 19,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: 'Loser SF1',
      awayLabel: 'Loser SF2',
    },
    {
      matchCode: 'FINAL',
      stage: 'FINAL',
      bracketSide: 'CENTER',
      courtName: 'Court A',
      scheduledTime: '18:30',
      matchOrder: 20,
      setFormat: knockoutSetFormat,
      homeTeamId: null,
      awayTeamId: null,
      homeLabel: 'Winner SF1',
      awayLabel: 'Winner SF2',
    },
  ];

  return matches;
}

/** Return the lowest unused integer jersey number in [1..99] (falling back to 0 if all 1..99 are taken). */
export function getNextAvailableJerseyNumber(used: Array<number | string>): number {
  const taken = new Set(
    used
      .map((u) => {
        if (typeof u === 'number') return u;
        const trimmed = String(u ?? '').trim();
        return trimmed === '' ? NaN : Number(trimmed);
      })
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 99)
  );
  for (let n = 1; n <= 99; n++) {
    if (!taken.has(n)) return n;
  }
  return taken.has(0) ? 1 : 0;
}

/** Return the set of jersey numbers (0..99) appearing more than once within the same team roster. */
export function findDuplicateJerseyNumbers(jerseys: Array<number | string>): Set<number> {
  const counts = new Map<number, number>();
  for (const raw of jerseys) {
    const trimmed = typeof raw === 'string' ? raw.trim() : String(raw ?? '');
    if (trimmed === '') continue;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 0 || n > 99) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  const dups = new Set<number>();
  for (const [n, count] of counts.entries()) {
    if (count > 1) dups.add(n);
  }
  return dups;
}

/**
 * Suggest a 3–4 character uppercase team short code (monogram) from a team name.
 * - Multi-word names use word initials (e.g. "Hanoi Spikers Club" -> "HSC").
 * - Single-word names use the first 3 letters (e.g. "Phoenix" -> "PHO").
 * Vietnamese diacritics are stripped (e.g. "Đà Nẵng Volley" -> "DNV").
 */
export function suggestTeamShortName(name: string): string {
  const normalized = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim();
  if (!normalized) return '';
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 4);
  }
  return words[0].slice(0, 3);
}

export type MatchStageFilterKey = 'ALL' | 'POOL' | 'QUARTERFINAL' | 'SEMIFINAL' | 'FINALS';

export function isPoolStage(stage: string): boolean {
  return stage === 'POOL_A' || stage === 'POOL_B' || stage === 'GROUP';
}

export function isKnockoutStage(stage: string): boolean {
  return (
    stage === 'QUARTERFINAL' ||
    stage === 'SEMIFINAL' ||
    stage === 'THIRD_PLACE' ||
    stage === 'FINAL'
  );
}

export function matchesStageFilter(
  stage: TournamentMatchStage | string,
  filter: MatchStageFilterKey
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'POOL') return isPoolStage(stage);
  if (filter === 'QUARTERFINAL') return stage === 'QUARTERFINAL';
  if (filter === 'SEMIFINAL') return stage === 'SEMIFINAL';
  if (filter === 'FINALS') return stage === 'THIRD_PLACE' || stage === 'FINAL';
  return true;
}

export interface QuarterfinalSeedingPair {
  matchCode: 'QF1' | 'QF2' | 'QF3' | 'QF4';
  home: TournamentStandingRow;
  away: TournamentStandingRow;
}

/**
 * Compute standard 8-team cross-pool Quarterfinal pairings from live Pool A & B standings:
 * QF1: 1A vs 4B | QF3: 3A vs 2B (Left Wing -> SF1)
 * QF2: 2A vs 3B | QF4: 4A vs 1B (Right Wing -> SF2)
 */
export function computeCrossPoolQuarterfinalPairings(
  teams: TournamentTeam[],
  matches: TournamentMatch[]
): {
  standingsA: TournamentStandingRow[];
  standingsB: TournamentStandingRow[];
  pairings: QuarterfinalSeedingPair[];
} | null {
  const standingsA = computePoolStandings(teams, matches, 'A');
  const standingsB = computePoolStandings(teams, matches, 'B');
  if (standingsA.length < 4 || standingsB.length < 4) return null;

  return {
    standingsA,
    standingsB,
    pairings: [
      { matchCode: 'QF1', home: standingsA[0], away: standingsB[3] },
      { matchCode: 'QF3', home: standingsA[2], away: standingsB[1] },
      { matchCode: 'QF2', home: standingsA[1], away: standingsB[2] },
      { matchCode: 'QF4', home: standingsA[3], away: standingsB[0] },
    ],
  };
}

/**
 * Resolve tournament Podium teams (1st, 2nd, 3rd, 4th) using stored `finalRank`
 * with automatic fallback to completed `FINAL` and `3RD` matches.
 */
export function resolveTournamentPodiumTeams(
  teams: TournamentTeam[],
  matches: TournamentMatch[]
): {
  first: TournamentTeam | null;
  second: TournamentTeam | null;
  third: TournamentTeam | null;
  fourth: TournamentTeam | null;
} {
  const teamMap = new Map(teams.map((tm) => [tm.id, tm]));
  let first = teams.find((tm) => tm.finalRank === 1) || null;
  let second = teams.find((tm) => tm.finalRank === 2) || null;
  let third = teams.find((tm) => tm.finalRank === 3) || null;
  let fourth = teams.find((tm) => tm.finalRank === 4) || null;

  const finalMatch = matches.find(
    (m) => (m.matchCode === 'FINAL' || m.stage === 'FINAL') && m.status === 'COMPLETED' && m.winnerTeamId
  );
  if (finalMatch?.winnerTeamId) {
    if (!first) first = teamMap.get(finalMatch.winnerTeamId) || null;
    if (!second && finalMatch.homeTeamId && finalMatch.awayTeamId) {
      const loserId =
        finalMatch.winnerTeamId === finalMatch.homeTeamId
          ? finalMatch.awayTeamId
          : finalMatch.homeTeamId;
      second = teamMap.get(loserId) || null;
    }
  }

  const thirdMatch = matches.find(
    (m) =>
      (m.matchCode === '3RD' || m.stage === 'THIRD_PLACE') &&
      m.status === 'COMPLETED' &&
      m.winnerTeamId
  );
  if (thirdMatch?.winnerTeamId) {
    if (!third) third = teamMap.get(thirdMatch.winnerTeamId) || null;
    if (!fourth && thirdMatch.homeTeamId && thirdMatch.awayTeamId) {
      const loserId =
        thirdMatch.winnerTeamId === thirdMatch.homeTeamId
          ? thirdMatch.awayTeamId
          : thirdMatch.homeTeamId;
      fourth = teamMap.get(loserId) || null;
    }
  }

  return { first, second, third, fourth };
}

/**
 * Normalize legacy `"Court 1"` / `"Court 2"` court labels to `"Court A"` / `"Court B"`.
 */
export function normalizeTournamentCourtName(
  raw?: string | null
): 'Court A' | 'Court B' | string {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed === 'Court 1') return 'Court A';
  if (trimmed === 'Court 2') return 'Court B';
  return trimmed;
}

export type TournamentCourtFilter = 'ALL' | 'Court A' | 'Court B';

export function matchesTournamentCourtFilter(
  courtName: string | null | undefined,
  filter: TournamentCourtFilter
): boolean {
  if (filter === 'ALL') return true;
  return normalizeTournamentCourtName(courtName) === filter;
}
