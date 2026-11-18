import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarPlus,
  CheckCircle2,
  GitBranch,
  Loader2,
  Minus,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
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
import {
  MatchStageFilterKey,
  TournamentCourtFilter,
  computePoolStandings,
  getSetTargetPoints,
  isVolleyballSetWon,
  matchesStageFilter,
  matchesTournamentCourtFilter,
  normalizeTournamentCourtName,
} from '../../../../shared/tournaments';
import { MatchScoreboardRow } from '../../../../components/tournaments/MatchScoreboardRow';
import { tournamentService } from '../../../../services/api';

interface CourtsideMatchesPanelProps {
  tournament: Tournament;
  onRefresh: () => Promise<void>;
  notify: (msg: string, durationMs?: number) => void;
  readOnly?: boolean;
}

export const CourtsideMatchesPanel: React.FC<CourtsideMatchesPanelProps> = ({
  tournament,
  onRefresh,
  notify,
  readOnly = false,
}) => {
  const [stageFilter, setStageFilter] = useState<MatchStageFilterKey>('ALL');
  const [courtFilter, setCourtFilter] = useState<TournamentCourtFilter>('ALL');
  const [busyAction, setBusyAction] = useState(false);
  const [seedingStep, setSeedingStep] = useState<'GROUP' | 'QF' | 'SF' | 'FINALS' | null>(null);

  // Live Scorer Modal state
  const [scoringMatch, setScoringMatch] = useState<TournamentMatch | null>(null);
  const [editMatchCode, setEditMatchCode] = useState('');
  const [editMatchOrder, setEditMatchOrder] = useState('1');
  const [editStatus, setEditStatus] = useState<TournamentMatchStatus>('SCHEDULED');
  const [editCourt, setEditCourt] = useState('Court A');
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
  const [showCheckinRoster, setShowCheckinRoster] = useState(true);

  // Quick Add Match (DVA_FOCUS / custom)
  const [addMatchOpen, setAddMatchOpen] = useState(false);
  const [newCode, setNewCode] = useState('M-1');
  const [newStage, setNewStage] = useState<TournamentMatchStage>('GROUP');
  const [newCourt, setNewCourt] = useState('Court A');
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
    return tournament.matches
      .filter((m) => {
        if (!matchesStageFilter(m.stage, stageFilter)) return false;
        if (!matchesTournamentCourtFilter(m.courtName, courtFilter)) return false;
        return true;
      })
      .sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0));
  }, [tournament.matches, stageFilter, courtFilter]);

  const handleGenerateGroupSchedule = async () => {
    const hasMatches = tournament.matches.length > 0;
    const forceReset = hasMatches
      ? window.confirm(
          'Giải đấu đã có các trận trước đó. Xác nhận khởi tạo lại 12 trận Vòng bảng (PA-1..PA-6 & PB-1..PB-6)?'
        )
      : false;
    if (hasMatches && !forceReset) return;

    setBusyAction(true);
    setSeedingStep('GROUP');
    try {
      await tournamentService.generateGroupSchedule(tournament.id, forceReset);
      await onRefresh();
      if (stageFilter !== 'ALL') setStageFilter('POOL');
      notify('Đã khởi tạo 12 trận Vòng bảng (Pool A: PA-1..PA-6 · Pool B: PB-1..PB-6)!');
    } catch (err: any) {
      notify(err?.message || 'Unable to generate 12-match Group Stage schedule.', 5000);
    } finally {
      setSeedingStep(null);
      setBusyAction(false);
    }
  };

  const handleSeedQuarterfinals = async () => {
    setBusyAction(true);
    setSeedingStep('QF');
    try {
      const res = await tournamentService.seedQuarterfinals(tournament.id, false);
      await onRefresh();
      if (stageFilter !== 'ALL') setStageFilter('QUARTERFINAL');
      if (res.warnings?.length > 0) {
        notify(res.warnings[0], 5500);
      } else {
        notify('Đã tạo & xếp cặp Tứ kết (QF1–QF4) từ BXH Pool A & Pool B!');
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to seed Quarterfinals.', 5000);
    } finally {
      setSeedingStep(null);
      setBusyAction(false);
    }
  };

  const handleSeedSemifinals = async () => {
    setBusyAction(true);
    setSeedingStep('SF');
    try {
      const res = await tournamentService.seedSemifinals(tournament.id, false);
      await onRefresh();
      if (stageFilter !== 'ALL') setStageFilter('SEMIFINAL');
      if (res.warnings?.length > 0) {
        notify(res.warnings.join(' '), 6000);
      } else {
        notify('Đã đẩy 4 đội thắng Tứ kết vào Bán kết (SF1 & SF2)!');
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to seed Semi-Finals.', 5000);
    } finally {
      setSeedingStep(null);
      setBusyAction(false);
    }
  };

  const handleSeedFinals = async () => {
    setBusyAction(true);
    setSeedingStep('FINALS');
    try {
      const res = await tournamentService.seedFinals(tournament.id, false);
      await onRefresh();
      if (stageFilter !== 'ALL') setStageFilter('FINALS');
      if (res.warnings?.length > 0) {
        notify(res.warnings.join(' '), 6000);
      } else {
        notify('Đã đẩy cặp Tranh Hạng 3 (3RD) & Chung kết (FINAL)!');
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to seed Finals.', 5000);
    } finally {
      setSeedingStep(null);
      setBusyAction(false);
    }
  };

  const handleSwapCourt = async (match: TournamentMatch) => {
    const nextCourt =
      normalizeTournamentCourtName(match.courtName) === 'Court A' ? 'Court B' : 'Court A';
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
    const normalizedCourt = normalizeTournamentCourtName(match.courtName || 'Court A');
    const resolvedFormat = (
      (match.setFormat || tournament.groupSetFormat || 'BO3').toUpperCase() as TournamentSetFormat
    );
    const initialSets = match.setScores?.length
      ? match.setScores.map((s) => ({ ...s }))
      : [{ set: 1, home: 0, away: 0, isCompleted: false }];
    setScoringMatch(match);
    setEditMatchCode((match.matchCode || '').trim().toUpperCase());
    setEditMatchOrder(String(Number.isFinite(match.matchOrder) ? match.matchOrder : 0));
    setEditStatus(match.status);
    setEditCourt(normalizedCourt === 'Court B' ? 'Court B' : 'Court A');
    setEditTime(match.scheduledTime || '');
    setEditFormat(resolvedFormat);
    setEditHomeId(match.homeTeamId || '');
    setEditAwayId(match.awayTeamId || '');
    setEditHomeLabel(match.homeLabel || '');
    setEditAwayLabel(match.awayLabel || '');
    setEditOfficialId(match.officialId || '');
    setEditSets(resolvedFormat === 'BO1_25' ? [initialSets[0]] : initialSets);
  };

  const handleEditFormatChange = (nextFormat: TournamentSetFormat) => {
    setEditFormat(nextFormat);
    if (nextFormat === 'BO1_25') {
      setEditSets((prev) => [prev[0] || { set: 1, home: 0, away: 0, isCompleted: false }]);
    } else if (nextFormat === 'BO2') {
      setEditSets((prev) => prev.slice(0, 2));
    }
  };

  const updateSetPointValue = (setIdx: number, side: 'home' | 'away', nextRaw: number) => {
    const nextVal = Math.max(0, Math.round(Number(nextRaw) || 0));
    setEditSets((prev) =>
      prev.map((s, idx) => {
        if (idx !== setIdx) return s;
        const nextHome = side === 'home' ? nextVal : s.home;
        const nextAway = side === 'away' ? nextVal : s.away;
        const target = getSetTargetPoints(s.set, editFormat);
        const stillWon = isVolleyballSetWon(nextHome, nextAway, target);
        return {
          ...s,
          [side]: nextVal,
          isCompleted: stillWon ? s.isCompleted : false,
        };
      })
    );
  };

  const stepPoint = (setIdx: number, side: 'home' | 'away', delta: number) => {
    setEditSets((prev) =>
      prev.map((s, idx) => {
        if (idx !== setIdx) return s;
        const nextVal = Math.max(0, s[side] + delta);
        const nextHome = side === 'home' ? nextVal : s.home;
        const nextAway = side === 'away' ? nextVal : s.away;
        const target = getSetTargetPoints(s.set, editFormat);
        const stillWon = isVolleyballSetWon(nextHome, nextAway, target);
        return {
          ...s,
          [side]: nextVal,
          isCompleted: stillWon ? s.isCompleted : false,
        };
      })
    );
  };

  const saveScore = async (
    overrideStatus?: TournamentMatchStatus,
    overrideSets?: TournamentSetScore[]
  ) => {
    if (!scoringMatch) return;
    const normalizedCode = editMatchCode.trim().toUpperCase();
    if (!normalizedCode) {
      notify('Match Code cannot be empty.');
      return;
    }
    const trimmedOrder = editMatchOrder.trim();
    const parsedOrder = Number(trimmedOrder);
    if (trimmedOrder === '' || !Number.isInteger(parsedOrder) || parsedOrder < 0 || parsedOrder > 999) {
      notify('Order must be an integer between 0 and 999.');
      return;
    }
    const normalizedCourt =
      normalizeTournamentCourtName(editCourt) === 'Court B' ? 'Court B' : 'Court A';

    const targetStatus = overrideStatus || editStatus;
    const sourceSets = (overrideSets ?? editSets).slice(
      0,
      editFormat === 'BO1_25' ? 1 : editFormat === 'BO2' ? 2 : 5
    );

    let normalizedSets: TournamentSetScore[];
    if (targetStatus === 'COMPLETED') {
      if (editFormat === 'BO1_25') {
        const s1 = sourceSets[0];
        if (!s1 || !isVolleyballSetWon(s1.home, s1.away, 25)) {
          notify('Set 1 chưa đạt điều kiện thắng chuẩn 25 điểm (tối thiểu 25 điểm và cách biệt >= 2 điểm).');
          return;
        }
        normalizedSets = [{ ...s1, set: 1, isCompleted: true }];
      } else {
        const playedSets = sourceSets.filter(
          (s, idx) => idx === 0 || s.home > 0 || s.away > 0 || s.isCompleted
        );
        for (const s of playedSets) {
          const target = getSetTargetPoints(s.set, editFormat);
          if (!isVolleyballSetWon(s.home, s.away, target)) {
            notify(
              `Set ${s.set} chưa đạt điều kiện thắng (tối thiểu ${target} điểm và cách biệt >= 2 điểm).`
            );
            return;
          }
        }
        normalizedSets = playedSets.map((s) => ({ ...s, isCompleted: true }));
      }
    } else {
      normalizedSets = sourceSets;
    }

    setBusyAction(true);
    try {
      const res = await tournamentService.updateMatchScore(tournament.id, scoringMatch.id, {
        matchCode: normalizedCode,
        matchOrder: parsedOrder,
        status: targetStatus,
        courtName: normalizedCourt,
        scheduledTime: editTime.trim() || undefined,
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
      if (res.autoSeededQuarterfinals && res.warnings?.length) {
        notify(
          `${normalizedCode} completed · Quarterfinals seeded (note: ${res.warnings.join(' ')})`,
          6000
        );
      } else if (res.autoSeededQuarterfinals) {
        notify(
          `All Pool Stage matches completed! Quarterfinals (QF1–QF4) auto-seeded from standings.`,
          5000
        );
      } else if (res.warnings?.length > 0) {
        notify(`Saved ${normalizedCode} — Notice: ${res.warnings.join(' ')}`, 6000);
      } else {
        notify(
          targetStatus === 'COMPLETED'
            ? `${normalizedCode} completed & standings/bracket updated!`
            : targetStatus === 'LIVE'
            ? `Updated live score for ${normalizedCode}.`
            : `Saved changes for ${normalizedCode}.`
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
      <div className="p-4 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Stage Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { key: 'ALL', label: `All (${stageCounts.ALL})` },
                { key: 'POOL', label: `Pool Stage (${stageCounts.POOL})` },
                { key: 'QUARTERFINAL', label: `Quarter-Finals (${stageCounts.QUARTERFINAL})` },
                { key: 'SEMIFINAL', label: `Semi-Finals (${stageCounts.SEMIFINAL})` },
                { key: 'FINALS', label: `3rd Place & Final (${stageCounts.FINALS})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStageFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  stageFilter === tab.key
                    ? 'bg-[#F97316] text-white shadow-sm'
                    : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-[#1E293B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Schedule Generators & Custom Match CTA */}
          {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {tournament.trackingMode === 'FULL_BRACKET' && (
              <>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleGenerateGroupSchedule}
                  title="Tạo 12 trận Vòng bảng (Pool A: PA-1..PA-6, Pool B: PB-1..PB-6)"
                  className="px-3.5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-[#38BDF8] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {seedingStep === 'GROUP' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CalendarPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Generate 12-Match Group Stage</span>
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleSeedQuarterfinals}
                    title="Ghép cặp 1A–4B, 2A–3B, 3A–2B, 4A–1B từ BXH Vòng bảng"
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {seedingStep === 'QF' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <GitBranch className="w-3.5 h-3.5" />
                    )}
                    <span>1. Seed QF (QF1–QF4)</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleSeedSemifinals}
                    title="Lấy 4 đội thắng Tứ kết ghép cặp Win QF1 vs Win QF3 & Win QF2 vs Win QF4"
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {seedingStep === 'SF' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <GitBranch className="w-3.5 h-3.5" />
                    )}
                    <span>2. Seed SF (SF1–SF2)</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleSeedFinals}
                    title="Đẩy 2 đội thua Bán kết vào Tranh Hạng 3 và 2 đội thắng Bán kết vào Chung kết"
                    className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {seedingStep === 'FINALS' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5" />
                    )}
                    <span>3. Seed Finals (3rd &amp; Final)</span>
                  </button>
                </div>
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
          )}
        </div>

        {/* Combinable Court Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#1E293B]/80 text-xs">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
            {(['ALL', 'Court A', 'Court B'] as const).map((court) => (
              <button
                key={court}
                type="button"
                onClick={() => setCourtFilter(court)}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  courtFilter === court
                    ? 'bg-[#38BDF8] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {court === 'ALL' ? 'All Courts' : court}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Showing <strong className="text-white">{filteredMatches.length}</strong> of {tournament.matches.length} matches
          </span>
        </div>
      </div>

      {/* Matches Sections */}
      {tournament.matches.length === 0 ? (
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-10 text-center text-xs text-slate-500">
          No matches yet. Assign 4 teams to Pool A and 4 teams to Pool B, then click{' '}
          <strong className="text-[#38BDF8]">Generate 12-Match Group Stage</strong> (or click{' '}
          <strong className="text-white">+ Add Match</strong> for DVA Focus mode).
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-10 text-center text-xs text-slate-400">
          No matches found for the selected stage and court filter.
        </div>
      ) : (
        <div className="space-y-6">
          {(
            [
              {
                key: 'GROUP',
                title: 'GROUP STAGE',
                subtitle: 'Pool A & Pool B Round-Robin (12 Matches)',
                badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                matches: filteredMatches.filter(
                  (m) => m.stage === 'POOL_A' || m.stage === 'POOL_B' || m.stage === 'GROUP'
                ),
              },
              {
                key: 'QF',
                title: 'QUARTER-FINALS',
                subtitle: 'Single Elimination (QF1–QF4 · 4 winners advance to Semi-Finals, 4 losers eliminated)',
                badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                matches: filteredMatches.filter((m) => m.stage === 'QUARTERFINAL'),
              },
              {
                key: 'SF',
                title: 'SEMI-FINALS',
                subtitle: 'SF1 (Win QF1 vs Win QF3) & SF2 (Win QF2 vs Win QF4) · Winners → Final, Losers → 3rd Place',
                badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                matches: filteredMatches.filter((m) => m.stage === 'SEMIFINAL'),
              },
              {
                key: '3RD',
                title: 'THIRD PLACE MATCH',
                subtitle: 'Bronze Medal Decider · Loser SF1 vs Loser SF2',
                badgeClass: 'bg-amber-700/20 text-amber-300 border-amber-600/40',
                matches: filteredMatches.filter((m) => m.stage === 'THIRD_PLACE'),
              },
              {
                key: 'FINAL',
                title: 'GRAND FINAL',
                subtitle: 'Championship Match · Winner SF1 vs Winner SF2',
                badgeClass: 'bg-[#FACC15]/15 text-[#FACC15] border-[#FACC15]/40',
                matches: filteredMatches.filter((m) => m.stage === 'FINAL'),
              },
            ] as const
          )
            .filter((sec) => sec.matches.length > 0)
            .map((sec) => (
              <section key={sec.key} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider ${sec.badgeClass}`}>
                      {sec.title}
                    </span>
                    <span className="text-[11px] text-slate-400">{sec.subtitle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {sec.matches.length} {sec.matches.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {sec.matches.map((m) => {
                    const homeTeam = m.homeTeamId ? teamById.get(m.homeTeamId) || null : null;
                    const awayTeam = m.awayTeamId ? teamById.get(m.awayTeamId) || null : null;
                    const isDone = m.status === 'COMPLETED';
                    const homeWon = Boolean(isDone && m.winnerTeamId && m.winnerTeamId === m.homeTeamId);
                    const awayWon = Boolean(isDone && m.winnerTeamId && m.winnerTeamId === m.awayTeamId);
                    const getOutcomeBadge = (won: boolean, lost: boolean) => {
                      if (!isDone || (!won && !lost)) return null;
                      if (m.stage === 'QUARTERFINAL') {
                        return won ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[9px] font-bold">
                            → SF
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-red-950/70 text-red-300 border border-red-800/60 text-[9px] font-semibold">
                            Eliminated
                          </span>
                        );
                      }
                      if (m.stage === 'SEMIFINAL') {
                        return won ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/60 text-[9px] font-bold">
                            → Final
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-semibold">
                            → 3rd Place
                          </span>
                        );
                      }
                      if (m.stage === 'THIRD_PLACE') {
                        return won ? (
                          <span className="px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-600/60 text-[9px] font-bold">
                            3rd Bronze
                          </span>
                        ) : null;
                      }
                      if (m.stage === 'FINAL') {
                        return won ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/50 text-[9px] font-black">
                            Champion
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600 text-[9px] font-bold">
                            2nd Silver
                          </span>
                        );
                      }
                      return null;
                    };

                    return (
                      <div
                        key={m.id}
                        className={`rounded-2xl bg-[#111827] border p-4 space-y-3 text-xs ${
                          m.status === 'LIVE'
                            ? 'border-red-500/70 shadow-lg shadow-red-950/20'
                            : m.stage === 'FINAL'
                            ? 'border-[#FACC15]/35'
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
                            {readOnly ? (
                              <span className="px-2 py-0.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-sky-300 font-bold">
                                {normalizeTournamentCourtName(m.courtName)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSwapCourt(m)}
                                className="px-2 py-0.5 rounded-lg bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-sky-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Swap between Court A & Court B"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>{normalizeTournamentCourtName(m.courtName)}</span>
                              </button>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                m.status === 'LIVE'
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
                          homeBadge={getOutcomeBadge(homeWon, awayWon)}
                          awayBadge={getOutcomeBadge(awayWon, homeWon)}
                        />

                        <div className="pt-2 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
                          {readOnly ? (
                            <span className="text-[11px] text-slate-400">
                              1st Ref:{' '}
                              <span className="text-slate-200 font-semibold">
                                {tournament.officials.find((off) => off.id === m.officialId)?.fullName || 'Unassigned'}
                              </span>
                            </span>
                          ) : (
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
                          )}

                          {!readOnly && (
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
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* Touch-Friendly Courtside Live Scorer Modal */}
      {!readOnly && scoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#111827] border border-[#1E293B] rounded-3xl p-5 sm:p-6 text-white space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar text-xs">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div>
                <h4 className="font-heading font-black text-base">
                  Courtside Scorer · {editMatchCode.trim().toUpperCase() || scoringMatch.matchCode} ({scoringMatch.stage})
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
            <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.75fr)_minmax(0,1.45fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)] gap-2.5">
              <div>
                <label className="block text-slate-400 mb-1">Match Code</label>
                <input
                  type="text"
                  maxLength={30}
                  value={editMatchCode}
                  onChange={(e) => setEditMatchCode(e.target.value.toUpperCase())}
                  onBlur={() => setEditMatchCode((prev) => prev.trim().toUpperCase())}
                  placeholder="PA-1"
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-mono font-bold text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Order</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  step={1}
                  value={editMatchOrder}
                  onChange={(e) => setEditMatchOrder(e.target.value)}
                  placeholder="1"
                  className="w-full px-2 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-mono text-center text-white"
                />
              </div>
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
                  <option value="Court A">Court A</option>
                  <option value="Court B">Court B</option>
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
                  onChange={(e) => handleEditFormatChange(e.target.value as TournamentSetFormat)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                >
                  <option value="BO3">BO3</option>
                  <option value="BO2">BO2</option>
                  <option value="BO1_25">BO1 (25)</option>
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
            {(() => {
              const visibleSets = editFormat === 'BO1_25' ? editSets.slice(0, 1) : editSets;
              const maxSetsForFormat = editFormat === 'BO1_25' ? 1 : editFormat === 'BO2' ? 2 : 5;
              const bo1Set = visibleSets[0];
              const bo1Won =
                editFormat === 'BO1_25' && bo1Set && isVolleyballSetWon(bo1Set.home, bo1Set.away, 25);
              const bo1HomeWon = Boolean(bo1Set && bo1Set.home > bo1Set.away);
              const bo1WinnerName = bo1HomeWon
                ? editHomeLabel.trim() || teamById.get(editHomeId)?.name || 'Home'
                : editAwayLabel.trim() || teamById.get(editAwayId)?.name || 'Away';
              const bo1Scoreline = bo1HomeWon ? '1 - 0' : '0 - 1';

              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">
                      Set Scores (Touch Steppers)
                      {editFormat === 'BO1_25' && (
                        <span className="ml-2 text-[10px] font-semibold text-sky-300">
                          · 1 Set chuẩn 25 điểm (cách biệt ≥ 2, không giới hạn trần)
                        </span>
                      )}
                    </span>
                    {editFormat !== 'BO1_25' && visibleSets.length < maxSetsForFormat && (
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
                        + Add Set {visibleSets.length + 1}
                      </button>
                    )}
                  </div>

                  {visibleSets.map((s, idx) => {
                    const targetPts = getSetTargetPoints(s.set, editFormat);
                    const setWon = isVolleyballSetWon(s.home, s.away, targetPts);
                    const isDeuce = s.home >= targetPts - 1 && s.away >= targetPts - 1 && !setWon;

                    return (
                      <div
                        key={s.set}
                        className="p-3 rounded-2xl bg-[#0B0F19] border border-[#1E293B] flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-[#111827] font-mono font-black text-[#F97316]">
                            SET {s.set}
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                            <input
                              type="checkbox"
                              checked={s.isCompleted}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked && !setWon) {
                                  notify(
                                    `Set ${s.set} chưa đạt điều kiện thắng (tối thiểu ${targetPts} điểm và cách biệt >= 2 điểm).`
                                  );
                                  return;
                                }
                                setEditSets((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, isCompleted: checked } : item
                                  )
                                );
                              }}
                              className="accent-emerald-500 w-4 h-4"
                            />
                            <span>Set Final</span>
                          </label>
                          {isDeuce && (
                            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[10px] font-bold">
                              Deuce · Cách biệt ≥ 2
                            </span>
                          )}
                          {setWon && !s.isCompleted && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold">
                              Đủ điểm thắng ({s.home}–{s.away})
                            </span>
                          )}
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
                              value={s.home}
                              onChange={(e) =>
                                updateSetPointValue(idx, 'home', Number(e.target.value) || 0)
                              }
                              className="w-14 h-9 text-center font-mono font-black text-base rounded-xl bg-[#111827] border border-[#1E293B]"
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
                              value={s.away}
                              onChange={(e) =>
                                updateSetPointValue(idx, 'away', Number(e.target.value) || 0)
                              }
                              className="w-14 h-9 text-center font-mono font-black text-base rounded-xl bg-[#111827] border border-[#1E293B]"
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
                    );
                  })}

                  {bo1Won && bo1Set && (
                    <div className="p-3 rounded-2xl bg-emerald-950/35 border border-emerald-600/50 flex flex-wrap items-center justify-between gap-2.5 text-[11px]">
                      <div className="flex items-center gap-2 text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Set 1 đạt điều kiện thắng (<strong>{bo1Set.home}–{bo1Set.away}</strong>, cách biệt ≥ 2 điểm) ·{' '}
                          <strong className="text-white">{bo1WinnerName}</strong> thắng{' '}
                          <strong className="font-mono text-emerald-300">{bo1Scoreline}</strong>.
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => {
                          const finalized: TournamentSetScore[] = [
                            { ...bo1Set, set: 1, isCompleted: true },
                          ];
                          setEditSets(finalized);
                          setEditStatus('COMPLETED');
                          void saveScore('COMPLETED', finalized);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoàn tất Set 1 &amp; Chốt trận ({bo1Scoreline})</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Courtside Matchday Check-in Roster (Verified Eligible Athletes Only) */}
            {(editHomeId || editAwayId) && (
              <div className="rounded-2xl bg-[#0B0F19] border border-[#1E293B] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckinRoster((v) => !v)}
                    className="flex items-center gap-2 text-left font-bold text-white cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Courtside Check-in Roster (VERIFIED Eligible Athletes Only)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckinRoster((v) => !v)}
                    className="text-[11px] font-bold text-sky-300 hover:underline cursor-pointer"
                  >
                    {showCheckinRoster ? 'Hide Check-in List' : 'Show Check-in List'}
                  </button>
                </div>

                {showCheckinRoster && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { side: 'Home', teamId: editHomeId, fallback: editHomeLabel || 'Home Team', accent: 'text-[#F97316]' },
                      { side: 'Away', teamId: editAwayId, fallback: editAwayLabel || 'Away Team', accent: 'text-[#38BDF8]' },
                    ].map(({ side, teamId, fallback, accent }) => {
                      const tm = teamId ? teamById.get(teamId) : null;
                      const teamAthletes = teamId
                        ? tournament.players.filter((p) => p.teamId === teamId)
                        : [];
                      const verified = teamAthletes
                        .filter((p) => (p.eligibilityStatus || 'VERIFIED') === 'VERIFIED')
                        .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain) || a.jerseyNumber - b.jerseyNumber);
                      const unverifiedCount = teamAthletes.filter(
                        (p) => (p.eligibilityStatus || 'VERIFIED') !== 'VERIFIED'
                      ).length;

                      return (
                        <div key={side} className="rounded-xl bg-[#111827] border border-[#1E293B] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] pb-1.5">
                            <span className={`font-bold text-xs truncate ${accent}`}>
                              {tm?.name || fallback}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300 shrink-0">
                              {verified.length} VERIFIED
                            </span>
                          </div>
                          {!teamId ? (
                            <p className="text-[11px] text-slate-500">Select a team above to view roster check-in.</p>
                          ) : verified.length === 0 ? (
                            <p className="text-[11px] text-amber-300 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>No VERIFIED athletes found yet. Review roster in Teams tab.</span>
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar pr-1">
                              {verified.map((pl) => (
                                <span
                                  key={pl.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-[11px]"
                                >
                                  <span className={`font-mono font-black ${accent}`}>#{pl.jerseyNumber}</span>
                                  <span className="text-slate-100 font-semibold">{pl.fullName}</span>
                                  <span className="text-[9px] font-mono text-slate-400">{pl.position}</span>
                                  {pl.isCaptain && (
                                    <span className="px-1 rounded bg-amber-500 text-slate-950 text-[8px] font-black">
                                      C
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                          {unverifiedCount > 0 && (
                            <p className="text-[10px] text-amber-300/90">
                              + {unverifiedCount} pending/flagged/rejected athletes excluded from court eligibility.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
                onClick={() => saveScore()}
                className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-500 text-white font-bold cursor-pointer"
              >
                Save
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
                  <option value="Court A">Court A</option>
                  <option value="Court B">Court B</option>
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
