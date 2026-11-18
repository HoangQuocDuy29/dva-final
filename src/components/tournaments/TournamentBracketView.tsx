import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowRight,
  Construction,
  FileText,
  GitBranch,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { Tournament, TournamentMatch, TournamentTeam } from '../../types';
import { computePoolStandings, normalizeTournamentCourtName } from '../../shared/tournaments';
import { PoolStandingsTable } from './PoolStandingsTable';
import { TeamLogoBadge } from './TeamLogoBadge';

interface TournamentBracketViewProps {
  tournament: Tournament;
  onSelectTeam?: (team: TournamentTeam) => void;
  onOpenRegister?: () => void;
  blueprintMode?: boolean;
}

export const TournamentBracketView: React.FC<TournamentBracketViewProps> = ({
  tournament,
  onSelectTeam,
  onOpenRegister,
  blueprintMode = false,
}) => {
  const { t } = useTranslation('tournaments');

  const teamMap = useMemo(
    () => new Map(tournament.teams.map((tm) => [tm.id, tm])),
    [tournament.teams]
  );

  const standingsA = useMemo(
    () => computePoolStandings(tournament.teams, tournament.matches, 'A'),
    [tournament.teams, tournament.matches]
  );
  const standingsB = useMemo(
    () => computePoolStandings(tournament.teams, tournament.matches, 'B'),
    [tournament.teams, tournament.matches]
  );

  const isDataEmptyForFullBracket =
    tournament.trackingMode === 'FULL_BRACKET' &&
    standingsA.length === 0 &&
    standingsB.length === 0 &&
    tournament.matches.length === 0;

  if (!blueprintMode && isDataEmptyForFullBracket) {
    const canReg =
      tournament.mode === 'HOSTED' &&
      tournament.status === 'UPCOMING' &&
      tournament.isRegistrationOpen &&
      !tournament.isRosterLocked;
    return (
      <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-8 sm:p-12 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#F97316]/10 border border-[#F97316]/30 flex items-center justify-center mx-auto">
          <Construction className="w-7 h-7 text-[#F97316]" />
        </div>
        <div className="space-y-2 max-w-xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
            {t('prep.badge')}
          </span>
          <h3 className="font-heading font-black text-xl sm:text-2xl text-white">
            {t('prep.title')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{t('prep.desc')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to={`/tournaments/${tournament.slug}/rules`}
            className="px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-bold text-slate-200 inline-flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-[#38BDF8]" />
            <span>{t('prep.viewRules')}</span>
          </Link>
          {canReg && onOpenRegister && (
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('prep.registerNow')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const findMatch = (code: string) =>
    tournament.matches.find((m) => m.matchCode.toUpperCase() === code.toUpperCase());

  const renderStandingsTable = (title: string, rows: typeof standingsA) => (
    <PoolStandingsTable
      title={title}
      rows={rows}
      teamMap={teamMap}
      onSelectTeam={onSelectTeam}
    />
  );

  const renderBracketMatchCard = (
    m: TournamentMatch | undefined,
    fallbackTitle: string,
    fallbackHome: string,
    fallbackAway: string
  ) => {
    const homeTeam = m?.homeTeamId ? teamMap.get(m.homeTeamId) : null;
    const awayTeam = m?.awayTeamId ? teamMap.get(m.awayTeamId) : null;
    const homeName = homeTeam?.name || m?.homeLabel || fallbackHome;
    const awayName = awayTeam?.name || m?.awayLabel || fallbackAway;
    const isLive = m?.status === 'LIVE';
    const isCompleted = m?.status === 'COMPLETED';
    const isHomePlaceholder = !homeTeam;
    const isAwayPlaceholder = !awayTeam;

    return (
      <div
        className={`rounded-2xl bg-[#111827] border p-3.5 space-y-2 transition-all ${
          isLive
            ? 'border-red-500 shadow-lg shadow-red-950/30'
            : isCompleted
            ? 'border-emerald-800/60'
            : 'border-[#1E293B]'
        }`}
      >
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-mono font-black text-slate-400">{m?.matchCode || fallbackTitle}</span>
          <div className="flex items-center gap-1.5">
            {m?.courtName && (
              <span className="text-sky-400 font-semibold">
                {normalizeTournamentCourtName(m.courtName)}
              </span>
            )}
            {isLive && (
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black uppercase animate-pulse">
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Home Slot */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={!homeTeam || !onSelectTeam}
            onClick={() => homeTeam && onSelectTeam?.(homeTeam)}
            className={`flex items-center gap-2 min-w-0 flex-1 text-left ${
              homeTeam && onSelectTeam ? 'cursor-pointer hover:text-orange-400' : 'cursor-default'
            }`}
          >
            {homeTeam ? (
              <TeamLogoBadge
                logoUrl={homeTeam.logoUrl}
                name={homeName}
                shortName={homeTeam.shortName}
                sizeClass="w-7 h-7"
                imgWidth={160}
              />
            ) : (
              <span className="w-7 h-7 rounded-lg bg-[#0B0F19] border border-dashed border-[#334155] flex items-center justify-center text-[9px] font-mono font-bold text-orange-300 shrink-0">
                {fallbackHome.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span
              className={`text-xs truncate ${
                m?.winnerTeamId && m.winnerTeamId === homeTeam?.id
                  ? 'font-black text-emerald-400'
                  : isHomePlaceholder
                  ? 'font-medium text-slate-300'
                  : 'font-semibold text-white'
              }`}
            >
              {homeName}
            </span>
          </button>
          <span className="font-mono font-black text-sm text-[#FACC15] tabular-nums">
            {m && (isLive || isCompleted) ? m.homeSetsWon : '-'}
          </span>
        </div>

        {/* Away Slot */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={!awayTeam || !onSelectTeam}
            onClick={() => awayTeam && onSelectTeam?.(awayTeam)}
            className={`flex items-center gap-2 min-w-0 flex-1 text-left ${
              awayTeam && onSelectTeam ? 'cursor-pointer hover:text-orange-400' : 'cursor-default'
            }`}
          >
            {awayTeam ? (
              <TeamLogoBadge
                logoUrl={awayTeam.logoUrl}
                name={awayName}
                shortName={awayTeam.shortName}
                sizeClass="w-7 h-7"
                imgWidth={160}
              />
            ) : (
              <span className="w-7 h-7 rounded-lg bg-[#0B0F19] border border-dashed border-[#334155] flex items-center justify-center text-[9px] font-mono font-bold text-sky-300 shrink-0">
                {fallbackAway.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span
              className={`text-xs truncate ${
                m?.winnerTeamId && m.winnerTeamId === awayTeam?.id
                  ? 'font-black text-emerald-400'
                  : isAwayPlaceholder
                  ? 'font-medium text-slate-300'
                  : 'font-semibold text-white'
              }`}
            >
              {awayName}
            </span>
          </button>
          <span className="font-mono font-black text-sm text-[#FACC15] tabular-nums">
            {m && (isLive || isCompleted) ? m.awaySetsWon : '-'}
          </span>
        </div>

        {m?.setScores && m.setScores.length > 0 && (
          <div className="pt-1.5 border-t border-[#1E293B] text-[10px] font-mono text-slate-400 text-center">
            {m.setScores.map((s) => `${s.home}-${s.away}`).join('  |  ')}
          </div>
        )}
      </div>
    );
  };

  const qf1 = findMatch('QF1');
  const qf3 = findMatch('QF3');
  const qf2 = findMatch('QF2');
  const qf4 = findMatch('QF4');
  const sf1 = findMatch('SF1');
  const sf2 = findMatch('SF2');
  const thirdMatch = findMatch('3RD');
  const finalMatch = findMatch('FINAL');

  const slots = {
    qf1: { match: qf1, title: 'QF1', home: t('bracket.slots.qf1Home'), away: t('bracket.slots.qf1Away') },
    qf3: { match: qf3, title: 'QF3', home: t('bracket.slots.qf3Home'), away: t('bracket.slots.qf3Away') },
    qf2: { match: qf2, title: 'QF2', home: t('bracket.slots.qf2Home'), away: t('bracket.slots.qf2Away') },
    qf4: { match: qf4, title: 'QF4', home: t('bracket.slots.qf4Home'), away: t('bracket.slots.qf4Away') },
    sf1: { match: sf1, title: 'SF1', home: t('bracket.slots.sf1Home'), away: t('bracket.slots.sf1Away') },
    sf2: { match: sf2, title: 'SF2', home: t('bracket.slots.sf2Home'), away: t('bracket.slots.sf2Away') },
    third: { match: thirdMatch, title: '3RD PLACE', home: t('bracket.slots.thirdHome'), away: t('bracket.slots.thirdAway') },
    final: { match: finalMatch, title: 'FINAL', home: t('bracket.slots.finalHome'), away: t('bracket.slots.finalAway') },
  };

  if (blueprintMode) {
    const poolATeams = tournament.teams
      .filter((tm) => String(tm.pool || '').toUpperCase() === 'A' && tm.paymentStatus !== 'CANCELLED')
      .sort((a, b) => a.seedOrder - b.seedOrder);
    const poolBTeams = tournament.teams
      .filter((tm) => String(tm.pool || '').toUpperCase() === 'B' && tm.paymentStatus !== 'CANCELLED')
      .sort((a, b) => a.seedOrder - b.seedOrder);
    const hasDrawnPools = poolATeams.length > 0 || poolBTeams.length > 0;
    const slotsPerPool = Math.max(4, Math.min(8, Math.ceil((tournament.maxTeams || 8) / 2)));

    const renderBlueprintPoolCard = (
      poolKey: 'A' | 'B',
      poolTitle: string,
      assignedTeams: TournamentTeam[],
      rows: typeof standingsA
    ) => {
      const rankByTeamId = new Map(rows.map((r) => [r.teamId, r]));
      const orderedTeams =
        rows.some((r) => r.played > 0)
          ? rows.map((r) => teamMap.get(r.teamId)).filter((x): x is TournamentTeam => Boolean(x))
          : assignedTeams;
      const slotCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const poolSuffix = poolKey === 'A' ? '1' : '2';
      const accentBorder = poolKey === 'A' ? 'border-orange-500/30' : 'border-sky-500/30';
      const badgeTone =
        poolKey === 'A'
          ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
          : 'bg-sky-500/15 text-sky-300 border-sky-500/30';

      return (
        <div className={`rounded-2xl bg-[#0B0F19] border ${accentBorder} p-4 space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border ${badgeTone}`}>
              {poolTitle}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {t('rules.blueprint.poolSub', { count: slotsPerPool })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: slotsPerPool }, (_, idx) => {
              const team = orderedTeams[idx];
              const stats = team ? rankByTeamId.get(team.id) : undefined;
              const codeBadge = `${slotCodes[idx] || idx + 1}${poolSuffix}`;
              const poolSeedBadge = `${idx + 1}${poolKey}`;

              if (team) {
                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={!onSelectTeam}
                    onClick={() => onSelectTeam?.(team)}
                    className={`p-2.5 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center gap-2.5 text-left transition-colors ${
                      onSelectTeam ? 'hover:border-[#F97316]/60 cursor-pointer group' : 'cursor-default'
                    }`}
                  >
                    <TeamLogoBadge
                      logoUrl={team.logoUrl}
                      name={team.name}
                      shortName={team.shortName}
                      sizeClass="w-8 h-8"
                      imgWidth={160}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-orange-400 truncate">
                        {team.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span className="text-[#FACC15] font-bold">
                          {stats && stats.played > 0 ? `#${stats.rank} (${stats.wins}W-${stats.losses}L)` : poolSeedBadge}
                        </span>
                        {team.isDvaTeam && (
                          <span className="px-1 rounded bg-[#F97316]/20 text-orange-300 font-bold">DVA</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <div
                  key={`${poolKey}-slot-${idx}`}
                  className="p-2.5 rounded-xl bg-[#111827]/50 border border-dashed border-[#1E293B] flex items-center gap-2.5"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center font-mono font-black text-[11px] text-slate-300 shrink-0">
                    {codeBadge}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-300 truncate">
                      {hasDrawnPools
                        ? t('rules.blueprint.pendingSlot', { code: codeBadge })
                        : t('rules.blueprint.seedSlot', { code: codeBadge })}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      → {poolSeedBadge} in Group
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const liveDestination =
      tournament.trackingMode === 'FULL_BRACKET'
        ? `/tournaments/${tournament.slug}/bracket`
        : `/tournaments/${tournament.slug}/schedule`;

    return (
      <section className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 sm:p-7 space-y-6">
        {/* Block 2 Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#F97316]" />
              <h3 className="font-heading font-black text-lg sm:text-xl text-white">
                {t('rules.blueprint.title')}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                  hasDrawnPools
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/35'
                }`}
              >
                {hasDrawnPools ? t('rules.blueprint.drawnBadge') : t('rules.blueprint.preDrawBadge')}
              </span>
            </div>
            <p className="text-xs text-slate-400">{t('rules.blueprint.subtitle')}</p>
          </div>

          <Link
            to={liveDestination}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow transition-all shrink-0"
          >
            <span>{t('rules.blueprint.openLiveCta')}</span>
          </Link>
        </div>

        {/* Stage 1: Group Stage Pools Blueprint */}
        <div className="space-y-3">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
            <span>{t('rules.blueprint.stageGroup')}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderBlueprintPoolCard('A', t('bracket.poolA'), poolATeams, standingsA)}
            {renderBlueprintPoolCard('B', t('bracket.poolB'), poolBTeams, standingsB)}
          </div>
        </div>

        {/* Stage 2: Knockout Pathway Diagram */}
        <div className="space-y-3">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
            <span>{t('rules.blueprint.stageKnockout')}</span>
          </div>

          {/* Desktop 5-Column Symmetrical 2-Wing Blueprint */}
          <div className="hidden lg:block rounded-2xl border border-[#1E293B] bg-[#0B0F19] p-5">
            <div className="grid grid-cols-5 gap-3 items-center">
              {/* Left Wing QF1 & QF3 */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                  {t('bracket.leftWing')} · QF
                </div>
                {renderBracketMatchCard(slots.qf1.match, slots.qf1.title, slots.qf1.home, slots.qf1.away)}
                {renderBracketMatchCard(slots.qf3.match, slots.qf3.title, slots.qf3.home, slots.qf3.away)}
              </div>

              {/* Left Wing SF1 */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center flex items-center justify-center gap-1">
                  <ArrowRight className="w-3 h-3 text-[#F97316]" />
                  <span>Semifinal 1</span>
                </div>
                {renderBracketMatchCard(slots.sf1.match, slots.sf1.title, slots.sf1.home, slots.sf1.away)}
              </div>

              {/* Center Trophy, Grand Final & 3rd Place */}
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center text-slate-950 shadow">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FACC15]">
                    Grand Final
                  </span>
                </div>
                {renderBracketMatchCard(slots.final.match, slots.final.title, slots.final.home, slots.final.away)}
                <div className="pt-1 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                    3rd Place Match
                  </div>
                  {renderBracketMatchCard(slots.third.match, slots.third.title, slots.third.home, slots.third.away)}
                </div>
              </div>

              {/* Right Wing SF2 */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center flex items-center justify-center gap-1">
                  <span>Semifinal 2</span>
                  <ArrowRight className="w-3 h-3 text-[#38BDF8] rotate-180" />
                </div>
                {renderBracketMatchCard(slots.sf2.match, slots.sf2.title, slots.sf2.home, slots.sf2.away)}
              </div>

              {/* Right Wing QF2 & QF4 */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                  {t('bracket.rightWing')} · QF
                </div>
                {renderBracketMatchCard(slots.qf2.match, slots.qf2.title, slots.qf2.home, slots.qf2.away)}
                {renderBracketMatchCard(slots.qf4.match, slots.qf4.title, slots.qf4.home, slots.qf4.away)}
              </div>
            </div>
          </div>

          {/* Mobile Stacked Vertical Progression Blueprint (No horizontal scroll) */}
          <div className="lg:hidden rounded-2xl border border-[#1E293B] bg-[#0B0F19] p-4 space-y-4">
            <div className="space-y-2.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('rules.blueprint.quarterfinals')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {renderBracketMatchCard(slots.qf1.match, slots.qf1.title, slots.qf1.home, slots.qf1.away)}
                {renderBracketMatchCard(slots.qf3.match, slots.qf3.title, slots.qf3.home, slots.qf3.away)}
                {renderBracketMatchCard(slots.qf2.match, slots.qf2.title, slots.qf2.home, slots.qf2.away)}
                {renderBracketMatchCard(slots.qf4.match, slots.qf4.title, slots.qf4.home, slots.qf4.away)}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-4 h-4 text-[#F97316]" />
            </div>

            <div className="space-y-2.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('rules.blueprint.semifinals')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {renderBracketMatchCard(slots.sf1.match, slots.sf1.title, slots.sf1.home, slots.sf1.away)}
                {renderBracketMatchCard(slots.sf2.match, slots.sf2.title, slots.sf2.home, slots.sf2.away)}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-4 h-4 text-[#FACC15]" />
            </div>

            <div className="space-y-2.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#FACC15]">
                {t('rules.blueprint.finals')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {renderBracketMatchCard(slots.final.match, slots.final.title, slots.final.home, slots.final.away)}
                {renderBracketMatchCard(slots.third.match, slots.third.title, slots.third.home, slots.third.away)}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Group Stage Standings */}
      {(standingsA.length > 0 || standingsB.length > 0) && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-heading font-black text-lg text-white">{t('bracket.standingsTitle')}</h3>
            <span className="text-[11px] text-slate-400">{t('bracket.tieLegend')}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {renderStandingsTable(t('bracket.poolA'), standingsA)}
            {renderStandingsTable(t('bracket.poolB'), standingsB)}
          </div>
        </section>
      )}

      {/* 2. Symmetrical 2-Wing Knockout Championship Bracket */}
      {tournament.trackingMode === 'FULL_BRACKET' && (
        <section className="space-y-4">
          <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FACC15]" />
            <span>{t('bracket.knockoutTitle')}</span>
          </h3>

          <div className="rounded-3xl border border-[#1E293B] bg-[#0B0F19] p-4 sm:p-6 overflow-x-auto">
            <div className="min-w-[920px] grid grid-cols-5 gap-4 items-center">
              {/* Col 1: Left Wing QF1 & QF3 */}
              <div className="space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  {t('bracket.leftWing')} · QF
                </div>
                {renderBracketMatchCard(slots.qf1.match, slots.qf1.title, slots.qf1.home, slots.qf1.away)}
                {renderBracketMatchCard(slots.qf3.match, slots.qf3.title, slots.qf3.home, slots.qf3.away)}
              </div>

              {/* Col 2: Left Wing SF1 */}
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  Semifinal 1
                </div>
                {renderBracketMatchCard(slots.sf1.match, slots.sf1.title, slots.sf1.home, slots.sf1.away)}
              </div>

              {/* Col 3: Center Trophy + Final + 3rd Place */}
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center text-slate-950 shadow-lg shadow-amber-950/50">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FACC15]">
                    Grand Final
                  </span>
                </div>
                {renderBracketMatchCard(slots.final.match, slots.final.title, slots.final.home, slots.final.away)}

                <div className="pt-2 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                    3rd Place Match
                  </div>
                  {renderBracketMatchCard(slots.third.match, slots.third.title, slots.third.home, slots.third.away)}
                </div>
              </div>

              {/* Col 4: Right Wing SF2 */}
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  Semifinal 2
                </div>
                {renderBracketMatchCard(slots.sf2.match, slots.sf2.title, slots.sf2.home, slots.sf2.away)}
              </div>

              {/* Col 5: Right Wing QF2 & QF4 */}
              <div className="space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  {t('bracket.rightWing')} · QF
                </div>
                {renderBracketMatchCard(slots.qf2.match, slots.qf2.title, slots.qf2.home, slots.qf2.away)}
                {renderBracketMatchCard(slots.qf4.match, slots.qf4.title, slots.qf4.home, slots.qf4.away)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
