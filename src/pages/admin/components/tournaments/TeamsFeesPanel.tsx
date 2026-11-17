import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Edit3,
  Plus,
  Shield,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
  Loader2,
  Download,
} from 'lucide-react';
import {
  PaymentStatus,
  PlayerLevel,
  TOURNAMENT_AWARD_LABELS,
  Tournament,
  TournamentIndividualAward,
  TournamentPlayer,
  TournamentTeam,
  VolleyballPosition,
} from '../../../../types';
import { tournamentService } from '../../../../services/api';
import { buildCloudinaryFolder, optimizeCloudinaryUrl, uploadToCloudinary } from '../../../../utils/cloudinary';

interface TeamsFeesPanelProps {
  tournament: Tournament;
  onRefresh: () => Promise<void>;
  notify: (msg: string, durationMs?: number) => void;
}

const AWARDS: TournamentIndividualAward[] = ['MVP', 'BEST_SETTER', 'BEST_SPIKER', 'BEST_LIBERO'];
const POSITIONS: VolleyballPosition[] = ['OH', 'OP', 'MB', 'S', 'L'];

export const TeamsFeesPanel: React.FC<TeamsFeesPanelProps> = ({
  tournament,
  onRefresh,
  notify,
}) => {
  const isHosted = tournament.mode === 'HOSTED';

  // Add / Edit Team Modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TournamentTeam | null>(null);
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isDvaTeam, setIsDvaTeam] = useState(false);
  const [dvaSquadLevel, setDvaSquadLevel] = useState<PlayerLevel>('SENIOR');
  const [importDvaSquad, setImportDvaSquad] = useState(true);
  const [pool, setPool] = useState<string>('');
  const [seedOrder, setSeedOrder] = useState(1);
  const [captainName, setCaptainName] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [entryFeeAmount, setEntryFeeAmount] = useState(tournament.entryFeePerTeam || 0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  // Roster Drawer / Modal per Team
  const [rosterTeamId, setRosterTeamId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJersey, setNewPlayerJersey] = useState(1);
  const [newPlayerPos, setNewPlayerPos] = useState<VolleyballPosition>('OH');
  const [newPlayerHeight, setNewPlayerHeight] = useState('');
  const [newPlayerReach, setNewPlayerReach] = useState('');
  const [newPlayerCaptain, setNewPlayerCaptain] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rosterTeam = tournament.teams.find((t) => t.id === rosterTeamId) || null;
  const rosterPlayers = rosterTeam
    ? tournament.players.filter((p) => p.teamId === rosterTeam.id)
    : [];

  const openAddTeam = () => {
    setEditingTeam(null);
    setTeamName('');
    setShortName('');
    setLogoUrl('');
    setIsDvaTeam(false);
    setDvaSquadLevel('SENIOR');
    setImportDvaSquad(true);
    setPool(tournament.teams.filter((t) => t.pool === 'A').length < 4 ? 'A' : 'B');
    setSeedOrder(tournament.teams.length + 1);
    setCaptainName('');
    setCaptainPhone('');
    setCaptainEmail('');
    setPaymentStatus(isHosted ? 'PENDING' : 'PAID');
    setEntryFeeAmount(isHosted ? tournament.entryFeePerTeam : 0);
    setTeamModalOpen(true);
  };

  const openEditTeam = (team: TournamentTeam) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setShortName(team.shortName || '');
    setLogoUrl(team.logoUrl || '');
    setIsDvaTeam(team.isDvaTeam);
    setDvaSquadLevel(team.dvaSquadLevel || 'SENIOR');
    setImportDvaSquad(false);
    setPool(team.pool || '');
    setSeedOrder(team.seedOrder || 1);
    setCaptainName(team.captainName || '');
    setCaptainPhone(team.captainPhone || '');
    setCaptainEmail(team.captainEmail || '');
    setPaymentStatus(team.paymentStatus);
    setEntryFeeAmount(team.entryFeeAmount || 0);
    setTeamModalOpen(true);
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'logos'));
      setLogoUrl(res.secure_url || res.url);
    } catch {
      notify('Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSavingTeam(true);
    try {
      const payload: Partial<TournamentTeam> & { importDvaSquad?: boolean } = {
        name: teamName.trim(),
        shortName: shortName.trim().toUpperCase() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        isDvaTeam,
        dvaSquadLevel: isDvaTeam ? dvaSquadLevel : undefined,
        pool: pool === 'A' || pool === 'B' ? pool : null,
        seedOrder: Number(seedOrder) || 1,
        captainName: captainName.trim() || undefined,
        captainPhone: captainPhone.trim() || undefined,
        captainEmail: captainEmail.trim() || undefined,
        paymentStatus,
        entryFeeAmount: isHosted ? Math.max(0, Number(entryFeeAmount) || 0) : 0,
        ...(editingTeam ? {} : { importDvaSquad }),
      };

      if (editingTeam) {
        await tournamentService.updateTeam(tournament.id, editingTeam.id, payload);
        notify(`Updated team "${teamName.trim()}".`);
      } else {
        await tournamentService.addTeam(tournament.id, payload);
        notify(`Added team "${teamName.trim()}".`);
      }
      setTeamModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Unable to save team.');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleUpdatePaymentStatus = async (team: TournamentTeam, nextStatus: PaymentStatus) => {
    setBusyId(team.id);
    try {
      await tournamentService.updateTeam(tournament.id, team.id, { paymentStatus: nextStatus });
      await onRefresh();
      notify(
        nextStatus === 'PAID'
          ? `Confirmed "${team.name}" (${team.entryFeeAmount.toLocaleString('vi-VN')} đ) as PAID.`
          : `Updated "${team.name}" payment status to ${nextStatus}.`
      );
    } catch (err: any) {
      notify(err?.message || 'Unable to update team payment.');
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickPoolChange = async (team: TournamentTeam, nextPool: string) => {
    setBusyId(team.id);
    try {
      await tournamentService.updateTeam(tournament.id, team.id, {
        pool: nextPool === 'A' || nextPool === 'B' ? nextPool : null,
      });
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Unable to change pool.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteTeam = async (team: TournamentTeam) => {
    if (isHosted && team.paymentStatus === 'PAID' && team.entryFeeAmount > 0) {
      notify('Cannot delete a PAID team directly. Cancel payment status first to preserve revenue audit.');
      return;
    }
    if (!window.confirm(`Delete team "${team.name}" and its roster?`)) return;
    setBusyId(team.id);
    try {
      await tournamentService.deleteTeam(tournament.id, team.id);
      await onRefresh();
      notify(`Deleted team "${team.name}".`);
    } catch (err: any) {
      notify(err?.message || 'Unable to delete team.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterTeam || !newPlayerName.trim()) return;
    setBusyId('add-player');
    try {
      await tournamentService.addPlayer(tournament.id, {
        teamId: rosterTeam.id,
        fullName: newPlayerName.trim(),
        jerseyNumber: Number(newPlayerJersey) || 0,
        position: newPlayerPos,
        height: newPlayerHeight ? Number(newPlayerHeight) : undefined,
        spikeTouch: newPlayerReach ? Number(newPlayerReach) : undefined,
        isCaptain: newPlayerCaptain,
      });
      setNewPlayerName('');
      setNewPlayerJersey((n) => n + 1);
      setNewPlayerHeight('');
      setNewPlayerReach('');
      setNewPlayerCaptain(false);
      await onRefresh();
      notify('Athlete added to roster.');
    } catch (err: any) {
      notify(err?.message || 'Unable to add player.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAward = async (player: TournamentPlayer, award: TournamentIndividualAward) => {
    const has = player.awards.includes(award);
    const nextAwards = has
      ? player.awards.filter((a) => a !== award)
      : [...player.awards, award];
    try {
      await tournamentService.updatePlayer(tournament.id, player.id, { awards: nextAwards });
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Unable to update award.');
    }
  };

  const handleImportDvaSquad = async (level: PlayerLevel) => {
    if (!rosterTeam) return;
    setBusyId('import-squad');
    try {
      const res = await tournamentService.importDvaSquad(tournament.id, rosterTeam.id, level);
      await onRefresh();
      notify(`Imported ${res.importedCount} active DVA ${level} athletes into ${rosterTeam.name}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to import DVA squad.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      await tournamentService.deletePlayer(tournament.id, playerId);
      await onRefresh();
    } catch (err: any) {
      notify(err?.message || 'Unable to remove player.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-sm text-white">
            Registered Teams ({tournament.teams.length} total
            {isHosted ? ` · ${tournament.paidTeamsCount ?? 0}/${tournament.maxTeams} PAID` : ''})
          </h4>
          <p className="text-[11px] text-slate-400">
            {isHosted
              ? 'Only PAID teams in HOSTED tournaments lock an official slot, appear publicly, and count toward Verified Revenue.'
              : 'PARTICIPATING mode: team fees are disabled (0 đ) and excluded from club revenue.'}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddTeam}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Team</span>
        </button>
      </div>

      {tournament.teams.length === 0 ? (
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-10 text-center text-xs text-slate-500">
          No teams added yet. Teams can register publicly on `/tournaments/{tournament.slug}` or you can add teams manually above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#1E293B] bg-[#111827]">
          <table className="w-full min-w-[840px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0B0F19] text-slate-400 font-bold border-b border-[#1E293B]">
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-3">Pool / Seed</th>
                <th className="py-3 px-3">Captain Contact</th>
                <th className="py-3 px-3">Roster</th>
                {isHosted && <th className="py-3 px-3">Entry Fee &amp; VietQR</th>}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {tournament.teams.map((tm) => {
                const countPlayers = tournament.players.filter((p) => p.teamId === tm.id).length;
                const isBusy = busyId === tm.id;
                return (
                  <tr key={tm.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0B0F19] border border-[#1E293B] overflow-hidden shrink-0 flex items-center justify-center p-1 font-black text-[11px] text-orange-400">
                          {tm.logoUrl ? (
                            <img
                              src={optimizeCloudinaryUrl(tm.logoUrl, 96)}
                              alt={tm.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            (tm.shortName || tm.name).slice(0, 3).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{tm.name}</span>
                            {tm.isDvaTeam && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-950 text-red-300 border border-red-700/70">
                                DVA {tm.dvaSquadLevel || 'SQUAD'}
                              </span>
                            )}
                          </div>
                          {tm.shortName && (
                            <span className="text-[10px] font-mono text-slate-400">{tm.shortName}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={tm.pool || ''}
                          disabled={isBusy}
                          onChange={(e) => handleQuickPoolChange(tm, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-white font-semibold"
                        >
                          <option value="">No Pool</option>
                          <option value="A">Pool A</option>
                          <option value="B">Pool B</option>
                        </select>
                        <span className="text-[11px] font-mono text-slate-400">#{tm.seedOrder}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-[11px]">
                      <div className="font-semibold text-slate-200">{tm.captainName || '—'}</div>
                      {tm.captainPhone && <div className="font-mono text-slate-400">{tm.captainPhone}</div>}
                      {tm.captainEmail && <div className="text-slate-500 truncate max-w-[160px]">{tm.captainEmail}</div>}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => setRosterTeamId(tm.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-sky-300 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{countPlayers} Players</span>
                      </button>
                    </td>

                    {isHosted && (
                      <td className="py-3 px-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              tm.paymentStatus === 'PAID'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : tm.paymentStatus === 'CANCELLED'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {tm.paymentStatus}
                          </span>
                          <span className="font-mono font-bold text-[#FACC15]">
                            {tm.entryFeeAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        {tm.transferContent && (
                          <div className="font-mono text-[10px] text-slate-400">{tm.transferContent}</div>
                        )}
                        {tm.customerConfirmedAt && tm.paymentStatus === 'PENDING' && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[9px] font-bold">
                            Captain Reported Transfer
                          </span>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isHosted && tm.paymentStatus !== 'PAID' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUpdatePaymentStatus(tm, 'PAID')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        )}
                        {isHosted && tm.paymentStatus === 'PAID' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUpdatePaymentStatus(tm, 'CANCELLED')}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Cancel payment"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditTeam(tm)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          title="Edit team"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDeleteTeam(tm)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
                          title="Delete team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Team Modal */}
      {teamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#111827] border border-[#1E293B] rounded-3xl p-6 text-white space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h4 className="font-heading font-black text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#F97316]" />
                <span>{editingTeam ? `Edit Team: ${editingTeam.name}` : 'Add Tournament Team'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Team Name *</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. DVA Senior"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Short Code</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="DVA"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                  />
                </div>
                <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />}
                  <span>Upload Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
                </label>
              </div>

              <div className="p-3 rounded-2xl bg-[#0B0F19] border border-[#1E293B] space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDvaTeam}
                    onChange={(e) => setIsDvaTeam(e.target.checked)}
                    className="accent-red-500 w-4 h-4"
                  />
                  <span className="font-bold text-white">This is a DVA Volleyball Club Squad</span>
                </label>
                {isDvaTeam && (
                  <div className="flex flex-wrap items-center gap-3 pl-6">
                    <select
                      value={dvaSquadLevel}
                      onChange={(e) => setDvaSquadLevel(e.target.value as PlayerLevel)}
                      className="px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B]"
                    >
                      <option value="SENIOR">SENIOR Squad</option>
                      <option value="JUNIOR">JUNIOR Squad</option>
                      <option value="YOUTH">YOUTH Squad</option>
                    </select>
                    {!editingTeam && (
                      <label className="flex items-center gap-1.5 text-sky-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={importDvaSquad}
                          onChange={(e) => setImportDvaSquad(e.target.checked)}
                          className="accent-sky-400"
                        />
                        <span>Auto-import active club athletes</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Pool</label>
                  <select
                    value={pool}
                    onChange={(e) => setPool(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                  >
                    <option value="">None</option>
                    <option value="A">Pool A</option>
                    <option value="B">Pool B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Seed Order</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={seedOrder}
                    onChange={(e) => setSeedOrder(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-mono"
                  />
                </div>
                {isHosted && (
                  <>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Fee Status</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Fee (VND)</label>
                      <input
                        type="number"
                        min={0}
                        step={50000}
                        value={entryFeeAmount}
                        onChange={(e) => setEntryFeeAmount(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] font-mono text-[#FACC15]"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Captain Name"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                />
                <input
                  type="text"
                  placeholder="Captain Phone / Zalo"
                  value={captainPhone}
                  onChange={(e) => setCaptainPhone(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                />
                <input
                  type="email"
                  placeholder="Captain Email"
                  value={captainEmail}
                  onChange={(e) => setCaptainEmail(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white font-bold cursor-pointer"
                >
                  {savingTeam ? 'Saving...' : 'Save Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Roster & Individual Awards Modal */}
      {rosterTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-[#111827] border border-[#1E293B] rounded-3xl p-6 text-white space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
              <div>
                <h4 className="font-heading font-black text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FACC15]" />
                  <span>{rosterTeam.name} — Roster &amp; Individual Awards</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Manage 7–10 athletes and toggle MVP / Best Setter / Best Spiker / Best Libero badges.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {rosterTeam.isDvaTeam && (
                  <button
                    type="button"
                    disabled={busyId === 'import-squad'}
                    onClick={() => handleImportDvaSquad(rosterTeam.dvaSquadLevel || 'SENIOR')}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Import DVA {rosterTeam.dvaSquadLevel || 'SENIOR'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRosterTeamId(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add Athlete Form */}
            <form onSubmit={handleAddPlayer} className="grid grid-cols-2 sm:grid-cols-7 gap-2 p-3 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
              <input
                type="number"
                min={0}
                max={99}
                value={newPlayerJersey}
                onChange={(e) => setNewPlayerJersey(Number(e.target.value) || 0)}
                placeholder="#"
                className="px-2.5 py-2 rounded-lg bg-[#111827] border border-[#1E293B] font-mono text-center"
              />
              <input
                type="text"
                required
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player Full Name *"
                className="col-span-2 px-3 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
              />
              <select
                value={newPlayerPos}
                onChange={(e) => setNewPlayerPos(e.target.value as VolleyballPosition)}
                className="px-2.5 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={newPlayerHeight}
                onChange={(e) => setNewPlayerHeight(e.target.value)}
                placeholder="Ht (cm)"
                className="px-2.5 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
              />
              <label className="flex items-center justify-center gap-1.5 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPlayerCaptain}
                  onChange={(e) => setNewPlayerCaptain(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Capt.</span>
              </label>
              <button
                type="submit"
                disabled={busyId === 'add-player'}
                className="px-3 py-2 rounded-lg bg-[#F97316] hover:bg-orange-500 text-white font-bold cursor-pointer"
              >
                + Add
              </button>
            </form>

            {/* Roster List */}
            {rosterPlayers.length === 0 ? (
              <p className="text-center py-6 text-slate-500">No players added to this team yet.</p>
            ) : (
              <div className="divide-y divide-[#1E293B] rounded-2xl border border-[#1E293B] bg-[#0B0F19]">
                {rosterPlayers.map((pl) => (
                  <div key={pl.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#111827] border border-[#1E293B] font-mono font-black text-orange-400 flex items-center justify-center shrink-0">
                        #{pl.jerseyNumber}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{pl.fullName}</span>
                          {pl.isCaptain && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black">
                              CAPTAIN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {pl.position}
                          {pl.height ? ` · ${pl.height}cm` : ''}
                          {pl.spikeTouch ? ` · Reach ${pl.spikeTouch}cm` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {AWARDS.map((aw) => {
                        const active = pl.awards.includes(aw);
                        return (
                          <button
                            key={aw}
                            type="button"
                            onClick={() => handleToggleAward(pl, aw)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/50'
                                : 'bg-[#111827] text-slate-500 border-[#1E293B] hover:text-slate-300'
                            }`}
                            title={TOURNAMENT_AWARD_LABELS[aw]}
                          >
                            {aw.replace('BEST_', '')}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleDeletePlayer(pl.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
