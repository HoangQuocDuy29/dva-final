import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Medal,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  TOURNAMENT_AWARD_LABELS,
  Tournament,
  TournamentIndividualAward,
  TournamentTeam,
} from '../../types';
import { formatEnglishDate } from '../../utils/date';
import { buildCloudinarySrcSet, optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { TeamLogoBadge } from './TeamLogoBadge';

interface TournamentOverviewViewProps {
  tournament: Tournament;
  onSelectTeam: (team: TournamentTeam) => void;
  onOpenRegister: () => void;
}

function useCountdown(targetDate: string, targetTime?: string, active?: boolean) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return useMemo(() => {
    if (!active || !targetDate) return null;
    const [y, m, d] = targetDate.split('-').map(Number);
    const [hh, mm] = (targetTime || '07:30').split(':').map(Number);
    if (!y || !m || !d) return null;
    const target = new Date(y, m - 1, d, hh || 0, mm || 0, 0).getTime();
    const diff = target - nowMs;
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1000);
    return { days, hours, minutes, seconds };
  }, [targetDate, targetTime, active, nowMs]);
}

export const TournamentOverviewView: React.FC<TournamentOverviewViewProps> = ({
  tournament,
  onSelectTeam,
  onOpenRegister,
}) => {
  const { t } = useTranslation('tournaments');
  const countdown = useCountdown(
    tournament.startDate,
    tournament.startTime,
    tournament.status === 'UPCOMING'
  );

  const isHosted = tournament.mode === 'HOSTED';
  const paidCount = tournament.paidTeamsCount ?? tournament.teams.length;
  const pendingCount = tournament.pendingTeamsCount ?? 0;
  const maxTeams = tournament.maxTeams || 8;
  const progressPct = Math.min(100, Math.round((paidCount / Math.max(1, maxTeams)) * 100));
  const canRegister =
    isHosted &&
    tournament.status === 'UPCOMING' &&
    tournament.isRegistrationOpen &&
    paidCount < maxTeams;

  // Resolve Podium (1st, 2nd, 3rd) from finalRank / FINAL+3RD matches / podiumOverride
  const podium = useMemo(() => {
    const byRank = (rank: number) => tournament.teams.find((tm) => tm.finalRank === rank) || null;
    const first = byRank(1);
    const second = byRank(2);
    const third = byRank(3);

    const ov = tournament.podiumOverride;
    const hasData = Boolean(
      first ||
        second ||
        third ||
        ov?.firstName ||
        ov?.secondName ||
        ov?.thirdName ||
        tournament.dvaResultSummary
    );

    return {
      hasData,
      slots: [
        {
          place: '1ST',
          title: t('podium.first'),
          team: first,
          name: first?.name || ov?.firstName || '',
          logo: first?.logoUrl || ov?.firstLogo,
          accent: 'from-amber-500/20 to-yellow-500/10 border-amber-500/50 text-amber-300',
        },
        {
          place: '2ND',
          title: t('podium.second'),
          team: second,
          name: second?.name || ov?.secondName || '',
          logo: second?.logoUrl || ov?.secondLogo,
          accent: 'from-slate-400/20 to-slate-500/10 border-slate-400/40 text-slate-200',
        },
        {
          place: '3RD',
          title: t('podium.third'),
          team: third,
          name: third?.name || ov?.thirdName || '',
          logo: third?.logoUrl || ov?.thirdLogo,
          accent: 'from-orange-700/20 to-amber-800/10 border-orange-500/40 text-orange-300',
        },
      ].filter((s) => s.name),
    };
  }, [tournament, t]);

  // Collect Individual Awards from TournamentPlayer.awards + podiumOverride.awards
  const individualAwardWinners = useMemo(() => {
    const teamMap = new Map(tournament.teams.map((tm) => [tm.id, tm]));
    const list: Array<{
      id: string;
      award: string;
      playerName: string;
      team?: TournamentTeam;
      teamName: string;
      jerseyNumber?: number;
    }> = [];

    for (const pl of tournament.players) {
      for (const aw of pl.awards) {
        const tm = teamMap.get(pl.teamId);
        list.push({
          id: `${pl.id}-${aw}`,
          award: TOURNAMENT_AWARD_LABELS[aw as TournamentIndividualAward] || aw,
          playerName: pl.fullName,
          team: tm,
          teamName: tm?.name || '',
          jerseyNumber: pl.jerseyNumber,
        });
      }
    }

    if (list.length === 0 && tournament.podiumOverride?.awards?.length) {
      tournament.podiumOverride.awards.forEach((a, idx) => {
        list.push({
          id: `ov-${idx}`,
          award: TOURNAMENT_AWARD_LABELS[a.award as TournamentIndividualAward] || a.award,
          playerName: a.playerName,
          teamName: a.teamName || '',
          jerseyNumber: a.jerseyNumber,
        });
      });
    }

    return list;
  }, [tournament]);

  const bannerSrc = tournament.bannerUrl
    ? optimizeCloudinaryUrl(tournament.bannerUrl, 'detail')
    : '';
  const bannerSrcSet = tournament.bannerUrl
    ? buildCloudinarySrcSet(tournament.bannerUrl, [600, 1000, 1400])
    : undefined;

  return (
    <div className="space-y-8">
      {/* 1. HERO OVERVIEW CARD */}
      <section className="relative overflow-hidden rounded-3xl border border-[#1E293B] bg-[#111827] shadow-2xl">
        {bannerSrc && (
          <div className="relative aspect-[21/9] max-h-[340px] w-full overflow-hidden bg-[#0B0F19]">
            <img
              src={bannerSrc}
              srcSet={bannerSrcSet}
              sizes="(max-width: 768px) 100vw, 1200px"
              alt={tournament.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/45 to-transparent" />
          </div>
        )}

        <div className={`p-6 sm:p-8 ${bannerSrc ? '-mt-14 relative z-10' : ''} space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isHosted
                      ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                  }`}
                >
                  {t(`status.${tournament.mode}`)}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    tournament.status === 'ONGOING'
                      ? 'bg-red-600 text-white animate-pulse'
                      : tournament.status === 'UPCOMING'
                      ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                      : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {t(`status.${tournament.status}`)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0B0F19] border border-[#1E293B] text-slate-300">
                  {tournament.groupSetFormat} Group · {tournament.knockoutSetFormat} Knockout
                </span>
              </div>

              <h2 className="font-heading font-black text-2xl sm:text-4xl text-white tracking-tight">
                {tournament.name}
              </h2>
              {tournament.subtitle && (
                <p className="text-sm text-slate-300">{tournament.subtitle}</p>
              )}
            </div>

            {/* Countdown Box (when UPCOMING) */}
            {countdown && (
              <div className="p-4 rounded-2xl bg-[#0B0F19]/90 border border-[#1E293B] space-y-1.5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F97316]" />
                  Kick-off Countdown
                </span>
                <div className="flex items-center gap-2.5 font-mono">
                  {[
                    { v: countdown.days, u: 'D' },
                    { v: countdown.hours, u: 'H' },
                    { v: countdown.minutes, u: 'M' },
                    { v: countdown.seconds, u: 'S' },
                  ].map((item) => (
                    <div key={item.u} className="text-center px-2.5 py-1.5 rounded-xl bg-[#111827] border border-[#1E293B]">
                      <div className="text-lg font-black text-white tabular-nums">
                        {String(item.v).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] text-slate-500 font-bold">{item.u}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meta Bar */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#1E293B] text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#F97316]" />
              <strong>{formatEnglishDate(tournament.startDate)}</strong>
              {tournament.startTime && <span className="text-slate-400">· {tournament.startTime}</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#38BDF8]" />
              <span>{tournament.location}</span>
              {tournament.mapsUrl && (
                <a
                  href={tournament.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#38BDF8] hover:underline inline-flex items-center gap-0.5 ml-1"
                >
                  Map <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* DVA Result Highlight Banner (for PARTICIPATING mode) */}
      {tournament.dvaResultSummary && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-[#8B0000]/40 via-[#111827] to-[#F97316]/25 border border-[#F97316]/40 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/15 border border-[#FACC15]/40 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-[#FACC15]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-300 block">
              DVA Club Achievement
            </span>
            <p className="font-heading font-black text-lg sm:text-xl text-white">
              {tournament.dvaResultSummary}
            </p>
          </div>
        </div>
      )}

      {/* 2. CAPTAIN REGISTRATION & PROGRESS CARD (HOSTED + UPCOMING) */}
      {isHosted && tournament.status === 'UPCOMING' && (
        <section className="rounded-3xl border border-[#1E293B] bg-[#111827] p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#F97316]" />
                <span>{t('registration.title')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Team captains submit one unified roster (6–14 players) and lock their slot via VietQR transfer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/tournaments/${tournament.slug}/rules`}
                className="px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-[#38BDF8]" />
                <span>{t('prep.viewRules')}</span>
              </Link>

              <button
                type="button"
                disabled={!canRegister}
                onClick={onOpenRegister}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                  canRegister
                    ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white cursor-pointer'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {paidCount >= maxTeams
                    ? t('registration.ctaFull')
                    : !tournament.isRegistrationOpen
                    ? t('registration.ctaClosed')
                    : t('registration.ctaOpen')}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1E293B]">
            <div className="p-4 rounded-2xl bg-[#0B0F19] border border-[#1E293B] space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">{t('registration.confirmedProgress')}</span>
                <span className="font-mono font-black text-emerald-400">
                  {paidCount} / {maxTeams} Teams
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#F97316] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {pendingCount > 0 && (
                <p className="text-[11px] text-amber-300">
                  {t('registration.pendingNote', { count: pendingCount })}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#0B0F19] border border-[#1E293B] flex flex-col justify-center">
              <span className="text-[11px] text-slate-400 font-semibold">{t('registration.entryFee')}</span>
              <span className="font-mono font-black text-xl text-[#FACC15] mt-0.5 whitespace-nowrap">
                {tournament.entryFeePerTeam > 0
                  ? `${tournament.entryFeePerTeam.toLocaleString('vi-VN')} đ`
                  : t('registration.freeEntry')}
              </span>
              {tournament.registrationDeadline && (
                <span className="text-[10px] text-slate-500 mt-1">
                  {t('registration.deadline')}: {formatEnglishDate(tournament.registrationDeadline)}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. PODIUM & INDIVIDUAL AWARDS (When Completed or Podium Data Exists) */}
      {(tournament.status === 'COMPLETED' || podium.slots.length > 0 || individualAwardWinners.length > 0) && (
        <section className="space-y-5">
          {podium.slots.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FACC15]" />
                <span>{t('podium.title')}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {podium.slots.map((slot) => (
                  <button
                    key={slot.place}
                    type="button"
                    disabled={!slot.team}
                    onClick={() => slot.team && onSelectTeam(slot.team)}
                    className={`text-left p-5 rounded-3xl bg-gradient-to-br ${slot.accent} border flex items-center gap-4 transition-transform ${
                      slot.team ? 'hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <TeamLogoBadge
                      logoUrl={slot.logo}
                      name={slot.name}
                      shortName={slot.team?.shortName}
                      sizeClass="w-14 h-14"
                      imgWidth={160}
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-90 block">
                        {slot.title}
                      </span>
                      <span className="font-heading font-black text-base text-white truncate block">
                        {slot.name}
                      </span>
                      {slot.team && (
                        <span className="text-[11px] text-slate-300 underline decoration-dotted">
                          View Squad Roster
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {individualAwardWinners.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-heading font-black text-base text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FACC15]" />
                <span>{t('podium.individualTitle')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {individualAwardWinners.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    disabled={!w.team}
                    onClick={() => w.team && onSelectTeam(w.team)}
                    className={`text-left p-4 rounded-2xl bg-[#111827] border border-[#FACC15]/30 space-y-1 ${
                      w.team ? 'hover:border-[#FACC15] cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FACC15]">
                      {w.award}
                    </span>
                    <div className="font-bold text-sm text-white truncate">
                      {w.playerName}
                      {w.jerseyNumber ? ` #${w.jerseyNumber}` : ''}
                    </div>
                    {w.teamName && <div className="text-[11px] text-slate-400 truncate">{w.teamName}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. FLEXIBLE PRIZE STRUCTURE */}
      {tournament.prizeConfig?.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-[#F97316]" />
            <span>{t('podium.prizesTitle')}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {tournament.prizeConfig.map((p, idx) => (
              <div
                key={`${p.rank}-${idx}`}
                className="rounded-2xl bg-[#111827] border border-[#1E293B] p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] font-mono text-[10px] font-black text-[#F97316]">
                    {p.rank}
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{p.label}</div>
                {p.cashAmount && p.cashAmount > 0 ? (
                  <div className="font-mono font-black text-base text-[#FACC15] whitespace-nowrap">
                    {p.cashAmount.toLocaleString('vi-VN')} đ
                  </div>
                ) : null}
                {p.nonCashReward && (
                  <p className="text-[11px] text-slate-400 leading-snug">{p.nonCashReward}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. CONFIRMED PARTICIPATING TEAMS GRID (Clickable -> Roster Drawer) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#38BDF8]" />
            <span>Participating Teams ({tournament.teams.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">Click any team to inspect squad roster &amp; match history</span>
        </div>

        {tournament.teams.length === 0 ? (
          <div className="rounded-2xl bg-[#111827] border border-[#1E293B] p-8 text-center text-xs text-slate-500">
            Confirmed teams will appear here once registrations are verified.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tournament.teams.map((tm) => {
              const count = tournament.players.filter((p) => p.teamId === tm.id).length;
              return (
                <button
                  key={tm.id}
                  type="button"
                  onClick={() => onSelectTeam(tm)}
                  className="text-left p-4 rounded-2xl bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] hover:border-[#F97316]/50 transition-all flex items-center gap-3 cursor-pointer group"
                >
                  <TeamLogoBadge
                    logoUrl={tm.logoUrl}
                    name={tm.name}
                    shortName={tm.shortName}
                    sizeClass="w-11 h-11"
                    imgWidth={96}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-white group-hover:text-orange-400 transition-colors truncate">
                      {tm.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      {tm.pool && <span className="font-mono text-[#38BDF8]">Pool {tm.pool}</span>}
                      <span>· {count} players</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
