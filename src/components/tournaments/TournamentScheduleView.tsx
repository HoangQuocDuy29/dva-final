import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, FileText, MapPin, Shield, UserPlus } from 'lucide-react';
import { Tournament, TournamentTeam } from '../../types';
import { TeamLogoBadge } from './TeamLogoBadge';

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
  const [courtFilter, setCourtFilter] = useState<'ALL' | 'Court 1' | 'Court 2'>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  const teamMap = useMemo(
    () => new Map(tournament.teams.map((tm) => [tm.id, tm])),
    [tournament.teams]
  );
  const officialMap = useMemo(
    () => new Map(tournament.officials.map((o) => [o.id, o])),
    [tournament.officials]
  );

  const filteredMatches = useMemo(() => {
    return tournament.matches.filter((m) => {
      if (courtFilter !== 'ALL' && m.courtName !== courtFilter) return false;
      if (teamFilter !== 'ALL' && m.homeTeamId !== teamFilter && m.awayTeamId !== teamFilter) {
        return false;
      }
      return true;
    });
  }, [tournament.matches, courtFilter, teamFilter]);

  if (tournament.matches.length === 0) {
    const canReg =
      tournament.mode === 'HOSTED' &&
      tournament.status === 'UPCOMING' &&
      tournament.isRegistrationOpen;
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

  return (
    <div className="space-y-5">
      {/* Court & Team Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111827] border border-[#1E293B]">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs">
          {(['ALL', 'Court 1', 'Court 2'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCourtFilter(c)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                courtFilter === c
                  ? 'bg-[#F97316] text-white'
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

      {/* Matches List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMatches.map((m) => {
          const homeTeam = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
          const awayTeam = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;
          const homeName = homeTeam?.name || m.homeLabel || 'TBD';
          const awayName = awayTeam?.name || m.awayLabel || 'TBD';
          const ref = m.officialId ? officialMap.get(m.officialId) : null;
          const isLive = m.status === 'LIVE';
          const isDone = m.status === 'COMPLETED';

          return (
            <div
              key={m.id}
              className={`rounded-3xl bg-[#111827] border p-5 space-y-4 transition-all ${
                isLive ? 'border-red-500 shadow-lg shadow-red-950/30' : 'border-[#1E293B]'
              }`}
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
                    {m.courtName}
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

              {/* Matchup */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={!homeTeam}
                  onClick={() => homeTeam && onSelectTeam(homeTeam)}
                  className={`flex items-center gap-2.5 min-w-0 flex-1 text-left ${
                    homeTeam ? 'cursor-pointer hover:text-orange-400' : 'cursor-default'
                  }`}
                >
                  <TeamLogoBadge
                    logoUrl={homeTeam?.logoUrl}
                    name={homeName}
                    shortName={homeTeam?.shortName}
                    sizeClass="w-10 h-10"
                    imgWidth={96}
                  />
                  <span
                    className={`text-sm truncate ${
                      m.winnerTeamId && m.winnerTeamId === homeTeam?.id
                        ? 'font-black text-emerald-400'
                        : 'font-bold text-white'
                    }`}
                  >
                    {homeName}
                  </span>
                </button>

                <div className="px-3 py-1.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-mono font-black text-base text-[#FACC15] shrink-0">
                  {isLive || isDone ? `${m.homeSetsWon} - ${m.awaySetsWon}` : 'VS'}
                </div>

                <button
                  type="button"
                  disabled={!awayTeam}
                  onClick={() => awayTeam && onSelectTeam(awayTeam)}
                  className={`flex items-center justify-end gap-2.5 min-w-0 flex-1 text-right ${
                    awayTeam ? 'cursor-pointer hover:text-orange-400' : 'cursor-default'
                  }`}
                >
                  <span
                    className={`text-sm truncate ${
                      m.winnerTeamId && m.winnerTeamId === awayTeam?.id
                        ? 'font-black text-emerald-400'
                        : 'font-bold text-white'
                    }`}
                  >
                    {awayName}
                  </span>
                  <TeamLogoBadge
                    logoUrl={awayTeam?.logoUrl}
                    name={awayName}
                    shortName={awayTeam?.shortName}
                    sizeClass="w-10 h-10"
                    imgWidth={96}
                  />
                </button>
              </div>

              {/* Set-by-Set Scoreline & Official */}
              {(m.setScores?.length > 0 || ref) && (
                <div className="pt-3 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.setScores?.map((s) => (
                      <span
                        key={s.set}
                        className="px-2 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] font-mono text-slate-300"
                      >
                        S{s.set}: <strong className="text-white">{s.home}-{s.away}</strong>
                      </span>
                    ))}
                  </div>
                  {ref && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Shield className="w-3 h-3 text-[#38BDF8]" />
                      Ref: <strong className="text-slate-200">{ref.fullName}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
