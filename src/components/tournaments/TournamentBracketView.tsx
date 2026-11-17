import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Construction, FileText, Trophy, UserPlus } from 'lucide-react';
import { Tournament, TournamentMatch, TournamentTeam } from '../../types';
import { computePoolStandings } from '../../shared/tournaments';
import { TeamLogoBadge } from './TeamLogoBadge';

interface TournamentBracketViewProps {
  tournament: Tournament;
  onSelectTeam: (team: TournamentTeam) => void;
  onOpenRegister: () => void;
}

export const TournamentBracketView: React.FC<TournamentBracketViewProps> = ({
  tournament,
  onSelectTeam,
  onOpenRegister,
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

  if (isDataEmptyForFullBracket) {
    const canReg =
      tournament.mode === 'HOSTED' &&
      tournament.status === 'UPCOMING' &&
      tournament.isRegistrationOpen;
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
          {canReg && (
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
    <div className="rounded-3xl border border-[#1E293B] bg-[#111827] overflow-hidden">
      <div className="px-5 py-3.5 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between">
        <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider">{title}</h4>
        <span className="text-[10px] font-mono text-slate-400">4 Teams · Round Robin</span>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500">Teams pending draw assignment.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#1E293B] bg-[#0B0F19]/40">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Team</th>
                <th className="py-2.5 px-2 text-center">P</th>
                <th className="py-2.5 px-2 text-center">W-L</th>
                <th className="py-2.5 px-2 text-center">Pts</th>
                <th className="py-2.5 px-2 text-center">Sets</th>
                <th className="py-2.5 px-3 text-right">Pt Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {rows.map((r) => {
                const tm = teamMap.get(r.teamId);
                return (
                  <tr key={r.teamId} className="hover:bg-slate-800/35">
                    <td className="py-3 px-3 font-mono font-black text-[#F97316]">{r.rank}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => tm && onSelectTeam(tm)}
                        className="flex items-center gap-2.5 text-left group cursor-pointer"
                      >
                        <TeamLogoBadge
                          logoUrl={r.logoUrl}
                          name={r.teamName}
                          shortName={r.shortName}
                          sizeClass="w-8 h-8"
                          imgWidth={96}
                        />
                        <span className="font-bold text-white group-hover:text-orange-400 transition-colors">
                          {r.teamName}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-400">{r.played}</td>
                    <td className="py-3 px-2 text-center font-mono text-slate-200">
                      {r.wins}-{r.losses}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-black text-[#FACC15]">
                      {r.fivbPoints}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-300">
                      {r.setsWon}:{r.setsLost}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {r.pointsAgainst === 0 && r.pointsFor === 0
                        ? '—'
                        : r.pointsAgainst === 0
                        ? 'MAX'
                        : r.pointRatio.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderBracketMatchCard = (m: TournamentMatch | undefined, fallbackTitle: string) => {
    const homeTeam = m?.homeTeamId ? teamMap.get(m.homeTeamId) : null;
    const awayTeam = m?.awayTeamId ? teamMap.get(m.awayTeamId) : null;
    const homeName = homeTeam?.name || m?.homeLabel || 'TBD';
    const awayName = awayTeam?.name || m?.awayLabel || 'TBD';
    const isLive = m?.status === 'LIVE';
    const isCompleted = m?.status === 'COMPLETED';

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
            {m?.courtName && <span className="text-sky-400 font-semibold">{m.courtName}</span>}
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
            disabled={!homeTeam}
            onClick={() => homeTeam && onSelectTeam(homeTeam)}
            className={`flex items-center gap-2 min-w-0 flex-1 text-left ${
              homeTeam ? 'cursor-pointer hover:text-orange-400' : 'cursor-default'
            }`}
          >
            <TeamLogoBadge
              logoUrl={homeTeam?.logoUrl}
              name={homeName}
              shortName={homeTeam?.shortName}
              sizeClass="w-7 h-7"
              imgWidth={96}
            />
            <span
              className={`text-xs truncate ${
                m?.winnerTeamId && m.winnerTeamId === homeTeam?.id
                  ? 'font-black text-emerald-400'
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
            disabled={!awayTeam}
            onClick={() => awayTeam && onSelectTeam(awayTeam)}
            className={`flex items-center gap-2 min-w-0 flex-1 text-left ${
              awayTeam ? 'cursor-pointer hover:text-orange-400' : 'cursor-default'
            }`}
          >
            <TeamLogoBadge
              logoUrl={awayTeam?.logoUrl}
              name={awayName}
              shortName={awayTeam?.shortName}
              sizeClass="w-7 h-7"
              imgWidth={96}
            />
            <span
              className={`text-xs truncate ${
                m?.winnerTeamId && m.winnerTeamId === awayTeam?.id
                  ? 'font-black text-emerald-400'
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
                {renderBracketMatchCard(qf1, 'QF1 (1A vs 4B)')}
                {renderBracketMatchCard(qf3, 'QF3 (3A vs 2B)')}
              </div>

              {/* Col 2: Left Wing SF1 */}
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  Semifinal 1
                </div>
                {renderBracketMatchCard(sf1, 'SF1')}
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
                {renderBracketMatchCard(finalMatch, 'FINAL')}

                <div className="pt-2 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                    3rd Place Match
                  </div>
                  {renderBracketMatchCard(thirdMatch, '3RD PLACE')}
                </div>
              </div>

              {/* Col 4: Right Wing SF2 */}
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  Semifinal 2
                </div>
                {renderBracketMatchCard(sf2, 'SF2')}
              </div>

              {/* Col 5: Right Wing QF2 & QF4 */}
              <div className="space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  {t('bracket.rightWing')} · QF
                </div>
                {renderBracketMatchCard(qf2, 'QF2 (2A vs 3B)')}
                {renderBracketMatchCard(qf4, 'QF4 (4A vs 1B)')}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
