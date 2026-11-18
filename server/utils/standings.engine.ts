import {
  DREAM_TEAM_AWARD_CODES,
  DREAM_TEAM_SLOTS,
  buildGroupStage12MatchPlan,
  computeCrossPoolQuarterfinalPairings,
  computePoolStandings,
  computeSetTotals,
  getSetTargetPoints,
  isVolleyballSetWon,
  normalizeSetScores,
  normalizeTournamentCourtName,
  resolveTournamentPodiumTeams,
  slugifyTournamentName,
} from '../../src/shared/tournaments';
import type { TournamentMatch, TournamentTeam } from '../../src/types';

export {
  DREAM_TEAM_AWARD_CODES,
  DREAM_TEAM_SLOTS,
  buildGroupStage12MatchPlan,
  computeCrossPoolQuarterfinalPairings,
  computePoolStandings,
  computeSetTotals,
  getSetTargetPoints,
  isVolleyballSetWon,
  normalizeSetScores,
  normalizeTournamentCourtName,
  resolveTournamentPodiumTeams,
  slugifyTournamentName,
};

export interface BracketSlotPlan {
  matchCode: string;
  stage: 'QUARTERFINAL' | 'SEMIFINAL' | 'THIRD_PLACE' | 'FINAL';
  bracketSide: 'LEFT' | 'RIGHT' | 'CENTER';
  courtName: 'Court A' | 'Court B';
  scheduledTime: string;
  matchOrder: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string;
  awayLabel: string;
}

/** Pure function: build QF1–QF4 slot plan from Pool A & Pool B FIVB standings. */
export function buildQuarterfinalSlotPlans(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
  rawMatchesForOrder: Array<{ stage: string; matchOrder?: number | null }>
): {
  slots: BracketSlotPlan[];
  insufficientPools: boolean;
  poolACount: number;
  poolBCount: number;
} {
  const poolA = computePoolStandings(teams, matches, 'A');
  const poolB = computePoolStandings(teams, matches, 'B');
  const plan = computeCrossPoolQuarterfinalPairings(teams, matches);

  if (!plan) {
    return {
      slots: [],
      insufficientPools: true,
      poolACount: poolA.length,
      poolBCount: poolB.length,
    };
  }

  const maxPoolOrder = Math.max(
    12,
    ...rawMatchesForOrder
      .filter((m) => m.stage === 'POOL_A' || m.stage === 'POOL_B' || m.stage === 'GROUP')
      .map((m) => Number(m.matchOrder) || 0)
  );

  const metaByCode: Record<
    'QF1' | 'QF2' | 'QF3' | 'QF4',
    { bracketSide: 'LEFT' | 'RIGHT'; courtName: 'Court A' | 'Court B'; scheduledTime: string; orderOffset: number }
  > = {
    QF1: { bracketSide: 'LEFT', courtName: 'Court A', scheduledTime: '14:00', orderOffset: 1 },
    QF3: { bracketSide: 'LEFT', courtName: 'Court B', scheduledTime: '14:00', orderOffset: 2 },
    QF2: { bracketSide: 'RIGHT', courtName: 'Court A', scheduledTime: '15:00', orderOffset: 3 },
    QF4: { bracketSide: 'RIGHT', courtName: 'Court B', scheduledTime: '15:00', orderOffset: 4 },
  };

  const slots: BracketSlotPlan[] = plan.pairings.map((p) => {
    const meta = metaByCode[p.matchCode];
    return {
      matchCode: p.matchCode,
      stage: 'QUARTERFINAL',
      bracketSide: meta.bracketSide,
      courtName: meta.courtName,
      scheduledTime: meta.scheduledTime,
      matchOrder: maxPoolOrder + meta.orderOffset,
      homeTeamId: p.home.teamId,
      awayTeamId: p.away.teamId,
      homeLabel: p.home.teamName,
      awayLabel: p.away.teamName,
    };
  });

  return {
    slots,
    insufficientPools: false,
    poolACount: poolA.length,
    poolBCount: poolB.length,
  };
}

/** Pure function: build SF1–SF2 slot plans from completed QF1–QF4 matches. */
export function buildSemifinalSlotPlans<T extends { id: string; name: string }>(
  teams: T[],
  matches: Array<{
    matchCode?: string | null;
    stage: string;
    status: string;
    winnerTeamId?: string | null;
    matchOrder?: number | null;
  }>
): { slots: BracketSlotPlan[]; pendingSources: string[] } {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const findByCode = (code: string) =>
    matches.find((m) => String(m.matchCode || '').toUpperCase() === code.toUpperCase());

  const pendingSources: string[] = [];
  const getQfWinner = (code: string) => {
    const m = findByCode(code);
    if (m && m.status === 'COMPLETED' && m.winnerTeamId) {
      const tm = teamMap.get(m.winnerTeamId);
      if (tm) return tm;
    }
    pendingSources.push(code);
    return null;
  };

  const wQf1 = getQfWinner('QF1');
  const wQf3 = getQfWinner('QF3');
  const wQf2 = getQfWinner('QF2');
  const wQf4 = getQfWinner('QF4');

  const maxQfOrder = Math.max(
    16,
    ...matches
      .filter((m) => m.stage === 'QUARTERFINAL')
      .map((m) => Number(m.matchOrder) || 0)
  );

  const slots: BracketSlotPlan[] = [
    {
      matchCode: 'SF1',
      stage: 'SEMIFINAL',
      bracketSide: 'LEFT',
      courtName: 'Court A',
      scheduledTime: '16:15',
      matchOrder: maxQfOrder + 1,
      homeTeamId: wQf1?.id ?? null,
      awayTeamId: wQf3?.id ?? null,
      homeLabel: wQf1?.name ?? 'Winner QF1',
      awayLabel: wQf3?.name ?? 'Winner QF3',
    },
    {
      matchCode: 'SF2',
      stage: 'SEMIFINAL',
      bracketSide: 'RIGHT',
      courtName: 'Court B',
      scheduledTime: '16:15',
      matchOrder: maxQfOrder + 2,
      homeTeamId: wQf2?.id ?? null,
      awayTeamId: wQf4?.id ?? null,
      homeLabel: wQf2?.name ?? 'Winner QF2',
      awayLabel: wQf4?.name ?? 'Winner QF4',
    },
  ];

  return { slots, pendingSources };
}

/** Pure function: build 3RD and FINAL slot plans from completed SF1–SF2 matches. */
export function buildFinalsSlotPlans<T extends { id: string; name: string }>(
  teams: T[],
  matches: Array<{
    matchCode?: string | null;
    stage: string;
    status: string;
    winnerTeamId?: string | null;
    homeTeamId?: string | null;
    awayTeamId?: string | null;
    matchOrder?: number | null;
  }>
): { slots: BracketSlotPlan[]; pendingSources: string[] } {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const findByCode = (code: string) =>
    matches.find((m) => String(m.matchCode || '').toUpperCase() === code.toUpperCase());

  const pendingSources: string[] = [];
  const getSfOutcome = (code: string) => {
    const m = findByCode(code);
    if (m && m.status === 'COMPLETED' && m.winnerTeamId) {
      const winner = teamMap.get(m.winnerTeamId) || null;
      const loserId =
        m.homeTeamId && m.awayTeamId
          ? m.winnerTeamId === m.homeTeamId
            ? m.awayTeamId
            : m.homeTeamId
          : null;
      const loser = loserId ? teamMap.get(loserId) || null : null;
      if (winner) return { winner, loser };
    }
    pendingSources.push(code);
    return { winner: null, loser: null };
  };

  const sf1 = getSfOutcome('SF1');
  const sf2 = getSfOutcome('SF2');

  const maxSfOrder = Math.max(
    18,
    ...matches
      .filter((m) => m.stage === 'SEMIFINAL')
      .map((m) => Number(m.matchOrder) || 0)
  );

  const slots: BracketSlotPlan[] = [
    {
      matchCode: '3RD',
      stage: 'THIRD_PLACE',
      bracketSide: 'CENTER',
      courtName: 'Court B',
      scheduledTime: '17:30',
      matchOrder: maxSfOrder + 1,
      homeTeamId: sf1.loser?.id ?? null,
      awayTeamId: sf2.loser?.id ?? null,
      homeLabel: sf1.loser?.name ?? 'Loser SF1',
      awayLabel: sf2.loser?.name ?? 'Loser SF2',
    },
    {
      matchCode: 'FINAL',
      stage: 'FINAL',
      bracketSide: 'CENTER',
      courtName: 'Court A',
      scheduledTime: '18:30',
      matchOrder: maxSfOrder + 2,
      homeTeamId: sf1.winner?.id ?? null,
      awayTeamId: sf2.winner?.id ?? null,
      homeLabel: sf1.winner?.name ?? 'Winner SF1',
      awayLabel: sf2.winner?.name ?? 'Winner SF2',
    },
  ];

  return { slots, pendingSources };
}
