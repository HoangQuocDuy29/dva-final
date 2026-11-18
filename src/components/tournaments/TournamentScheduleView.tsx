import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Calendar,
  Clock,
  FileText,
  GitBranch,
  MapPin,
  Medal,
  Shield,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { Tournament, TournamentMatch, TournamentTeam } from '../../types';
import {
  MatchStageFilterKey,
  TournamentCourtFilter,
  computePoolStandings,
  matchesStageFilter,
  matchesTournamentCourtFilter,
  normalizeTournamentCourtName,
} from '../../shared/tournaments';
import { MatchScoreboardRow } from './MatchScoreboardRow';
import { PoolStandingsTable } from './PoolStandingsTable';

interface TournamentScheduleViewProps {
  tournament: Tournament;
  onSelectTeam: (team: TournamentTeam) => void;
  onOpenRegister: () => void;
}

export const TournamentScheduleView: React.FC<TournamentScheduleViewProps> = ({
  tournament,
  onSelectTeam,
  onOpenRegister,
}) => {
  const { t } = useTranslation('tournaments');
  const [stageFilter, setStageFilter] = useState<MatchStageFilterKey>('ALL');
  const [courtFilter, setCourtFilter] = useState<TournamentCourtFilter>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  const teamMap = useMemo(
    () => new Map(tournament.teams.map((tm) => [tm.id, tm])),
    [tournament.teams]
  );
  const officialMap = useMemo(
    () => new Map(tournament.officials.map((o) => [o.id, o])),
    [tournament.officials]
  );

  const standingsA = useMemo(
    () => computePoolStandings(tournament.teams, tournament.matches, 'A'),
    [tournament.teams, tournament.matches]
  );
  const standingsB = useMemo(
    () => computePoolStandings(tournament.teams, tournament.matches, 'B'),
    [tournament.teams, tournament.matches]
  );

  const stageCounts = useMemo(
    () => ({
      ALL: tournament.matches.length,
      POOL: tournament.matches.filter((m) => matchesStageFilter(m.stage, 'POOL')).length,
      QUARTERFINAL: tournament.matches.filter((m) => matchesStageFilter(m.stage, 'QUARTERFINAL')).length,
      SEMIFINAL: tournament.matches.filter((m) => matchesStageFilter(m.stage, 'SEMIFINAL')).length,
      FINALS: tournament.matches.filter((m) => matchesStageFilter(m.stage, 'FINALS')).length,
    }),
    [tournament.matches]
  );

  const filteredMatches = useMemo(() => {
    return tournament.matches.filter((m) => {
      if (!matchesStageFilter(m.stage, stageFilter)) return false;
      if (!matchesTournamentCourtFilter(m.courtName, courtFilter)) return false;
      if (teamFilter !== 'ALL' && m.homeTeamId !== teamFilter && m.awayTeamId !== teamFilter) {
        return false;
      }
      return true;
    });
  }, [tournament.matches, stageFilter, courtFilter, teamFilter]);

  if (tournament.matches.length === 0) {
    const canReg =
      tournament.mode === 'HOSTED' &&
      tournament.status === 'UPCOMING' &&
      tournament.isRegistrationOpen &&
      !tournament.isRosterLocked;
    return (
      <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-8 sm:p-12 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center mx-auto">
          <Calendar className="w-7 h-7 text-[#38BDF8]" />
        </div>
        <div className="space-y-2 max-w-xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
            {t('prep.badge')}
          </span>
          <h3 className="font-heading font-black text-xl sm:text-2xl text-white">
            {t('schedule.noMatchesTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t('schedule.noMatchesDesc')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/tournaments/${tournament.slug}/rules`}
            className="px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-bold text-slate-200 inline-flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-[#38BDF8]" />
            <span>{t('prep.viewRules')}</span>
          </Link>
          {canReg && (
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('prep.registerNow')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const getTeamOutcomeBadge = (m: TournamentMatch, side: 'HOME' | 'AWAY') => {
    if (m.status !== 'COMPLETED' || !m.winnerTeamId) return null;
    const sideTeamId = side === 'HOME' ? m.homeTeamId : m.awayTeamId;
    if (!sideTeamId) return null;
    const won = m.winnerTeamId === sideTeamId;

    if (m.stage === 'QUARTERFINAL') {
      return won ? (
        <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-700/70 text-[10px] font-bold">
          ✓ {t('schedule.outcomeAdvanceSf')}
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-md bg-red-950/80 text-red-300 border border-red-800/60 text-[10px] font-semibold">
          ✕ {t('schedule.outcomeEliminated')}
        </span>
      );
    }

    if (m.stage === 'SEMIFINAL') {
      return won ? (
        <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-600/60 text-[10px] font-bold">
          → {t('schedule.outcomeFinal')}
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
          → {t('schedule.outcomeThird')}
        </span>
      );
    }

    if (m.stage === 'THIRD_PLACE') {
      return won ? (
        <span className="px-2 py-0.5 rounded-md bg-orange-950/90 text-orange-300 border border-orange-600/60 text-[10px] font-black">
          🥉 {t('schedule.outcomeBronze')}
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-semibold">
          {t('schedule.outcomeFourth')}
        </span>
      );
    }

    if (m.stage === 'FINAL') {
      return won ? (
        <span className="px-2 py-0.5 rounded-md bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/60 text-[10px] font-black">
          🏆 {t('schedule.outcomeChampion')}
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-600 text-[10px] font-bold">
          🥈 {t('schedule.outcomeRunnerUp')}
        </span>
      );
    }

    return null;
  };

  const renderMatchCard = (m: TournamentMatch, variant: 'default' | 'bronze' | 'final' = 'default') => {
    const homeTeam = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
    const awayTeam = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;
    const ref = m.officialId ? officialMap.get(m.officialId) : null;
    const isLive = m.status === 'LIVE';
    const isDone = m.status === 'COMPLETED';

    const cardFrame = isLive
      ? 'border-red-500 shadow-lg shadow-red-950/30 bg-[#111827]'
      : variant === 'final'
      ? 'border-[#FACC15]/50 bg-gradient-to-br from-[#1A160B] via-[#111827] to-[#111827] shadow-lg shadow-amber-950/20'
      : variant === 'bronze'
      ? 'border-orange-500/40 bg-gradient-to-br from-[#19120D] via-[#111827] to-[#111827]'
      : 'border-[#1E293B] bg-[#111827]';

    const homeOutcome = getTeamOutcomeBadge(m, 'HOME');
    const awayOutcome = getTeamOutcomeBadge(m, 'AWAY');

    return (
      <div
        key={m.id}
        className={`rounded-3xl border p-5 space-y-4 transition-all ${cardFrame}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] font-mono font-black text-white">
              {m.matchCode}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase">{m.stage}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-[#38BDF8] font-bold">
              <MapPin className="w-3.5 h-3.5" />
              {normalizeTournamentCourtName(m.courtName)}
            </span>
            {m.scheduledTime && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300">
                <Clock className="w-3 h-3 text-slate-500" />
                {m.scheduledTime}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                isLive
                  ? 'bg-red-600 text-white animate-pulse'
                  : isDone
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {m.status}
            </span>
          </div>
        </div>

        {/* Symmetrical 3-Column Teams & VS / Score */}
        <MatchScoreboardRow
          match={m}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onSelectTeam={onSelectTeam}
          homeBadge={homeOutcome}
          awayBadge={awayOutcome}
        />

        {/* Assigned Official Footer */}
        {ref && (
          <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end text-[11px]">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Shield className="w-3 h-3 text-[#38BDF8]" />
              Ref: <strong className="text-slate-200">{ref.fullName}</strong>
            </span>
          </div>
        )}
      </div>
    );
  };

  const poolAMatches = filteredMatches.filter((m) => m.stage === 'POOL_A');
  const poolBMatches = filteredMatches.filter((m) => m.stage === 'POOL_B');
  const groupMatches = filteredMatches.filter((m) => m.stage === 'GROUP');
  const hasGroupMatches = poolAMatches.length > 0 || poolBMatches.length > 0 || groupMatches.length > 0;
  const qfMatches = filteredMatches.filter((m) => m.stage === 'QUARTERFINAL');
  const sfMatches = filteredMatches.filter((m) => m.stage === 'SEMIFINAL');
  const thirdMatches = filteredMatches.filter((m) => m.stage === 'THIRD_PLACE');
  const finalMatches = filteredMatches.filter((m) => m.stage === 'FINAL');

  const stageFilterOptions: Array<{ key: MatchStageFilterKey; label: string }> = [
    { key: 'ALL', label: `${t('schedule.allStages')} (${stageCounts.ALL})` },
    ...(stageCounts.POOL > 0
      ? [{ key: 'POOL' as const, label: `${t('schedule.poolStage')} (${stageCounts.POOL})` }]
      : []),
    ...(stageCounts.QUARTERFINAL > 0
      ? [{ key: 'QUARTERFINAL' as const, label: `${t('schedule.quarterfinals')} (${stageCounts.QUARTERFINAL})` }]
      : []),
    ...(stageCounts.SEMIFINAL > 0
      ? [{ key: 'SEMIFINAL' as const, label: `${t('schedule.semifinals')} (${stageCounts.SEMIFINAL})` }]
      : []),
    ...(stageCounts.FINALS > 0
      ? [{ key: 'FINALS' as const, label: `${t('schedule.finals')} (${stageCounts.FINALS})` }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Stage, Court & Team Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3">
        {stageFilterOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {stageFilterOptions.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStageFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  stageFilter === tab.key
                    ? 'bg-[#F97316] text-white shadow'
                    : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-[#1E293B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs self-start">
            {(['ALL', 'Court A', 'Court B'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCourtFilter(c)}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  courtFilter === c
                    ? 'bg-[#38BDF8] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c === 'ALL' ? t('schedule.allCourts') : c}
              </button>
            ))}
          </div>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-white font-semibold"
          >
            <option value="ALL">{t('schedule.allTeams')}</option>
            {tournament.teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredMatches.length === 0 && (
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-10 text-center text-xs text-slate-400">
          {t('schedule.noFilteredMatches')}
        </div>
      )}

      {/* Stage 1: Group Stage (Integrated Standings + Pool A & Pool B Matches) */}
      {hasGroupMatches && (
        <section className="space-y-4">
          <div className="space-y-1 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
              <h3 className="font-heading font-black text-lg text-white">
                {t('schedule.groupStageTitle')}
              </h3>
            </div>
            <p className="text-xs text-slate-400">{t('schedule.groupStageSub')}</p>
          </div>

          {tournament.trackingMode === 'FULL_BRACKET' && (standingsA.length > 0 || standingsB.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(poolAMatches.length > 0 || (poolAMatches.length === 0 && poolBMatches.length === 0)) && (
                <PoolStandingsTable
                  title={t('bracket.poolA')}
                  rows={standingsA}
                  teamMap={teamMap}
                  onSelectTeam={onSelectTeam}
                  compact
                />
              )}
              {(poolBMatches.length > 0 || (poolAMatches.length === 0 && poolBMatches.length === 0)) && (
                <PoolStandingsTable
                  title={t('bracket.poolB')}
                  rows={standingsB}
                  teamMap={teamMap}
                  onSelectTeam={onSelectTeam}
                  compact
                />
              )}
            </div>
          )}

          {poolAMatches.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[11px] font-black uppercase text-orange-300">
                  {t('schedule.poolAMatches')}
                </span>
                <span className="text-[11px] font-mono text-slate-500">({poolAMatches.length})</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {poolAMatches.map((m) => renderMatchCard(m))}
              </div>
            </div>
          )}

          {poolBMatches.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/35 text-[11px] font-black uppercase text-sky-300">
                  {t('schedule.poolBMatches')}
                </span>
                <span className="text-[11px] font-mono text-slate-500">({poolBMatches.length})</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {poolBMatches.map((m) => renderMatchCard(m))}
              </div>
            </div>
          )}

          {groupMatches.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-black uppercase text-slate-300">
                  {t('schedule.generalMatches')}
                </span>
                <span className="text-[11px] font-mono text-slate-500">({groupMatches.length})</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupMatches.map((m) => renderMatchCard(m))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Stage 2: Quarter-Finals */}
      {qfMatches.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1 px-1">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#F97316]" />
              <h3 className="font-heading font-black text-lg text-white">
                {t('schedule.qfTitle')}
              </h3>
            </div>
            <p className="text-xs text-slate-400">{t('schedule.qfSub')}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {qfMatches.map((m) => renderMatchCard(m))}
          </div>
        </section>
      )}

      {/* Stage 3: Semi-Finals */}
      {sfMatches.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1 px-1">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <h3 className="font-heading font-black text-lg text-white">
                {t('schedule.sfTitle')}
              </h3>
            </div>
            <p className="text-xs text-slate-400">{t('schedule.sfSub')}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sfMatches.map((m) => renderMatchCard(m))}
          </div>
        </section>
      )}

      {/* Stage 4: Medal Matches (Third Place & Grand Final) */}
      {(thirdMatches.length > 0 || finalMatches.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="w-4 h-4 text-[#FACC15]" />
            <h3 className="font-heading font-black text-lg text-white">
              {t('schedule.medalTitle')}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {thirdMatches.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-black uppercase text-orange-300">
                    <Medal className="w-3.5 h-3.5" />
                    {t('schedule.thirdPlaceBadge')}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {t('schedule.thirdPlaceSub')}
                  </span>
                </div>
                {renderMatchCard(m, 'bronze')}
              </div>
            ))}

            {finalMatches.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-black uppercase text-[#FACC15]">
                    <Trophy className="w-3.5 h-3.5" />
                    {t('schedule.grandFinalBadge')}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {t('schedule.grandFinalSub')}
                  </span>
                </div>
                {renderMatchCard(m, 'final')}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
