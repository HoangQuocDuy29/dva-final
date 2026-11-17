import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Trophy,
  Unlock,
  Users,
  Wallet,
  CalendarClock,
} from 'lucide-react';
import { Tournament, TournamentFinanceSummary } from '../../../types';
import { tournamentService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { TournamentFormModal } from '../components/tournaments/TournamentFormModal';
import { TeamsFeesPanel } from '../components/tournaments/TeamsFeesPanel';
import { CourtsideMatchesPanel } from '../components/tournaments/CourtsideMatchesPanel';
import { OfficialsPanel } from '../components/tournaments/OfficialsPanel';

type AdminTourSubTab = 'TEAMS' | 'MATCHES' | 'OFFICIALS';

function toFinanceSummary(t: Tournament): TournamentFinanceSummary {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    mode: t.mode,
    status: t.status,
    startDate: t.startDate,
    entryFeePerTeam: t.entryFeePerTeam,
    maxTeams: t.maxTeams,
    teams: (t.teams || []).map((tm) => ({
      id: tm.id,
      name: tm.name,
      paymentStatus: tm.paymentStatus,
      entryFeeAmount: tm.entryFeeAmount,
      paidAt: tm.paidAt,
      createdAt: tm.createdAt,
    })),
  };
}

export const TournamentsTab: React.FC = () => {
  const {
    notify,
    data: { tournamentsList },
    setData: { setTournamentsList, setTournamentsSummary },
  } = useAdminDashboard();
  const metrics = useAdminMetrics();

  const [selectedId, setSelectedId] = useState<string>('');
  const [subTab, setSubTab] = useState<AdminTourSubTab>('TEAMS');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentsList.length > 0 && !tournamentsList.some((t) => t.id === selectedId)) {
      setSelectedId(tournamentsList[0].id);
    }
  }, [tournamentsList, selectedId]);

  const selectedTournament = useMemo(
    () => tournamentsList.find((t) => t.id === selectedId) || tournamentsList[0] || null,
    [tournamentsList, selectedId]
  );

  const refreshTournaments = async () => {
    const fresh = await tournamentService.getTournaments({ adminMode: true });
    setTournamentsList(fresh);
    setTournamentsSummary(fresh.filter((t) => t.mode === 'HOSTED').map(toFinanceSummary));
  };

  const handleSaveTournament = async (payload: Partial<Tournament>, existingId?: string) => {
    if (existingId) {
      const updated = await tournamentService.updateTournament(existingId, payload);
      setTournamentsList((prev) => prev.map((t) => (t.id === existingId ? updated : t)));
      setSelectedId(updated.id);
      notify(`Updated tournament "${updated.name}".`);
    } else {
      const created = await tournamentService.createTournament(payload);
      setTournamentsList((prev) => [created, ...prev]);
      setSelectedId(created.id);
      notify(`Created tournament "${created.name}".`);
    }
    await refreshTournaments();
  };

  const handleToggleVisibility = async (t: Tournament) => {
    try {
      const updated = await tournamentService.toggleVisibility(t.id, !t.isActive);
      setTournamentsList((prev) => prev.map((item) => (item.id === t.id ? updated : item)));
      notify(`"${t.name}" is now ${updated.isActive ? 'Published' : 'Hidden (Draft)'}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to toggle visibility.');
    }
  };

  const handleToggleRegistration = async (t: Tournament) => {
    try {
      const updated = await tournamentService.toggleRegistration(t.id, !t.isRegistrationOpen);
      setTournamentsList((prev) => prev.map((item) => (item.id === t.id ? updated : item)));
      notify(`Registration for "${t.name}" is now ${updated.isRegistrationOpen ? 'OPEN' : 'CLOSED'}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to toggle registration.');
    }
  };

  const handleDeleteTournament = async (t: Tournament) => {
    if (!window.confirm(`Delete tournament "${t.name}" permanently?`)) return;
    try {
      await tournamentService.deleteTournament(t.id);
      await refreshTournaments();
      notify(`Deleted tournament "${t.name}".`);
    } catch (err: any) {
      notify(err?.message || 'Unable to delete tournament.');
    }
  };

  const copyLink = (key: string, path: string) => {
    const full = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(full);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    notify(`Copied link: ${full}`);
  };

  const kpis = [
    {
      icon: Wallet,
      label: 'Verified Hosted Fees (PAID)',
      value: `${metrics.tournamentRevenue.toLocaleString('vi-VN')} đ`,
      tone: 'text-[#EC4899]',
    },
    {
      icon: Users,
      label: 'Pending Team Verifications',
      value: `${metrics.pendingTournamentFeesCount} Teams`,
      tone: 'text-amber-400',
    },
    {
      icon: Trophy,
      label: 'Total Tournaments',
      value: `${tournamentsList.length} (${metrics.hostedTournamentsCount} Hosted)`,
      tone: 'text-[#38BDF8]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#EC4899]/10 border border-[#EC4899]/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#EC4899]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-xl text-white">Tournaments &amp; Leagues Hub</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-emerald-950 text-emerald-400 border border-emerald-800">
                Live &amp; VietQR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manage DVA Hosted cups, Away tournaments, VietQR entry fees, 2-court schedules &amp; courtside scoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/tournaments"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#111827] hover:bg-[#1E293B] text-slate-200 border border-[#1E293B] transition-colors"
          >
            View Public /tournaments
          </a>
          <button
            type="button"
            onClick={() => {
              setEditingTournament(null);
              setFormOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Tournament</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">{label}</span>
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className={`font-mono font-black text-2xl tabular-nums ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tournament Selector Pills */}
      {tournamentsList.length === 0 ? (
        <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-12 text-center space-y-3">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-white">No Tournaments Created Yet</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click <strong>+ Create Tournament</strong> to set up your first DVA Hosted cup or log a DVA Participating away event.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {tournamentsList.map((t) => {
              const active = selectedTournament?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-[#161F30] border-[#F97316] text-white shadow'
                      : 'bg-[#111827] border-[#1E293B] text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      t.status === 'ONGOING'
                        ? 'bg-red-500 animate-pulse'
                        : t.status === 'UPCOMING'
                        ? 'bg-sky-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>{t.name}</span>
                  <span className="text-[10px] font-mono opacity-75">
                    ({t.mode === 'HOSTED' ? 'Hosted' : 'Away'})
                  </span>
                  {!t.isActive && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">
                      DRAFT
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedTournament && (
            <div className="space-y-5">
              {/* Selected Tournament Header Bar */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-black text-lg text-white">
                      {selectedTournament.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        selectedTournament.mode === 'HOSTED'
                          ? 'bg-orange-950/60 text-orange-300 border-orange-700/60'
                          : 'bg-sky-950/60 text-sky-300 border-sky-700/60'
                      }`}
                    >
                      {selectedTournament.mode === 'HOSTED'
                        ? 'DVA Hosted (Revenue On)'
                        : `Away · ${selectedTournament.trackingMode}`}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-200">
                      {selectedTournament.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{selectedTournament.startDate}{selectedTournament.startTime ? ` · ${selectedTournament.startTime}` : ''}</span>
                    <span>· {selectedTournament.location}</span>
                    {selectedTournament.mode === 'HOSTED' && (
                      <span className="font-mono text-[#FACC15] font-bold">
                        · Fee: {selectedTournament.entryFeePerTeam.toLocaleString('vi-VN')} đ/team
                      </span>
                    )}
                    {selectedTournament.internalExpenseNote && (
                      <span className="text-sky-300">· Note: {selectedTournament.internalExpenseNote}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => copyLink('rules', `/tournaments/${selectedTournament.slug}/rules`)}
                    className="px-3 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-sky-300 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    title="Copy direct Rules link for Zalo Captain Group"
                  >
                    {copiedKey === 'rules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Rules Link</span>
                  </button>

                  {selectedTournament.mode === 'HOSTED' && (
                    <button
                      type="button"
                      onClick={() => handleToggleRegistration(selectedTournament)}
                      className={`px-3 py-2 rounded-xl border font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                        selectedTournament.isRegistrationOpen
                          ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {selectedTournament.isRegistrationOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{selectedTournament.isRegistrationOpen ? 'Reg Open' : 'Reg Closed'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(selectedTournament)}
                    className={`px-3 py-2 rounded-xl border font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                      selectedTournament.isActive
                        ? 'bg-sky-950/60 border-sky-700 text-sky-300'
                        : 'bg-amber-950/60 border-amber-700 text-amber-300'
                    }`}
                  >
                    {selectedTournament.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{selectedTournament.isActive ? 'Published' : 'Draft'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTournament(selectedTournament);
                      setFormOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTournament(selectedTournament)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
                    title="Delete tournament"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-view Segmented Control */}
              <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
                {[
                  { id: 'TEAMS' as const, label: 'Teams, Fees & Rosters', icon: Users },
                  { id: 'MATCHES' as const, label: 'Matches, Standings & Live Scorer', icon: CalendarClock },
                  { id: 'OFFICIALS' as const, label: 'Referees & Officials', icon: ShieldCheck },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSubTab(id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                      subTab === id
                        ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white shadow'
                        : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {subTab === 'TEAMS' && (
                <TeamsFeesPanel
                  tournament={selectedTournament}
                  onRefresh={refreshTournaments}
                  notify={notify}
                />
              )}
              {subTab === 'MATCHES' && (
                <CourtsideMatchesPanel
                  tournament={selectedTournament}
                  onRefresh={refreshTournaments}
                  notify={notify}
                />
              )}
              {subTab === 'OFFICIALS' && (
                <div className="space-y-5">
                  <OfficialsPanel
                    tournament={selectedTournament}
                    onRefresh={refreshTournaments}
                    notify={notify}
                  />
                  {selectedTournament.rulesContent && (
                    <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#F97316]" />
                          Rules Preview
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTournament(selectedTournament);
                            setFormOpen(true);
                          }}
                          className="text-xs text-[#38BDF8] font-bold hover:underline cursor-pointer"
                        >
                          Edit Rules
                        </button>
                      </div>
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedTournament.rulesContent}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <TournamentFormModal
        isOpen={formOpen}
        editing={editingTournament}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveTournament}
        notify={notify}
      />
    </div>
  );
};
