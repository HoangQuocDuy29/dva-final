import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarPlus,
  CheckCircle2,
  GitBranch,
  Minus,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  Tournament,
  TournamentMatch,
  TournamentMatchStage,
  TournamentMatchStatus,
  TournamentSetFormat,
  TournamentSetScore,
} from '../../../../types';
import { computePoolStandings } from '../../../../shared/tournaments';
import { tournamentService } from '../../../../services/api';

interface CourtsideMatchesPanelProps {
  tournament: Tournament;
  onRefresh: () => Promise<void>;
  notify: (msg: string, durationMs?: number) => void;
}

export const CourtsideMatchesPanel: React.FC<CourtsideMatchesPanelProps> = ({
  tournament,
  onRefresh,
  notify,
}) => {
  const [filterCourt, setFilterCourt] = useState<'ALL' | 'Court 1' | 'Court 2' | 'POOL' | 'KNOCKOUT'>('ALL');
  const [busyAction, setBusyAction] = useState(false);

  // Live Scorer Modal state
  const [scoringMatch, setScoringMatch] = useState<TournamentMatch | null>(null);
  const [editStatus, setEditStatus] = useState<TournamentMatchStatus>('SCHEDULED');
  const [editCourt, setEditCourt] = useState('Court 1');
  const [editTime, setEditTime] = useState('');
  const [editFormat, setEditFormat] = useState<TournamentSetFormat>('BO3');
  const [editHomeId, setEditHomeId] = useState<string>('');
  const [editAwayId, setEditAwayId] = useState<string>('');
  const [editHomeLabel, setEditHomeLabel] = useState('');
  const [editAwayLabel, setEditAwayLabel] = useState('');
  const [editOfficialId, setEditOfficialId] = useState('');
  const [editSets, setEditSets] = useState<TournamentSetScore[]>([
    { set: 1, home: 0, away: 0, isCompleted: false },
  ]);

  // Quick Add Match (DVA_FOCUS / custom)
  const [addMatchOpen, setAddMatchOpen] = useState(false);
  const [newCode, setNewCode] = useState('M-1');
  const [newStage, setNewStage] = useState<TournamentMatchStage>('GROUP');
  const [newCourt, setNewCourt] = useState('Court 1');
  const [newTime, setNewTime] = useState('09:00');
  const [newHomeId, setNewHomeId] = useState('');
  const [newAwayId, setNewAwayId] = useState('');
  const [newHomeLabel, setNewHomeLabel] = useState('');
  const [newAwayLabel, setNewAwayLabel] = useState('');

  const teamById = useMemo(
    () => new Map(tournament.teams.map((t) => [t.id, t])),
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

  const filteredMatches = useMemo(() => {
    return tournament.matches.filter((m) => {
      if (filterCourt === 'Court 1' || filterCourt === 'Court 2') return m.courtName === filterCourt;
      if (filterCourt === 'POOL') return m.stage === 'POOL_A' || m.stage === 'POOL_B' || m.stage === 'GROUP';
      if (filterCourt === 'KNOCKOUT') {
        return ['QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'].includes(m.stage);
      }
      return true;
    });
  }, [tournament.matches, filterCourt]);

  const handleGenerateSchedule = async () => {
    const hasMatches = tournament.matches.length > 0;
    const forceReset = hasMatches
      ? window.confirm(
          'This will replace existing matches for this tournament with the standard 20-match 2-court 1-day schedule. Continue?'
        )
      : false;
    if (hasMatches && !forceReset) return;

    setBusyAction(true);
    try {
      await tournamentService.generateSchedule(tournament.id, forceReset);
      await onRefresh();
      notify('Generated balanced 20-match 2-court schedule!');
    } catch (err: any) {
      notify(err?.message || 'Unable to generate schedule.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSeedKnockout = async () => {
    setBusyAction(true);
    try {
      const res = await tournamentService.seedKnockout(tournament.id, false);
      await onRefresh();
      if (res.warnings.length > 0) {
        notify(res.warnings[0], 5000);
      } else {
        notify('Quarterfinals (QF1–QF4) seeded from Pool A & Pool B standings!');
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to seed Quarterfinals.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSwapCourt = async (match: TournamentMatch) => {
    const nextCourt = match.courtName === 'Court 1' ? 'Court 2' : 'Court 1';
    try {
      await tournamentService.updateMatchScore(tournament.id, match.id, { courtName: nextCourt });
      await onRefresh();
      notify(`Moved ${match.matchCode} to ${nextCourt}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to move match court.');
    }
  };

  const handleQuickOfficial = async (match: TournamentMatch, officialId: string) => {
    try {
      await tournamentService.updateMatchScore(tournament.id, match.id, {
        officialId: officialId || null,
      });
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Unable to assign official.');
    }
  };

  const handleManualRankChange = async (teamId: string, val: string) => {
    const num = val === '' ? null : Math.max(1, Math.min(8, Number(val)));
    try {
      await tournamentService.updateTeam(tournament.id, teamId, { manualRankOverride: num });
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Unable to update manual rank.');
    }
  };

  const openScorer = (match: TournamentMatch) => {
    setScoringMatch(match);
    setEditStatus(match.status);
    setEditCourt(match.courtName || 'Court 1');
    setEditTime(match.scheduledTime || '');
    setEditFormat((match.setFormat as TournamentSetFormat) || 'BO3');
    setEditHomeId(match.homeTeamId || '');
    setEditAwayId(match.awayTeamId || '');
    setEditHomeLabel(match.homeLabel || '');
    setEditAwayLabel(match.awayLabel || '');
    setEditOfficialId(match.officialId || '');
    setEditSets(
      match.setScores?.length
        ? match.setScores.map((s) => ({ ...s }))
        : [{ set: 1, home: 0, away: 0, isCompleted: false }]
    );
  };

  const stepPoint = (setIdx: number, side: 'home' | 'away', delta: number) => {
    setEditSets((prev) =>
      prev.map((s, idx) =>
        idx === setIdx ? { ...s, [side]: Math.max(0, Math.min(99, s[side] + delta)) } : s
      )
    );
  };

  const saveScore = async (overrideStatus?: TournamentMatchStatus) => {
    if (!scoringMatch) return;
    const targetStatus = overrideStatus || editStatus;
    const normalizedSets = editSets.map((s) =>
      targetStatus === 'COMPLETED' ? { ...s, isCompleted: true } : s
    );

    setBusyAction(true);
    try {
      const res = await tournamentService.updateMatchScore(tournament.id, scoringMatch.id, {
        status: targetStatus,
        courtName: editCourt,
        scheduledTime: editTime || undefined,
        setFormat: editFormat,
        homeTeamId: editHomeId || null,
        awayTeamId: editAwayId || null,
        homeLabel: editHomeLabel.trim() || undefined,
        awayLabel: editAwayLabel.trim() || undefined,
        officialId: editOfficialId || null,
        setScores: normalizedSets,
      });
      await onRefresh();
      setScoringMatch(null);
      if (res.warnings?.length > 0) {
        notify(`Saved ${scoringMatch.matchCode} — Notice: ${res.warnings.join(' ')}`, 6000);
      } else {
        notify(
          targetStatus === 'COMPLETED'
            ? `${scoringMatch.matchCode} completed & standings/bracket updated!`
            : `Updated live score for ${scoringMatch.matchCode}.`
        );
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to save match score.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddCustomMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setBusyAction(true);
    try {
      await tournamentService.createMatch(tournament.id, {
        matchCode: newCode.trim().toUpperCase(),
        stage: newStage,
        courtName: newCourt,
        scheduledTime: newTime || undefined,
        setFormat: tournament.groupSetFormat || 'BO3',
        homeTeamId: newHomeId || null,
        awayTeamId: newAwayId || null,
        homeLabel: newHomeLabel.trim() || teamById.get(newHomeId)?.name || 'Home',
        awayLabel: newAwayLabel.trim() || teamById.get(newAwayId)?.name || 'Opponent',
      });
      setAddMatchOpen(false);
      await onRefresh();
      notify('Custom match added.');
    } catch (err: any) {
      notify(err?.message || 'Unable to add match.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteMatch = async (m: TournamentMatch) => {
    if (!window.confirm(`Delete match ${m.matchCode}?`)) return;
    try {
      await tournamentService.deleteMatch(tournament.id, m.id);
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Unable to delete match.');
    }
  };

  const renderPoolPreview = (label: string, rows: typeof standingsA) => (
    <div className="rounded-2xl bg-[#111827] border border-[#1E293B] p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <h5 className="font-bold text-xs text-white uppercase tracking-wider">{label}</h5>
        <span className="text-[10px] text-slate-400">W → Pts → Set Ratio → Pt Ratio → H2H</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-3">Assign teams to {label} in the Teams tab.</p>
      ) : (
        <table className="w-full text-[11px] text-left">
          <thead>
            <tr className="text-slate-500 border-b border-[#1E293B]">
              <th className="py-1.5">#</th>
              <th className="py-1.5">Team</th>
              <th className="py-1.5 text-center">W-L</th>
              <th className="py-1.5 text-center">Pts</th>
              <th className="py-1.5 text-center">Sets</th>
              <th className="py-1.5 text-right">Manual #</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/70">
            {rows.map((r) => (
              <tr key={r.teamId}>
                <td className="py-1.5 font-mono font-bold text-[#F97316]">{r.rank}</td>
                <td className="py-1.5 font-semibold text-white">
                  <span>{r.teamName}</span>
                  {r.hasTieWarning && (
                    <span
                      title="Exact statistical tie — verify H2H or set Manual Rank"
                      className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded bg-amber-950 text-amber-300 text-[9px]"
                    >
                      TIE
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-center font-mono text-slate-300">
                  {r.wins}-{r.losses}
                </td>
                <td className="py-1.5 text-center font-mono font-bold text-[#FACC15]">{r.fivbPoints}</td>
                <td className="py-1.5 text-center font-mono text-slate-400">
                  {r.setsWon}:{r.setsLost}
                </td>
                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    min={1}
                    max={4}
                    placeholder="-"
                    value={r.manualRankOverride ?? ''}
                    onChange={(e) => handleManualRankChange(r.teamId, e.target.value)}
                    className="w-10 px-1 py-0.5 text-center rounded bg-[#0B0F19] border border-[#1E293B] font-mono text-white"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Pool Standings & Bracket Controls (for FULL_BRACKET) */}
      {tournament.trackingMode === 'FULL_BRACKET' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderPoolPreview('Pool A Standings', standingsA)}
          {renderPoolPreview('Pool B Standings', standingsB)}
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#111827] border border-[#1E293B]">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['ALL', 'Court 1', 'Court 2', 'POOL', 'KNOCKOUT'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterCourt(tab)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filterCourt === tab
                  ? 'bg-[#F97316] text-white'
                  : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              {tab === 'ALL' ? `All (${tournament.matches.length})` : tab}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {tournament.trackingMode === 'FULL_BRACKET' && (
            <>
              <button
                type="button"
                disabled={busyAction}
                onClick={handleGenerateSchedule}
                className="px-3.5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-[#38BDF8] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Generate 20-Match 2-Court Schedule</span>
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={handleSeedKnockout}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Seed Quarterfinals (QF1–QF4)</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setAddMatchOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Match</span>
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-10 text-center text-xs text-slate-500">
          No matches yet. Assign 4 teams to Pool A and 4 teams to Pool B, then click{' '}
          <strong className="text-[#38BDF8]">Generate 20-Match 2-Court Schedule</strong> (or click{' '}
          <strong className="text-white">+ Add Match</strong> for DVA Focus mode).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMatches.map((m) => {
            const homeName = (m.homeTeamId && teamById.get(m.homeTeamId)?.name) || m.homeLabel || 'TBD';
            const awayName = (m.awayTeamId && teamById.get(m.awayTeamId)?.name) || m.awayLabel || 'TBD';
            return (
              <div
                key={m.id}
                className={`rounded-2xl bg-[#111827] border p-4 space-y-3 text-xs ${
                  m.status === 'LIVE'
                    ? 'border-red-500/70 shadow-lg shadow-red-950/20'
                    : 'border-[#1E293B]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] font-mono font-bold text-white">
                      {m.matchCode}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{m.stage}</span>
                    {m.scheduledTime && (
                      <span className="font-mono text-[11px] text-slate-300">· {m.scheduledTime}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSwapCourt(m)}
                      className="px-2 py-0.5 rounded-lg bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-sky-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                      title="Swap between Court 1 & Court 2"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>{m.courtName}</span>
                    </button>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        m.status === 'LIVE'
                          ? 'bg-red-600 text-white animate-pulse'
                          : m.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>

                {/* Teams & Set Scoreline */}
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className={`font-bold truncate ${m.winnerTeamId && m.winnerTeamId === m.homeTeamId ? 'text-emerald-400' : 'text-white'}`}>
                      {homeName}
                    </div>
                    <div className={`font-bold truncate ${m.winnerTeamId && m.winnerTeamId === m.awayTeamId ? 'text-emerald-400' : 'text-white'}`}>
                      {awayName}
                    </div>
                  </div>

                  <div className="text-right font-mono space-y-1 shrink-0">
                    <div className="text-base font-black text-[#FACC15]">
                      {m.homeSetsWon} - {m.awaySetsWon}
                    </div>
                    {m.setScores?.length > 0 && (
                      <div className="text-[10px] text-slate-400">
                        {m.setScores.map((s) => `${s.home}-${s.away}`).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
                  <select
                    value={m.officialId || ''}
                    onChange={(e) => handleQuickOfficial(m, e.target.value)}
                    className="px-2 py-1 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-[11px] text-slate-300 max-w-[170px]"
                  >
                    <option value="">Assign 1st Referee...</option>
                    {tournament.officials.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.fullName}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openScorer(m)}
                      className="px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-orange-500 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Live Score / Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMatch(m)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Touch-Friendly Courtside Live Scorer Modal */}
      {scoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#111827] border border-[#1E293B] rounded-3xl p-5 sm:p-6 text-white space-y-4 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div>
                <h4 className="font-heading font-black text-base">
                  Courtside Scorer · {scoringMatch.matchCode} ({scoringMatch.stage})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tap +1 / -1 to update live points, lock completed sets, then finish match to advance winner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScoringMatch(null)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meta controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-slate-400 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TournamentMatchStatus)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-bold"
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="LIVE">LIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Court</label>
                <select
                  value={editCourt}
                  onChange={(e) => setEditCourt(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                >
                  <option value="Court 1">Court 1</option>
                  <option value="Court 2">Court 2</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Time</label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="08:00"
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Format</label>
                <select
                  value={editFormat}
                  onChange={(e) => setEditFormat(e.target.value as TournamentSetFormat)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                >
                  <option value="BO3">BO3</option>
                  <option value="BO2">BO2</option>
                </select>
              </div>
            </div>

            {/* Team Pairings Override */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">Home Team</label>
                <select
                  value={editHomeId}
                  onChange={(e) => {
                    setEditHomeId(e.target.value);
                    const found = teamById.get(e.target.value);
                    if (found) setEditHomeLabel(found.name);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                >
                  <option value="">-- Custom / TBD Label --</option>
                  {tournament.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editHomeLabel}
                  onChange={(e) => setEditHomeLabel(e.target.value)}
                  placeholder="Home display label"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">Away Team</label>
                <select
                  value={editAwayId}
                  onChange={(e) => {
                    setEditAwayId(e.target.value);
                    const found = teamById.get(e.target.value);
                    if (found) setEditAwayLabel(found.name);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                >
                  <option value="">-- Custom / TBD Label --</option>
                  {tournament.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editAwayLabel}
                  onChange={(e) => setEditAwayLabel(e.target.value)}
                  placeholder="Away display label"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B]"
                />
              </div>
            </div>

            {/* Set-by-Set Touch Steppers */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Set Scores (Touch Steppers)</span>
                {editSets.length < 5 && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditSets((prev) => [
                        ...prev,
                        { set: prev.length + 1, home: 0, away: 0, isCompleted: false },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-sky-300 font-bold cursor-pointer"
                  >
                    + Add Set {editSets.length + 1}
                  </button>
                )}
              </div>

              {editSets.map((s, idx) => (
                <div
                  key={s.set}
                  className="p-3 rounded-2xl bg-[#0B0F19] border border-[#1E293B] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#111827] font-mono font-black text-[#F97316]">
                      SET {s.set}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={s.isCompleted}
                        onChange={(e) =>
                          setEditSets((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, isCompleted: e.target.checked } : item
                            )
                          )
                        }
                        className="accent-emerald-500 w-4 h-4"
                      />
                      <span>Set Final</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Home stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepPoint(idx, 'home', -1)}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={s.home}
                        onChange={(e) =>
                          setEditSets((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, home: Math.max(0, Number(e.target.value) || 0) } : item
                            )
                          )
                        }
                        className="w-12 h-9 text-center font-mono font-black text-base rounded-xl bg-[#111827] border border-[#1E293B]"
                      />
                      <button
                        type="button"
                        onClick={() => stepPoint(idx, 'home', 1)}
                        className="w-9 h-9 rounded-xl bg-[#F97316] hover:bg-orange-500 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="font-black text-slate-500">:</span>

                    {/* Away stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepPoint(idx, 'away', -1)}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={s.away}
                        onChange={(e) =>
                          setEditSets((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, away: Math.max(0, Number(e.target.value) || 0) } : item
                            )
                          )
                        }
                        className="w-12 h-9 text-center font-mono font-black text-base rounded-xl bg-[#111827] border border-[#1E293B]"
                      />
                      <button
                        type="button"
                        onClick={() => stepPoint(idx, 'away', 1)}
                        className="w-9 h-9 rounded-xl bg-[#38BDF8] hover:bg-sky-400 text-slate-950 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 flex items-center gap-2 text-[11px] text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Only sets checked as <strong>Set Final</strong> count toward sets won while LIVE. Clicking{' '}
                <strong>Complete Match</strong> locks all sets and updates standings/knockout brackets.
              </span>
            </div>

            <div className="pt-2 border-t border-[#1E293B] flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setScoringMatch(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => saveScore('LIVE')}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
              >
                Save as LIVE
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => saveScore('COMPLETED')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Match &amp; Advance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Match Modal (DVA_FOCUS / Custom) */}
      {addMatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-3xl p-6 text-white space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h4 className="font-heading font-black text-base">Add Match</h4>
              <button
                type="button"
                onClick={() => setAddMatchOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomMatch} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Code (e.g. DVA-1)"
                  className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-mono"
                />
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as TournamentMatchStage)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                >
                  <option value="GROUP">GROUP</option>
                  <option value="POOL_A">POOL_A</option>
                  <option value="POOL_B">POOL_B</option>
                  <option value="QUARTERFINAL">QUARTERFINAL</option>
                  <option value="SEMIFINAL">SEMIFINAL</option>
                  <option value="THIRD_PLACE">THIRD_PLACE</option>
                  <option value="FINAL">FINAL</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newCourt}
                  onChange={(e) => setNewCourt(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                >
                  <option value="Court 1">Court 1</option>
                  <option value="Court 2">Court 2</option>
                </select>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                />
              </div>

              <div className="space-y-2">
                <select
                  value={newHomeId}
                  onChange={(e) => setNewHomeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                >
                  <option value="">-- Home Team (optional) --</option>
                  {tournament.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {!newHomeId && (
                  <input
                    type="text"
                    value={newHomeLabel}
                    onChange={(e) => setNewHomeLabel(e.target.value)}
                    placeholder="Home team name (e.g. DVA Senior)"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <select
                  value={newAwayId}
                  onChange={(e) => setNewAwayId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                >
                  <option value="">-- Opponent Team (optional) --</option>
                  {tournament.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {!newAwayId && (
                  <input
                    type="text"
                    value={newAwayLabel}
                    onChange={(e) => setNewAwayLabel(e.target.value)}
                    placeholder="Opponent name (e.g. FCB Volleyball)"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                  />
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddMatchOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-4 py-2 rounded-xl bg-[#F97316] text-white font-bold cursor-pointer"
                >
                  Create Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
