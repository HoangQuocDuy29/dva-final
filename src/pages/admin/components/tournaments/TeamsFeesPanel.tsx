import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Camera,
  Check,
  CheckCircle2,
  Edit3,
  Flag,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
  XCircle,
  Loader2,
  Download,
} from 'lucide-react';
import {
  PaymentStatus,
  PlayerEligibilityStatus,
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
import { TeamLogo } from '../../../../components/tournaments/TeamLogoBadge';
import { getNextAvailableJerseyNumber, suggestTeamShortName } from '../../../../shared/tournaments';

/** Official DVA Volleyball Club crest served from `/public/logo.png` (1-click default for DVA squads). */
const DVA_DEFAULT_LOGO_URL = '/logo.png';

const parseJerseyNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null;
};

interface TeamsFeesPanelProps {
  tournament: Tournament;
  onRefresh: () => Promise<void>;
  notify: (msg: string, durationMs?: number) => void;
}

const AWARDS: Array<{ code: TournamentIndividualAward; short: string }> = [
  { code: 'MVP', short: 'MVP' },
  { code: 'BEST_OUTSIDE_HITTER', short: 'OH' },
  { code: 'BEST_MIDDLE_BLOCKER', short: 'MB' },
  { code: 'BEST_OPPOSITE', short: 'OP' },
  { code: 'BEST_SETTER', short: 'S' },
  { code: 'BEST_LIBERO', short: 'L' },
];
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
  const [logoBusyTeamId, setLogoBusyTeamId] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);

  // Roster Drawer / Modal per Team
  const [rosterTeamId, setRosterTeamId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJersey, setNewPlayerJersey] = useState('1');
  const [newPlayerPos, setNewPlayerPos] = useState<VolleyballPosition>('OH');
  const [newPlayerHeight, setNewPlayerHeight] = useState('');
  const [newPlayerReach, setNewPlayerReach] = useState('');
  const [newPlayerBirthYear, setNewPlayerBirthYear] = useState('');
  const [newPlayerAvatarUrl, setNewPlayerAvatarUrl] = useState('');
  const [newPlayerCaptain, setNewPlayerCaptain] = useState(false);
  const [uploadingNewAvatar, setUploadingNewAvatar] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerJersey, setEditPlayerJersey] = useState('1');
  const [editPlayerPos, setEditPlayerPos] = useState<VolleyballPosition>('OH');
  const [editPlayerHeight, setEditPlayerHeight] = useState('');
  const [editPlayerReach, setEditPlayerReach] = useState('');
  const [editPlayerBirthYear, setEditPlayerBirthYear] = useState('');
  const [editPlayerStatus, setEditPlayerStatus] = useState<PlayerEligibilityStatus>('VERIFIED');
  const [editPlayerReason, setEditPlayerReason] = useState('');
  const [editPlayerAvatarUrl, setEditPlayerAvatarUrl] = useState('');
  const [editPlayerCaptain, setEditPlayerCaptain] = useState(false);
  const [moderatingPlayerId, setModeratingPlayerId] = useState<string | null>(null);
  const [moderationStatus, setModerationStatus] = useState<'FLAGGED' | 'REJECTED'>('REJECTED');
  const [moderationReason, setModerationReason] = useState('');
  const [uploadingPlayerId, setUploadingPlayerId] = useState<string | null>(null);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rosterTeam = tournament.teams.find((t) => t.id === rosterTeamId) || null;
  const rosterPlayers = rosterTeam
    ? tournament.players
        .filter((p) => p.teamId === rosterTeam.id)
        .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain) || a.jerseyNumber - b.jerseyNumber)
    : [];
  const eligibleRosterCount = rosterPlayers.filter((p) => p.eligibilityStatus !== 'REJECTED').length;
  const verifiedRosterCount = rosterPlayers.filter((p) => p.eligibilityStatus === 'VERIFIED').length;
  const pendingRosterCount = rosterPlayers.filter((p) => p.eligibilityStatus === 'PENDING_CHECK').length;
  const rejectedRosterCount = rosterPlayers.filter((p) => p.eligibilityStatus === 'REJECTED').length;

  const parsedNewJersey = parseJerseyNumber(newPlayerJersey);
  const newJerseyConflict =
    parsedNewJersey !== null ? rosterPlayers.find((p) => p.jerseyNumber === parsedNewJersey) || null : null;
  const newJerseyInvalid = parsedNewJersey === null;

  const parsedEditJersey = parseJerseyNumber(editPlayerJersey);
  const editJerseyConflict =
    editingPlayerId && parsedEditJersey !== null
      ? rosterPlayers.find((p) => p.id !== editingPlayerId && p.jerseyNumber === parsedEditJersey) || null
      : null;
  const editJerseyInvalid = parsedEditJersey === null;

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

  /** Quick per-row logo management directly from the Teams table (upload / DVA default / remove). */
  const applyTeamLogo = async (team: TournamentTeam, nextLogoUrl: string | null, successMsg: string) => {
    setLogoBusyTeamId(team.id);
    try {
      await tournamentService.updateTeam(tournament.id, team.id, { logoUrl: nextLogoUrl });
      await onRefresh();
      notify(successMsg);
    } catch (err: any) {
      notify(err?.message || 'Unable to update team logo.');
    } finally {
      setLogoBusyTeamId(null);
    }
  };

  const handleRowLogoUpload = async (team: TournamentTeam, file?: File) => {
    if (!file) return;
    setLogoBusyTeamId(team.id);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'logos'));
      await applyTeamLogo(team, res.secure_url || res.url, `Updated logo for "${team.name}".`);
    } catch {
      notify('Logo upload failed.');
      setLogoBusyTeamId(null);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSavingTeam(true);
    try {
      const payload: Partial<TournamentTeam> & { importDvaSquad?: boolean } = {
        name: teamName.trim(),
        shortName: shortName.trim().toUpperCase() || suggestTeamShortName(teamName) || undefined,
        logoUrl: editingTeam ? logoUrl.trim() || null : logoUrl.trim() || undefined,
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

  const handleNewPlayerAvatarUpload = async (file?: File) => {
    if (!file) return;
    setUploadingNewAvatar(true);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'players'));
      setNewPlayerAvatarUrl(res.secure_url || res.url);
      notify(`Uploaded athlete photo (${res.folder}).`);
    } catch {
      notify('Athlete photo upload failed.');
    } finally {
      setUploadingNewAvatar(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterTeam || !newPlayerName.trim()) return;
    if (parsedNewJersey === null) {
      notify('Please enter a valid jersey number (0–99).');
      return;
    }
    if (newJerseyConflict) {
      notify(`Jersey #${parsedNewJersey} is already assigned to ${newJerseyConflict.fullName} on this team.`);
      return;
    }
    setBusyId('add-player');
    try {
      await tournamentService.addPlayer(tournament.id, {
        teamId: rosterTeam.id,
        fullName: newPlayerName.trim(),
        jerseyNumber: parsedNewJersey,
        position: newPlayerPos,
        height: newPlayerHeight ? Number(newPlayerHeight) : undefined,
        spikeTouch: newPlayerReach ? Number(newPlayerReach) : undefined,
        birthYear: newPlayerBirthYear ? Number(newPlayerBirthYear) : undefined,
        avatarUrl: newPlayerAvatarUrl.trim() || undefined,
        eligibilityStatus: 'VERIFIED',
        isCaptain: newPlayerCaptain,
      });
      setNewPlayerName('');
      setNewPlayerJersey(
        String(
          getNextAvailableJerseyNumber([
            ...rosterPlayers.map((p) => p.jerseyNumber),
            parsedNewJersey,
          ])
        )
      );
      setNewPlayerHeight('');
      setNewPlayerReach('');
      setNewPlayerBirthYear('');
      setNewPlayerAvatarUrl('');
      setNewPlayerCaptain(false);
      await onRefresh();
      notify('Verified athlete added to roster.');
    } catch (err: any) {
      notify(err?.message || 'Unable to add player.');
    } finally {
      setBusyId(null);
    }
  };

  const startEditPlayer = (player: TournamentPlayer) => {
    setModeratingPlayerId(null);
    setEditingPlayerId(player.id);
    setEditPlayerName(player.fullName);
    setEditPlayerJersey(String(player.jerseyNumber));
    setEditPlayerPos(player.position);
    setEditPlayerHeight(player.height !== undefined && player.height !== null ? String(player.height) : '');
    setEditPlayerReach(player.spikeTouch !== undefined && player.spikeTouch !== null ? String(player.spikeTouch) : '');
    setEditPlayerBirthYear(player.birthYear !== undefined && player.birthYear !== null ? String(player.birthYear) : '');
    setEditPlayerStatus(player.eligibilityStatus || 'VERIFIED');
    setEditPlayerReason(player.rejectionReason || '');
    setEditPlayerAvatarUrl(player.avatarUrl || '');
    setEditPlayerCaptain(Boolean(player.isCaptain));
  };

  const handleSavePlayerEdit = async (e: React.FormEvent, playerId: string) => {
    e.preventDefault();
    if (!editPlayerName.trim()) {
      notify('Athlete full name is required.');
      return;
    }
    if (parsedEditJersey === null) {
      notify('Please enter a valid jersey number (0–99).');
      return;
    }
    if (editJerseyConflict) {
      notify(`Jersey #${parsedEditJersey} is already assigned to ${editJerseyConflict.fullName} on this team.`);
      return;
    }
    setSavingPlayerId(playerId);
    try {
      await tournamentService.updatePlayer(tournament.id, playerId, {
        fullName: editPlayerName.trim(),
        jerseyNumber: parsedEditJersey,
        position: editPlayerPos,
        height: editPlayerHeight.trim() ? Number(editPlayerHeight) : null,
        spikeTouch: editPlayerReach.trim() ? Number(editPlayerReach) : null,
        birthYear: editPlayerBirthYear.trim() ? Number(editPlayerBirthYear) : null,
        eligibilityStatus: editPlayerStatus,
        rejectionReason:
          editPlayerStatus === 'VERIFIED' ? null : editPlayerReason.trim() || null,
        avatarUrl: editPlayerAvatarUrl.trim() || null,
        isCaptain: editPlayerCaptain,
      });
      setEditingPlayerId(null);
      await onRefresh();
      notify(`Updated athlete "${editPlayerName.trim()}".`);
    } catch (err: any) {
      notify(err?.message || 'Unable to update athlete details.');
    } finally {
      setSavingPlayerId(null);
    }
  };

  const handleApprovePlayer = async (player: TournamentPlayer) => {
    setBusyId(player.id);
    try {
      await tournamentService.updatePlayer(tournament.id, player.id, {
        eligibilityStatus: 'VERIFIED',
        rejectionReason: null,
      });
      if (moderatingPlayerId === player.id) setModeratingPlayerId(null);
      await onRefresh();
      notify(`Approved ${player.fullName} (VERIFIED).`);
    } catch (err: any) {
      notify(err?.message || 'Unable to verify athlete.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitModeration = async (e: React.FormEvent, player: TournamentPlayer) => {
    e.preventDefault();
    if (moderationStatus === 'REJECTED' && !moderationReason.trim()) {
      notify('Please enter a short reason when rejecting an athlete.');
      return;
    }
    setBusyId(player.id);
    try {
      await tournamentService.updatePlayer(tournament.id, player.id, {
        eligibilityStatus: moderationStatus,
        rejectionReason: moderationReason.trim() || null,
      });
      setModeratingPlayerId(null);
      setModerationReason('');
      await onRefresh();
      notify(
        moderationStatus === 'REJECTED'
          ? `Rejected ${player.fullName} (hidden from public roster).`
          : `Flagged ${player.fullName} for Organizing Committee review.`
      );
    } catch (err: any) {
      notify(err?.message || 'Unable to update athlete status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleVerifyAllRoster = async () => {
    if (!rosterTeam) return;
    setBusyId('verify-all');
    try {
      const res = await tournamentService.verifyTeamRoster(tournament.id, rosterTeam.id);
      await onRefresh();
      notify(`Verified ${res.verifiedCount} athletes for ${rosterTeam.name}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to batch verify roster.');
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickPlayerAvatarUpload = async (player: TournamentPlayer, file?: File) => {
    if (!file) return;
    setUploadingPlayerId(player.id);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'players'));
      const url = res.secure_url || res.url;
      await tournamentService.updatePlayer(tournament.id, player.id, { avatarUrl: url });
      if (editingPlayerId === player.id) {
        setEditPlayerAvatarUrl(url);
      }
      await onRefresh();
      notify(`Updated photo for ${player.fullName}.`);
    } catch (err: any) {
      notify(err?.message || 'Failed uploading athlete photo.');
    } finally {
      setUploadingPlayerId(null);
    }
  };

  const handleClearPlayerAvatar = async (player: TournamentPlayer) => {
    setUploadingPlayerId(player.id);
    try {
      await tournamentService.updatePlayer(tournament.id, player.id, { avatarUrl: null });
      if (editingPlayerId === player.id) {
        setEditPlayerAvatarUrl('');
      }
      await onRefresh();
      notify(`Removed photo for ${player.fullName}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to remove photo.');
    } finally {
      setUploadingPlayerId(null);
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
                const teamPlayers = tournament.players.filter((p) => p.teamId === tm.id);
                const eligiblePlayers = teamPlayers.filter((p) => p.eligibilityStatus !== 'REJECTED').length;
                const pendingPlayers = teamPlayers.filter((p) => p.eligibilityStatus === 'PENDING_CHECK').length;
                const flaggedOrRejected = teamPlayers.filter(
                  (p) => p.eligibilityStatus === 'FLAGGED' || p.eligibilityStatus === 'REJECTED'
                ).length;
                const isBusy = busyId === tm.id;
                return (
                  <tr key={tm.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <TeamLogo
                          logoUrl={tm.logoUrl}
                          name={tm.name}
                          shortName={tm.shortName}
                          sizeClass="w-9 h-9"
                        />
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
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                            <label
                              title="Upload square logo (recommended 400×400px PNG/JPG)"
                              className={`px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold inline-flex items-center gap-1 ${
                                logoBusyTeamId === tm.id ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                              }`}
                            >
                              {logoBusyTeamId === tm.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Upload className="w-3 h-3" />
                              )}
                              <span>{tm.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  void handleRowLogoUpload(tm, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {tm.isDvaTeam && tm.logoUrl !== DVA_DEFAULT_LOGO_URL && (
                              <button
                                type="button"
                                disabled={logoBusyTeamId === tm.id}
                                onClick={() =>
                                  void applyTeamLogo(tm, DVA_DEFAULT_LOGO_URL, `Applied DVA default logo to "${tm.name}".`)
                                }
                                className="px-1.5 py-0.5 rounded bg-red-950/70 hover:bg-red-900/70 border border-red-700/60 text-red-200 font-bold cursor-pointer disabled:opacity-50"
                              >
                                Use DVA Logo
                              </button>
                            )}
                            {tm.logoUrl && (
                              <button
                                type="button"
                                disabled={logoBusyTeamId === tm.id}
                                onClick={() => {
                                  if (!window.confirm(`Remove logo for "${tm.name}"? The short-code badge will be shown instead.`)) return;
                                  void applyTeamLogo(tm, null, `Removed logo for "${tm.name}".`);
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-red-950/70 border border-slate-700 text-slate-400 hover:text-red-300 font-semibold cursor-pointer disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
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

                    <td className="py-3 px-3 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlayerId(null);
                          setModeratingPlayerId(null);
                          setNewPlayerAvatarUrl('');
                          setNewPlayerJersey(
                            String(getNextAvailableJerseyNumber(teamPlayers.map((p) => p.jerseyNumber)))
                          );
                          setRosterTeamId(tm.id);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-sky-300 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{eligiblePlayers} Valid</span>
                      </button>
                      {(pendingPlayers > 0 || flaggedOrRejected > 0 || (teamPlayers.length > 0 && eligiblePlayers < 7)) && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          {pendingPlayers > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/60 font-semibold">
                              {pendingPlayers} pending
                            </span>
                          )}
                          {flaggedOrRejected > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 font-semibold">
                              {flaggedOrRejected} flagged/rej
                            </span>
                          )}
                          {teamPlayers.length > 0 && eligiblePlayers < 7 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold">
                              &lt;7 min
                            </span>
                          )}
                        </div>
                      )}
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
                <div className="sm:col-span-2 flex items-center gap-3">
                  <TeamLogo
                    logoUrl={logoUrl}
                    name={teamName || 'Team'}
                    shortName={shortName}
                    sizeClass="w-10 h-10"
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block text-slate-300 font-semibold mb-1">Logo URL</label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/..."
                      className="w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]"
                    />
                  </div>
                </div>
                <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />}
                  <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleLogoUpload(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 -mt-1 text-[11px]">
                <span className="text-slate-500">Recommended: square 400×400px PNG/JPG (white or transparent background).</span>
                {isDvaTeam && logoUrl !== DVA_DEFAULT_LOGO_URL && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(DVA_DEFAULT_LOGO_URL)}
                    className="px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/70 border border-red-700/60 text-red-200 font-bold cursor-pointer"
                  >
                    Use Default DVA Logo
                  </button>
                )}
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-red-950/70 border border-slate-700 text-slate-400 hover:text-red-300 font-semibold cursor-pointer"
                  >
                    Remove Logo
                  </button>
                )}
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
          <div className="w-full max-w-5xl bg-[#111827] border border-[#1E293B] rounded-3xl p-6 text-white space-y-4 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
              <div>
                <h4 className="font-heading font-black text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FACC15]" />
                  <span>{rosterTeam.name} — Roster Verification, Photos &amp; Awards</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Review athlete birth years &amp; eligibility (Approve / Flag / Reject), upload photos, edit details, and assign awards.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pendingRosterCount > 0 && (
                  <button
                    type="button"
                    disabled={busyId === 'verify-all'}
                    onClick={handleVerifyAllRoster}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve All Pending ({pendingRosterCount})</span>
                  </button>
                )}
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
                  onClick={() => {
                    setRosterTeamId(null);
                    setEditingPlayerId(null);
                    setModeratingPlayerId(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Roster Lock & Eligibility Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-bold">
                  Verified: {verifiedRosterCount}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#111827] border border-[#1E293B] text-slate-200 font-semibold">
                  Eligible (Non-Rejected): {eligibleRosterCount} / 7 min
                </span>
                {pendingRosterCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-700/60 text-sky-300 font-semibold">
                    Pending Review: {pendingRosterCount}
                  </span>
                )}
                {rejectedRosterCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-700/60 text-red-300 font-semibold">
                    Rejected (Hidden Publicly): {rejectedRosterCount}
                  </span>
                )}
              </div>
              {tournament.isRosterLocked && (
                <span className="px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-700/60 text-red-200 text-[10px] font-black uppercase inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Rosters Locked · Admin Emergency Override Only</span>
                </span>
              )}
            </div>

            {rosterPlayers.length > 0 && eligibleRosterCount < 7 && (
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-600/50 text-amber-200 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Team currently has <strong>{eligibleRosterCount}</strong> eligible non-rejected athletes (below the standard 7-athlete threshold). Add a replacement player below or contact Captain ({rosterTeam.captainPhone || 'N/A'}).
                </span>
              </div>
            )}

            {/* Add Athlete Form */}
            <form onSubmit={handleAddPlayer} className="p-3.5 rounded-2xl bg-[#0B0F19] border border-[#1E293B] space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                <div className="col-span-2 sm:col-span-2 flex items-center gap-2">
                  {newPlayerAvatarUrl ? (
                    <div className="relative w-9 h-9 shrink-0">
                      <img
                        src={optimizeCloudinaryUrl(newPlayerAvatarUrl, 'thumb')}
                        alt="New player preview"
                        className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPlayerAvatarUrl('')}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer"
                        title="Clear photo"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex-1 px-2 py-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] text-sky-300 font-bold flex items-center justify-center gap-1 cursor-pointer truncate">
                    {uploadingNewAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{uploadingNewAvatar ? 'Up...' : 'Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void handleNewPlayerAvatarUpload(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  required
                  value={newPlayerJersey}
                  onChange={(e) => setNewPlayerJersey(e.target.value)}
                  placeholder="#"
                  title="Jersey Number (0–99)"
                  className={`col-span-1 sm:col-span-1 px-2 py-2 rounded-lg border font-mono text-center ${
                    newJerseyInvalid || newJerseyConflict
                      ? 'bg-red-950/50 border-red-500 text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400'
                      : 'bg-[#111827] border-[#1E293B]'
                  }`}
                />
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player Full Name *"
                  className="col-span-1 sm:col-span-3 px-3 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                />
                <select
                  value={newPlayerPos}
                  onChange={(e) => setNewPlayerPos(e.target.value as VolleyballPosition)}
                  className="col-span-1 sm:col-span-1 px-2 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1960}
                  max={2015}
                  value={newPlayerBirthYear}
                  onChange={(e) => setNewPlayerBirthYear(e.target.value)}
                  placeholder="Born Yr"
                  title="Birth Year (1960–2015)"
                  className="col-span-1 sm:col-span-1 px-2 py-2 rounded-lg bg-[#111827] border border-[#1E293B] font-mono text-amber-200"
                />
                <input
                  type="number"
                  value={newPlayerHeight}
                  onChange={(e) => setNewPlayerHeight(e.target.value)}
                  placeholder="Ht(cm)"
                  className="col-span-1 sm:col-span-1 px-2 py-2 rounded-lg bg-[#111827] border border-[#1E293B]"
                />
                <label className="col-span-1 sm:col-span-1 flex items-center justify-center gap-1 text-[11px] cursor-pointer">
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
                  disabled={busyId === 'add-player' || uploadingNewAvatar || newJerseyInvalid || Boolean(newJerseyConflict)}
                  className="col-span-2 sm:col-span-2 px-3 py-2 rounded-lg bg-[#F97316] hover:bg-orange-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  + Add Verified
                </button>
              </div>
              {(newJerseyConflict || newJerseyInvalid) && (
                <p className="text-[11px] font-semibold text-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>
                    {newJerseyConflict
                      ? `Jersey #${parsedNewJersey} is already assigned to ${newJerseyConflict.fullName} on this team.`
                      : 'Enter a valid unique jersey number (0–99).'}
                  </span>
                </p>
              )}
            </form>

            {/* Roster List */}
            {rosterPlayers.length === 0 ? (
              <p className="text-center py-6 text-slate-500">No players added to this team yet.</p>
            ) : (
              <div className="divide-y divide-[#1E293B] rounded-2xl border border-[#1E293B] bg-[#0B0F19]">
                {rosterPlayers.map((pl) => {
                  const isEditingThis = editingPlayerId === pl.id;
                  const isModeratingThis = moderatingPlayerId === pl.id;
                  const isUploadingThis = uploadingPlayerId === pl.id;
                  const isSavingThis = savingPlayerId === pl.id;
                  const status = pl.eligibilityStatus || 'VERIFIED';

                  if (isEditingThis) {
                    return (
                      <form
                        key={pl.id}
                        onSubmit={(e) => handleSavePlayerEdit(e, pl.id)}
                        className="p-3.5 bg-[#111827]/70 space-y-2.5"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            required
                            value={editPlayerJersey}
                            onChange={(e) => setEditPlayerJersey(e.target.value)}
                            placeholder="#"
                            title="Jersey # (0–99)"
                            className={`col-span-1 sm:col-span-1 px-2 py-2 rounded-lg border font-mono text-center font-bold ${
                              editJerseyInvalid || editJerseyConflict
                                ? 'bg-red-950/50 border-red-500 text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400'
                                : 'bg-[#0B0F19] border-[#1E293B] text-amber-300'
                            }`}
                          />
                          <input
                            type="text"
                            required
                            value={editPlayerName}
                            onChange={(e) => setEditPlayerName(e.target.value)}
                            placeholder="Full Name *"
                            className="col-span-1 sm:col-span-3 px-3 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-white font-semibold"
                          />
                          <select
                            value={editPlayerPos}
                            onChange={(e) => setEditPlayerPos(e.target.value as VolleyballPosition)}
                            className="col-span-1 sm:col-span-2 px-2 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-white"
                          >
                            {POSITIONS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1960}
                            max={2015}
                            value={editPlayerBirthYear}
                            onChange={(e) => setEditPlayerBirthYear(e.target.value)}
                            placeholder="Birth Yr"
                            className="col-span-1 sm:col-span-2 px-2.5 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B] font-mono text-amber-200"
                          />
                          <input
                            type="number"
                            value={editPlayerHeight}
                            onChange={(e) => setEditPlayerHeight(e.target.value)}
                            placeholder="Ht (cm)"
                            className="col-span-1 sm:col-span-1 px-2 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B]"
                          />
                          <input
                            type="number"
                            value={editPlayerReach}
                            onChange={(e) => setEditPlayerReach(e.target.value)}
                            placeholder="Spk"
                            className="col-span-1 sm:col-span-1 px-2 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B]"
                          />
                          <label className="col-span-2 sm:col-span-2 flex items-center justify-center gap-1 text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPlayerCaptain}
                              onChange={(e) => setEditPlayerCaptain(e.target.checked)}
                              className="accent-amber-400"
                            />
                            <span>Capt.</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <select
                            value={editPlayerStatus}
                            onChange={(e) => setEditPlayerStatus(e.target.value as PlayerEligibilityStatus)}
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] font-bold text-white"
                          >
                            <option value="VERIFIED">VERIFIED (Eligible)</option>
                            <option value="PENDING_CHECK">PENDING_CHECK</option>
                            <option value="FLAGGED">FLAGGED (Review)</option>
                            <option value="REJECTED">REJECTED (Hidden Public)</option>
                          </select>
                          <input
                            type="text"
                            value={editPlayerReason}
                            onChange={(e) => setEditPlayerReason(e.target.value)}
                            disabled={editPlayerStatus === 'VERIFIED'}
                            placeholder={
                              editPlayerStatus === 'VERIFIED'
                                ? 'No rejection/flag note needed when VERIFIED'
                                : 'Reason (e.g. Vi phạm điều lệ: VĐV chuyên nghiệp tuyến 1)'
                            }
                            className="sm:col-span-9 px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-slate-300 disabled:opacity-50"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-[#0B0F19] border border-[#1E293B] overflow-hidden shrink-0 flex items-center justify-center font-mono font-black text-orange-400">
                            {editPlayerAvatarUrl ? (
                              <img
                                src={optimizeCloudinaryUrl(editPlayerAvatarUrl, 'thumb')}
                                alt={editPlayerName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              `#${editPlayerJersey.trim() || '?'}`
                            )}
                          </div>
                          <input
                            type="text"
                            value={editPlayerAvatarUrl}
                            onChange={(e) => setEditPlayerAvatarUrl(e.target.value)}
                            placeholder="Athlete photo URL (or click Upload Photo ->)"
                            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-slate-300"
                          />
                          <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold inline-flex items-center gap-1.5 cursor-pointer">
                            {isUploadingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>{isUploadingThis ? 'Uploading...' : 'Upload Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                void handleQuickPlayerAvatarUpload(pl, e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {editPlayerAvatarUrl && (
                            <button
                              type="button"
                              onClick={() => setEditPlayerAvatarUrl('')}
                              className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800/50 text-red-300 font-semibold cursor-pointer"
                            >
                              Remove Photo
                            </button>
                          )}
                          <div className="ml-auto flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingPlayerId(null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingThis || isUploadingThis || editJerseyInvalid || Boolean(editJerseyConflict)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isSavingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                        {(editJerseyConflict || editJerseyInvalid) && (
                          <p className="text-[11px] font-semibold text-red-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span>
                              {editJerseyConflict
                                ? `Jersey #${parsedEditJersey} is already assigned to ${editJerseyConflict.fullName} on this team.`
                                : 'Enter a valid unique jersey number (0–99).'}
                            </span>
                          </p>
                        )}
                      </form>
                    );
                  }

                  const statusBadgeClass =
                    status === 'VERIFIED'
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                      : status === 'FLAGGED'
                      ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                      : status === 'REJECTED'
                      ? 'bg-red-950/80 text-red-300 border-red-700/70'
                      : 'bg-sky-950/70 text-sky-300 border-sky-700/60';

                  return (
                    <div
                      key={pl.id}
                      className={`p-3 space-y-2 ${status === 'REJECTED' ? 'bg-red-950/15' : ''}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative group shrink-0">
                            {pl.avatarUrl ? (
                              <img
                                src={optimizeCloudinaryUrl(pl.avatarUrl, 'thumb')}
                                alt={pl.fullName}
                                className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                              />
                            ) : (
                              <span className="w-11 h-11 rounded-xl bg-[#111827] border border-[#1E293B] font-mono font-black text-orange-400 flex items-center justify-center">
                                #{pl.jerseyNumber}
                              </span>
                            )}
                            <label
                              title="Upload / Replace player photo"
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0B0F19] hover:bg-sky-600 border border-slate-600 text-sky-300 hover:text-white flex items-center justify-center cursor-pointer shadow"
                            >
                              {isUploadingThis ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Camera className="w-2.5 h-2.5" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  void handleQuickPlayerAvatarUpload(pl, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="font-bold text-white flex flex-wrap items-center gap-1.5">
                              <span className={status === 'REJECTED' ? 'line-through text-slate-400' : ''}>
                                {pl.fullName}
                              </span>
                              {pl.birthYear && (
                                <span className="px-1.5 py-0.5 rounded bg-[#111827] border border-[#1E293B] font-mono text-[10px] font-black text-[#38BDF8]">
                                  {pl.birthYear}
                                </span>
                              )}
                              {pl.isCaptain && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black">
                                  CAPTAIN
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${statusBadgeClass}`}>
                                {status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-1.5">
                              <span className="font-mono text-orange-400 font-bold">#{pl.jerseyNumber}</span>
                              <span>· {pl.position}</span>
                              {pl.height ? <span>· {pl.height}cm</span> : null}
                              {pl.spikeTouch ? <span>· Reach {pl.spikeTouch}cm</span> : null}
                              {pl.avatarUrl && (
                                <button
                                  type="button"
                                  disabled={isUploadingThis}
                                  onClick={() => handleClearPlayerAvatar(pl)}
                                  className="text-[10px] text-slate-500 hover:text-red-300 underline cursor-pointer ml-1"
                                >
                                  remove photo
                                </button>
                              )}
                            </div>
                            {pl.rejectionReason && status !== 'VERIFIED' && (
                              <p className="text-[11px] text-red-300 italic">
                                Reason: {pl.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {status !== 'VERIFIED' && (
                            <button
                              type="button"
                              disabled={busyId === pl.id}
                              onClick={() => handleApprovePlayer(pl)}
                              className="px-2 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                              title="Approve athlete as VERIFIED"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlayerId(null);
                              setModeratingPlayerId(isModeratingThis && moderationStatus === 'FLAGGED' ? null : pl.id);
                              setModerationStatus('FLAGGED');
                              setModerationReason(pl.rejectionReason || '');
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/50 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                            title="Flag athlete for review"
                          >
                            <Flag className="w-3 h-3" />
                            <span>Flag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlayerId(null);
                              setModeratingPlayerId(isModeratingThis && moderationStatus === 'REJECTED' ? null : pl.id);
                              setModerationStatus('REJECTED');
                              setModerationReason(pl.rejectionReason || '');
                            }}
                            className="px-2 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/70 border border-red-700/60 text-red-300 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                            title="Reject athlete (hides from public roster)"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>

                          {AWARDS.map(({ code, short }) => {
                            const active = pl.awards.includes(code);
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => handleToggleAward(pl, code)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/50'
                                    : 'bg-[#111827] text-slate-500 border-[#1E293B] hover:text-slate-300'
                                }`}
                                title={TOURNAMENT_AWARD_LABELS[code]}
                              >
                                {short}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => startEditPlayer(pl)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white cursor-pointer ml-1"
                            title="Edit athlete info & photo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(pl.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
                            title="Delete athlete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isModeratingThis && (
                        <form
                          onSubmit={(e) => handleSubmitModeration(e, pl)}
                          className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#111827] border border-red-800/50"
                        >
                          <span className="text-[10px] font-black uppercase text-amber-300 px-1.5">
                            {moderationStatus === 'REJECTED' ? 'Reject Athlete:' : 'Flag for Review:'}
                          </span>
                          <input
                            type="text"
                            required={moderationStatus === 'REJECTED'}
                            value={moderationReason}
                            onChange={(e) => setModerationReason(e.target.value)}
                            placeholder="Reason (e.g. Vi phạm điều lệ: VĐV chuyên nghiệp tuyến 1)"
                            className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setModeratingPlayerId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={busyId === pl.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
                          >
                            Confirm {moderationStatus}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
