import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Calendar, MapPin, Shield, Trophy, Users, X } from 'lucide-react';
import {
  POSITION_LABELS,
  TOURNAMENT_AWARD_LABELS,
  Tournament,
  TournamentIndividualAward,
  TournamentTeam,
} from '../../types';
import { computePoolStandings, normalizeTournamentCourtName } from '../../shared/tournaments';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { TeamLogoBadge } from './TeamLogoBadge';

interface TeamRosterDrawerProps {
  tournament: Tournament;
  team: TournamentTeam | null;
  onClose: () => void;
}

export const TeamRosterDrawer: React.FC<TeamRosterDrawerProps> = ({
  tournament,
  team,
  onClose,
}) => {
  const { t } = useTranslation('tournaments');

  useEffect(() => {
    if (!team) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [team, onClose]);

  const teamMap = useMemo(
    () => new Map(tournament.teams.map((tm) => [tm.id, tm])),
    [tournament.teams]
  );

  const roster = useMemo(() => {
    if (!team) return [];
    return tournament.players
      .filter((p) => p.teamId === team.id && p.eligibilityStatus !== 'REJECTED')
      .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain) || a.jerseyNumber - b.jerseyNumber);
  }, [tournament.players, team]);

  const teamMatches = useMemo(() => {
    if (!team) return [];
    return tournament.matches.filter(
      (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
    );
  }, [tournament.matches, team]);

  const currentRankLabel = useMemo(() => {
    if (!team) return null;
    if (team.finalRank) {
      if (team.finalRank === 1) return 'Champion (1st Place)';
      if (team.finalRank === 2) return 'Runner-Up (2nd Place)';
      if (team.finalRank === 3) return '3rd Place';
      return `Final Rank #${team.finalRank}`;
    }
    if (team.pool === 'A' || team.pool === 'B') {
      const standings = computePoolStandings(tournament.teams, tournament.matches, team.pool);
      const row = standings.find((r) => r.teamId === team.id);
      if (row) return `#${row.rank} Pool ${team.pool} (${row.wins}W-${row.losses}L · ${row.fivbPoints} pts)`;
    }
    return team.pool ? `Pool ${team.pool}` : null;
  }, [team, tournament.teams, tournament.matches]);

  if (!team) return null;

  const dvaSquadHref = team.dvaSquadLevel
    ? `/players/${team.dvaSquadLevel.toLowerCase()}`
    : '/players';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close team roster drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-default"
      />

      <aside className="relative w-full max-w-lg h-full bg-[#0E1524] border-l border-[#1E293B] shadow-2xl flex flex-col text-white overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 bg-[#0B0F19] border-b border-[#1E293B] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <TeamLogoBadge
                logoUrl={team.logoUrl}
                name={team.name}
                shortName={team.shortName}
                sizeClass="w-14 h-14"
                imgWidth={160}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading font-black text-lg sm:text-xl text-white truncate">
                    {team.name}
                  </h3>
                  {team.isDvaTeam && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600/20 text-red-400 border border-red-500/40">
                      DVA Club
                    </span>
                  )}
                </div>
                {currentRankLabel && (
                  <p className="text-xs font-bold text-[#F97316] mt-0.5 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{currentRankLabel}</span>
                  </p>
                )}
                {team.captainName && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Captain: <strong className="text-slate-200">{team.captainName}</strong>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {team.isDvaTeam && (
            <Link
              to={dvaSquadHref}
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('drawer.viewDvaSquad')} ({team.dvaSquadLevel || 'ALL'})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Team Roster */}
          <section className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                {t('drawer.rosterTitle')}
              </span>
              <span className="font-mono text-slate-300">{roster.length} Athletes</span>
            </h4>

            {roster.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] text-center text-xs text-slate-500">
                {t('drawer.noRoster')}
              </div>
            ) : (
              <div className="space-y-2">
                {roster.map((pl) => {
                  const posName = POSITION_LABELS[pl.position]?.nameEn || pl.position;
                  return (
                    <div
                      key={pl.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        pl.awards.length > 0
                          ? 'bg-amber-950/15 border-amber-500/40'
                          : 'bg-[#111827] border-[#1E293B]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {pl.avatarUrl ? (
                          <img
                            src={optimizeCloudinaryUrl(pl.avatarUrl, 'thumb')}
                            alt={pl.fullName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center font-athletic font-black text-sm text-orange-400 shrink-0">
                            #{pl.jerseyNumber}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white flex flex-wrap items-center gap-1.5">
                            <span className="truncate">{pl.fullName}</span>
                            {pl.isCaptain && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase">
                                C
                              </span>
                            )}
                            {pl.awards.map((aw) => (
                              <span
                                key={aw}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  aw === 'MVP'
                                    ? 'bg-[#FACC15]/20 border-[#FACC15]/60 text-[#FACC15]'
                                    : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                                }`}
                              >
                                <span>{aw === 'MVP' ? '🏆' : '⭐'}</span>
                                <span>{TOURNAMENT_AWARD_LABELS[aw as TournamentIndividualAward] || aw}</span>
                              </span>
                            ))}
                          </div>
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2">
                            <span className="font-mono text-orange-400 font-bold">#{pl.jerseyNumber}</span>
                            <span>· {posName}</span>
                            {pl.height && <span>· {pl.height}cm</span>}
                            {pl.spikeTouch && <span>· Spike {pl.spikeTouch}cm</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Match Journey */}
          <section className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
              {t('drawer.matchesTitle')}
            </h4>

            {teamMatches.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] text-center text-xs text-slate-500">
                {t('drawer.noMatches')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {teamMatches.map((m) => {
                  const isHome = m.homeTeamId === team.id;
                  const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
                  const opponent = opponentId ? teamMap.get(opponentId) : null;
                  const opponentName = opponent?.name || (isHome ? m.awayLabel : m.homeLabel) || 'TBD';
                  const won = m.status === 'COMPLETED' && m.winnerTeamId === team.id;
                  const lost = m.status === 'COMPLETED' && m.winnerTeamId && m.winnerTeamId !== team.id;

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-mono font-bold text-slate-200">{m.matchCode}</span>
                          <span>· {m.stage}</span>
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {normalizeTournamentCourtName(m.courtName)}
                          </span>
                          {m.scheduledTime && <span>· {m.scheduledTime}</span>}
                        </div>
                        <div className="font-bold text-white truncate">
                          vs. {opponentName}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        {m.status === 'COMPLETED' ? (
                          <>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                won
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : lost
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {won ? 'WIN' : lost ? 'LOSS' : 'DRAW'} {isHome ? `${m.homeSetsWon}-${m.awaySetsWon}` : `${m.awaySetsWon}-${m.homeSetsWon}`}
                            </span>
                            {m.setScores?.length > 0 && (
                              <div className="font-mono text-[10px] text-slate-400">
                                {m.setScores
                                  .map((s) => (isHome ? `${s.home}-${s.away}` : `${s.away}-${s.home}`))
                                  .join(' · ')}
                              </div>
                            )}
                          </>
                        ) : m.status === 'LIVE' ? (
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase animate-pulse">
                            LIVE {isHome ? `${m.homeSetsWon}-${m.awaySetsWon}` : `${m.awaySetsWon}-${m.homeSetsWon}`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                            SCHEDULED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};
