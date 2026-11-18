import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, FileText, GitBranch, ShieldCheck, Trophy } from 'lucide-react';
import { Tournament, TournamentTeam } from '../types';
import { tournamentService } from '../services/api';
import {
  formatTournamentScheduleDisplay,
  formatYmdToDdMmYyyy,
  resolveDefaultTournament,
} from '../shared/tournaments';
import { ShareButton } from '../components/common/ShareButton';
import { TournamentOverviewView } from '../components/tournaments/TournamentOverviewView';
import { TournamentBracketView } from '../components/tournaments/TournamentBracketView';
import { TournamentScheduleView } from '../components/tournaments/TournamentScheduleView';
import {
  TournamentOfficialsView,
  TournamentRulesView,
} from '../components/tournaments/TournamentRulesAndOfficialsView';
import { TeamRosterDrawer } from '../components/tournaments/TeamRosterDrawer';
import { CaptainRegisterModal } from '../components/tournaments/CaptainRegisterModal';

type SubView = 'overview' | 'bracket' | 'schedule' | 'rules' | 'officials';
const VALID_SUBVIEWS: readonly SubView[] = ['overview', 'bracket', 'schedule', 'rules', 'officials'] as const;

export const TournamentsPage: React.FC = () => {
  const { t } = useTranslation('tournaments');
  const navigate = useNavigate();
  const { slug, subView } = useParams<{ slug?: string; subView?: string }>();

  const [initialCache] = useState(() => tournamentService.getCachedTournaments());
  const [tournaments, setTournaments] = useState<Tournament[]>(() =>
    initialCache ? initialCache.data : []
  );
  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [selectedTeamForDrawer, setSelectedTeamForDrawer] = useState<TournamentTeam | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const loadTournaments = useCallback(async (forceRefresh = false) => {
    try {
      const list = await tournamentService.getTournaments({ forceRefresh });
      setTournaments(list);
    } catch (err) {
      console.error('[TournamentsPage] Failed loading tournaments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTournaments(true);
  }, [loadTournaments]);

  // Handle direct /tournaments/rules or /tournaments/bracket shortcuts without a slug
  const resolvedSlug = useMemo(() => {
    if (!slug) return undefined;
    const lowered = slug.toLowerCase();
    if ((VALID_SUBVIEWS as readonly string[]).includes(lowered)) {
      const def = resolveDefaultTournament(tournaments);
      return def ? def.slug : undefined;
    }
    return slug;
  }, [slug, tournaments]);

  const activeSubView: SubView = useMemo(() => {
    if (slug && (VALID_SUBVIEWS as readonly string[]).includes(slug.toLowerCase()) && !subView) {
      return slug.toLowerCase() as SubView;
    }
    const candidate = (subView || 'overview').toLowerCase();
    return (VALID_SUBVIEWS as readonly string[]).includes(candidate)
      ? (candidate as SubView)
      : 'overview';
  }, [slug, subView]);

  const activeTournament = useMemo(() => {
    if (tournaments.length === 0) return null;
    if (resolvedSlug) {
      const exact = tournaments.find((item) => item.slug === resolvedSlug || item.id === resolvedSlug);
      if (exact) return exact;
    }
    return resolveDefaultTournament(tournaments);
  }, [tournaments, resolvedSlug]);

  // Visibility-aware 15s polling ONLY when the active tournament is LIVE (ONGOING)
  useEffect(() => {
    if (!activeTournament || activeTournament.status !== 'ONGOING') return undefined;
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const fresh = await tournamentService.getTournament(activeTournament.slug, { noCache: true });
        setTournaments((prev) => prev.map((item) => (item.id === fresh.id ? fresh : item)));
      } catch {
        // ignore transient errors
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [activeTournament]);

  const handleSwitchTournament = (nextSlug: string) => {
    const suffix = activeSubView === 'overview' ? '' : `/${activeSubView}`;
    navigate(`/tournaments/${nextSlug}${suffix}`);
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-10 w-72 rounded-xl bg-slate-800/80" />
          <div className="h-64 w-full rounded-3xl bg-slate-800/60" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 rounded-2xl bg-slate-800/60" />
            <div className="h-32 rounded-2xl bg-slate-800/60" />
            <div className="h-32 rounded-2xl bg-slate-800/60" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-24 px-4 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#1E293B] flex items-center justify-center text-[#F97316]">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="font-heading font-black text-2xl sm:text-3xl">{t('header.emptyTitle')}</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md">{t('header.emptyDesc')}</p>
        <Link
          to="/news"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] text-xs font-bold text-white shadow"
        >
          Browse Club News
        </Link>
      </div>
    );
  }

  const navTabs: Array<{ id: SubView; label: string; icon: React.ComponentType<{ className?: string }>; hidden?: boolean }> = [
    { id: 'overview', label: t('tabs.overview'), icon: Trophy },
    {
      id: 'bracket',
      label: t('tabs.bracket'),
      icon: GitBranch,
      hidden: activeTournament.trackingMode === 'DVA_FOCUS',
    },
    { id: 'schedule', label: t('tabs.schedule'), icon: CalendarDays },
    { id: 'rules', label: t('tabs.rules'), icon: FileText },
    { id: 'officials', label: t('tabs.officials'), icon: ShieldCheck },
  ];

  const shareUrl = `${window.location.origin}/tournaments/${activeTournament.slug}${
    activeSubView === 'overview' ? '' : `/${activeSubView}`
  }`;

  const visibleNavTabs = navTabs.filter((tab) => !tab.hidden);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-8 sm:py-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Persistent Header & Smart Tournament Switcher */}
        <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-4 sm:p-6 space-y-5 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full min-w-0">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#F97316]">
                {t('header.eyebrow')}
              </span>
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-white">
                {t('header.title')}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 pt-0.5">
                <span className="font-bold text-white">{activeTournament.name}</span>
                <span className="font-mono text-[#FACC15]">
                  · {formatTournamentScheduleDisplay(activeTournament)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto min-w-0 max-w-full">
              {/* Tournament Switcher Dropdown */}
              <div className="relative w-full sm:w-auto min-w-0 max-w-full overflow-hidden rounded-xl">
                <select
                  aria-label={t('header.switcherLabel')}
                  value={activeTournament.slug}
                  onChange={(e) => handleSwitchTournament(e.target.value)}
                  className="w-full min-w-0 max-w-full truncate appearance-none pl-3 sm:pl-4 pr-9 sm:pr-10 py-2.5 box-border rounded-xl bg-[#0B0F19] border border-[#1E293B] hover:border-[#F97316]/60 text-[11px] sm:text-sm font-bold text-white cursor-pointer focus:outline-none"
                >
                  {tournaments.map((item) => (
                    <option key={item.id} value={item.slug}>
                      {item.status === 'ONGOING'
                        ? '🔴 LIVE · '
                        : item.status === 'UPCOMING'
                        ? '🗓 UPCOMING · '
                        : '🏆 COMPLETED · '}
                      {item.name} ({formatYmdToDdMmYyyy(item.startDate)})
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-px bottom-px right-px w-11 rounded-r-[11px] bg-gradient-to-l from-[#0B0F19] via-[#0B0F19] to-transparent flex items-center justify-end pr-2.5 z-10"
                >
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </span>
              </div>

              <div className="flex items-center justify-start shrink-0">
                <ShareButton
                  url={shareUrl}
                  title={activeTournament.name}
                  text={`Follow ${activeTournament.name} on DVA Volleyball Club`}
                  label={t('header.shareTournament')}
                />
              </div>
            </div>
          </div>

          {/* Sub-view Navigation Pills */}
          <nav
            aria-label="Tournament sections"
            className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-1.5 pt-4 border-t border-[#1E293B]"
          >
            {visibleNavTabs.map(({ id, label, icon: Icon }, idx) => {
              const isActive = activeSubView === id;
              const to =
                id === 'overview'
                  ? `/tournaments/${activeTournament.slug}`
                  : `/tournaments/${activeTournament.slug}/${id}`;
              const isOddLast = visibleNavTabs.length % 2 === 1 && idx === visibleNavTabs.length - 1;
              return (
                <Link
                  key={id}
                  to={to}
                  className={`px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-center sm:text-left leading-tight transition-all min-w-0 ${
                    isOddLast ? 'col-span-2 sm:col-span-1' : ''
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white shadow'
                      : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Active Sub-view Content */}
        {activeSubView === 'overview' && (
          <TournamentOverviewView
            tournament={activeTournament}
            onSelectTeam={setSelectedTeamForDrawer}
            onOpenRegister={() => setRegisterModalOpen(true)}
          />
        )}

        {activeSubView === 'bracket' && (
          <TournamentBracketView
            tournament={activeTournament}
            onSelectTeam={setSelectedTeamForDrawer}
            onOpenRegister={() => setRegisterModalOpen(true)}
          />
        )}

        {activeSubView === 'schedule' && (
          <TournamentScheduleView
            tournament={activeTournament}
            onSelectTeam={setSelectedTeamForDrawer}
            onOpenRegister={() => setRegisterModalOpen(true)}
          />
        )}

        {activeSubView === 'rules' && (
          <TournamentRulesView
            tournament={activeTournament}
            onSelectTeam={setSelectedTeamForDrawer}
            onOpenRegister={() => setRegisterModalOpen(true)}
          />
        )}

        {activeSubView === 'officials' && (
          <TournamentOfficialsView tournament={activeTournament} />
        )}
      </div>

      {/* Team Roster & Match Journey Slide-over Drawer */}
      <TeamRosterDrawer
        tournament={activeTournament}
        team={selectedTeamForDrawer}
        onClose={() => setSelectedTeamForDrawer(null)}
      />

      {/* Team Captain Unified Registration + VietQR Modal */}
      <CaptainRegisterModal
        isOpen={registerModalOpen}
        tournament={activeTournament}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={() => loadTournaments(true)}
      />
    </div>
  );
};
