import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Edit3, Trash2, Eye, EyeOff, ImageOff, Users } from 'lucide-react';
import { Player, PlayerGender, SkillRank, countryCodeToFlagEmoji } from '../../../types';
import { SKILL_RANKS, getSkillRankMeta, UNRANKED_BADGE_CLASS } from '../../../shared/skillRanks';
import { PLAYER_COUNTRIES } from '../../../data/countries';
import { playerService } from '../../../services/api';
import { Pagination } from '../../../components/common/Pagination';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { createDefaultPlayerForm } from '../constants';
import { AthleteRosterAvatar } from '../components/AthleteRosterAvatar';
import { PlayerFormModal } from '../components/players/PlayerFormModal';
import { SlowServerPill } from '../../../components/common/GlassLoading';

const PLAYERS_PAGE_SIZE = 12;

export const PlayersTab: React.FC = () => {
  const {
    data: { players, loadedScopes },
    setData: { setPlayers },
    notify,
  } = useAdminDashboard();

  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'HIDDEN'>('ALL');
  const [rankFilter, setRankFilter] = useState<'ALL' | SkillRank | 'UNRANKED'>('ALL');
  const [missingAvatarOnly, setMissingAvatarOnly] = useState<boolean>(false);
  const [missingGenderOnly, setMissingGenderOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isUploadingPlayerPhoto, setIsUploadingPlayerPhoto] = useState(false);
  const [playerForm, setPlayerForm] = useState<Partial<Player>>(() => createDefaultPlayerForm(1));

  const handleTogglePlayerVisibility = async (p: Player) => {
    const nextState = p.isActive === false;
    try {
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isActive: nextState } : item))
      );
      await playerService.toggleVisibility(p.id, nextState);
      notify(
        `Athlete ${p.fullName} is now ${nextState ? 'Published (Active)' : 'Hidden'}.`,
        3000
      );
    } catch {
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isActive: !nextState } : item))
      );
      notify('Error updating athlete visibility', 3000);
    }
  };

  const handleQuickSkillRankChange = async (p: Player, rawValue: string) => {
    const nextRank = (rawValue === '' ? null : rawValue) as SkillRank | null;
    const prevRank = p.skillRank ?? null;
    if (nextRank === prevRank) return;
    try {
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, skillRank: nextRank } : item))
      );
      const updated = await playerService.updateSkillRank(p.id, nextRank);
      setPlayers((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, skillRank: updated.skillRank ?? nextRank } : item
        )
      );
      notify(
        `Updated ${p.fullName} USAV Rank → ${nextRank ? `RANK: ${nextRank}` : 'Chưa xếp hạng'}.`,
        2500
      );
    } catch {
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, skillRank: prevRank } : item))
      );
      notify('Error updating athlete USAV skill rank', 3000);
    }
  };

  const handleQuickGenderCycle = async (p: Player) => {
    const prevGender = p.gender ?? null;
    const nextGender: PlayerGender | null =
      prevGender === null ? 'MALE' : prevGender === 'MALE' ? 'FEMALE' : null;
    try {
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, gender: nextGender } : item))
      );
      const updated = await playerService.updateGender(p.id, nextGender);
      const resolvedGender = updated.gender ?? nextGender;
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, gender: resolvedGender } : item))
      );
      notify(
        `Đã cập nhật giới tính ${p.fullName} → ${
          resolvedGender === 'MALE' ? '♂ Nam' : resolvedGender === 'FEMALE' ? '♀ Nữ' : 'Chưa rõ'
        }.`,
        2200
      );
    } catch {
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, gender: prevGender } : item))
      );
      notify('Error updating athlete gender', 3000);
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resolvedCode = (playerForm.countryCode || 'VN').toUpperCase();
      const matchedCountry = PLAYER_COUNTRIES.find((c) => c.code === resolvedCode);
      const resolvedCountry =
        playerForm.country || playerForm.countryName || matchedCountry?.name || 'Vietnam';
      const resolvedFlag =
        playerForm.countryFlag || matchedCountry?.flag || countryCodeToFlagEmoji(resolvedCode);
      const resolvedJoinedYear = Number(playerForm.joined ?? playerForm.joinedYear ?? 2025) || 2025;

      const rawBornYear = playerForm.bornYear ?? (playerForm as { birthYear?: number }).birthYear;
      const parsedBornYear =
        rawBornYear !== undefined && rawBornYear !== null && String(rawBornYear).trim() !== ''
          ? Math.trunc(Number(rawBornYear))
          : undefined;
      const resolvedBornYear =
        parsedBornYear !== undefined && Number.isFinite(parsedBornYear) && parsedBornYear > 0
          ? parsedBornYear
          : undefined;

      const payload: Partial<Player> = {
        ...playerForm,
        skillRank: (playerForm.skillRank || null) as SkillRank | null,
        gender: (playerForm.gender || null) as PlayerGender | null,
        ...(editingPlayer
          ? { bornYear: (resolvedBornYear ?? null) as unknown as number | undefined }
          : resolvedBornYear !== undefined
            ? { bornYear: resolvedBornYear }
            : { bornYear: undefined }),
        country: resolvedCountry,
        countryName: resolvedCountry,
        countryCode: resolvedCode,
        countryFlag: resolvedFlag,
        joined: resolvedJoinedYear,
        joinedYear: resolvedJoinedYear,
      };

      if (editingPlayer) {
        const updated = await playerService.updatePlayer(editingPlayer.id, payload);
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === editingPlayer.id
              ? {
                  ...p,
                  ...payload,
                  ...updated,
                  bornYear: updated.bornYear,
                  skillRank: updated.skillRank ?? null,
                  gender: updated.gender ?? null,
                }
              : p
          )
        );
        notify(`Player ${payload.fullName} updated successfully.`, 3000);
      } else {
        const created = await playerService.addPlayer(payload);
        setPlayers((prev) => [
          {
            ...payload,
            ...created,
            bornYear: created.bornYear,
            skillRank: created.skillRank ?? null,
            gender: created.gender ?? null,
          } as Player,
          ...prev,
        ]);
        notify(`Athlete ${payload.fullName} added to DVA roster.`, 3000);
      }
      setIsPlayerModalOpen(false);
    } catch (err) {
      alert('Error saving player');
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!window.confirm(`Delete athlete ${name} from roster?`)) return;
    try {
      await playerService.deletePlayer(id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      notify(`Athlete ${name} removed.`, 3000);
    } catch (e) {
      alert('Error deleting player');
    }
  };

  const activeCount = players.filter((p) => p.isActive !== false).length;
  const hiddenCount = players.filter((p) => p.isActive === false).length;
  const missingAvatarCount = players.filter((p) => !p.avatarUrl || p.avatarUrl.trim() === '').length;
  const missingGenderCount = players.filter((p) => !p.gender).length;

  const filteredPlayers = players.filter((p) => {
    // Status Filter (All | Active | Hidden)
    if (statusFilter === 'ACTIVE' && p.isActive === false) return false;
    if (statusFilter === 'HIDDEN' && p.isActive !== false) return false;

    // Missing Avatar Filter
    if (missingAvatarOnly && p.avatarUrl && p.avatarUrl.trim() !== '') return false;

    // Missing Gender Filter
    if (missingGenderOnly && p.gender) return false;

    // USAV Skill Rank Filter
    if (rankFilter === 'UNRANKED' && p.skillRank) return false;
    if (rankFilter !== 'ALL' && rankFilter !== 'UNRANKED' && p.skillRank !== rankFilter) return false;

    if (!playerSearchQuery.trim()) return true;
    const q = playerSearchQuery.toLowerCase().trim();
    const matchName = p.fullName.toLowerCase().includes(q);
    const matchJersey = String(p.jerseyNumber).includes(q) || `#${p.jerseyNumber}`.includes(q);
    const matchPos = p.position.toLowerCase().includes(q);
    const matchLevel = p.level.toLowerCase().includes(q);
    const matchRank = (p.skillRank || 'unranked').toLowerCase().includes(q);
    const genderSearchText =
      p.gender === 'MALE' ? 'male nam' : p.gender === 'FEMALE' ? 'female nữ nu' : 'chưa rõ unknown';
    const matchGender = genderSearchText.includes(q);
    const matchHometown = (p.hometownCountry || '').toLowerCase().includes(q);
    const matchCountry =
      (p.country || p.countryName || '').toLowerCase().includes(q) ||
      (p.countryCode || '').toLowerCase().includes(q);
    const matchJoined = String(p.joined ?? p.joinedYear ?? '').includes(q);
    return (
      matchName ||
      matchJersey ||
      matchPos ||
      matchLevel ||
      matchRank ||
      matchGender ||
      matchHometown ||
      matchCountry ||
      matchJoined
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, rankFilter, missingAvatarOnly, missingGenderOnly, playerSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PLAYERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedPlayers = filteredPlayers.slice(
    (safePage - 1) * PLAYERS_PAGE_SIZE,
    safePage * PLAYERS_PAGE_SIZE
  );

  if (!loadedScopes.has('PLAYERS')) {
    return (
      <div className="dva-glass-panel rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-2">
            <div className="dva-skeleton-bar h-5 w-52" />
            <div className="dva-skeleton-bar h-3 w-72 max-w-full" />
          </div>
          <div className="dva-skeleton h-9 w-36 rounded-full" />
        </div>
        <div className="dva-skeleton h-11 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="dva-skeleton p-4 rounded-2xl space-y-3 h-40">
              <div className="flex items-center gap-3">
                <div className="dva-skeleton-bar w-12 h-12 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="dva-skeleton-bar h-4 w-32" />
                  <div className="dva-skeleton-bar h-3 w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="dva-skeleton-bar h-6 w-16 rounded-full" />
                <div className="dva-skeleton-bar h-6 w-20 rounded-full" />
              </div>
              <div className="dva-skeleton-bar h-3 w-full" />
            </div>
          ))}
        </div>
        <SlowServerPill active />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-5 dva-content-reveal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-white">Player Roster Management</h3>
            <p className="text-xs text-slate-400">
              Search, edit, or add official athlete cards and adjust division tiers.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPlayer(null);
              setPlayerForm(createDefaultPlayerForm(Math.floor(Math.random() * 50) + 1));
              setIsPlayerModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Athlete</span>
          </button>
        </div>

        {/* TOOLBAR: STATUS FILTERS & MISSING AVATAR & SEARCH */}
        <div className="flex flex-col gap-3 bg-[#0E1524] p-3.5 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
            {/* Quick Status Filters */}
            <div className="flex items-center gap-1.5 bg-[#161F30] p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ALL'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>All</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/30 font-mono">
                  {players.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span>Active</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/30 font-mono">
                  {activeCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('HIDDEN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'HIDDEN'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-amber-400'
                }`}
              >
                <span>Hidden</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/30 font-mono">
                  {hiddenCount}
                </span>
              </button>
            </div>

            {/* Secondary Filters: Missing Avatar & Unknown Gender */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMissingGenderOnly(!missingGenderOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  missingGenderOnly
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/60 shadow-sm'
                    : 'bg-[#161F30] text-slate-400 hover:text-slate-200 border-slate-700/60'
                }`}
                title="Lọc các thành viên chưa cập nhật giới tính"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Chưa rõ giới tính</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/40 font-mono text-sky-300">
                  {missingGenderCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMissingAvatarOnly(!missingAvatarOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  missingAvatarOnly
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/60 shadow-sm'
                    : 'bg-[#161F30] text-slate-400 hover:text-slate-200 border-slate-700/60'
                }`}
                title="Show athletes with missing photo avatar"
              >
                <ImageOff className="w-3.5 h-3.5 text-orange-400" />
                <span>Missing Avatar</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/40 font-mono text-orange-300">
                  {missingAvatarCount}
                </span>
              </button>
            </div>
          </div>

          {/* USAV Skill Rank Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">🇺🇸 USAV Rank:</span>
            {(['ALL', ...SKILL_RANKS, 'UNRANKED'] as const).map((r) => {
              const active = rankFilter === r;
              const count =
                r === 'ALL'
                  ? players.length
                  : r === 'UNRANKED'
                    ? players.filter((p) => !p.skillRank).length
                    : players.filter((p) => p.skillRank === r).length;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRankFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-[#161F30] text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                >
                  <span>{r === 'ALL' ? 'All' : r === 'UNRANKED' ? 'Unranked' : r}</span>
                  <span className="px-1 py-0.2 text-[9px] rounded-full bg-black/30 font-mono">{count}</span>
                </button>
              );
            })}
          </div>

          {/* SEARCH INPUT BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                placeholder="Search athlete by name, jersey #, position (OH/OP/MB/S/L), or division..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#161F30] border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
              {playerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPlayerSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-400 font-medium px-1 flex items-center gap-1.5 shrink-0">
              <span>Showing:</span>
              <strong className="text-white font-mono">{filteredPlayers.length}</strong>
              <span>of</span>
              <span className="text-slate-500 font-mono">{players.length} athletes</span>
            </div>
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="p-8 text-center bg-[#0E1524] rounded-2xl border border-slate-800 space-y-3">
            <p className="text-xs text-slate-400">
              No athletes found matching <strong className="text-white">"{playerSearchQuery}"</strong>.
            </p>
            <button
              type="button"
              onClick={() => setPlayerSearchQuery('')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Clear Search Filter
            </button>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPlayers.map((p) => {
              const flagEmoji = p.countryFlag || countryCodeToFlagEmoji(p.countryCode || 'VN');
              const countryLabel = p.country || p.countryName || 'Vietnam';
              const joinedLabel = p.joined ?? p.joinedYear ?? 2025;
              const rankMeta = getSkillRankMeta(p.skillRank);
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl border border-slate-800 bg-[#0E1524] flex flex-col gap-3 justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <AthleteRosterAvatar
                      avatarUrl={p.avatarUrl || (p as any).avatar || (p as any).image}
                      fullName={p.fullName}
                      jerseyNumber={p.jerseyNumber}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs flex flex-wrap items-center gap-1.5">
                        <span className="truncate">{p.fullName}</span>
                        {(p.captain || p.isCaptain) && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-sm border border-yellow-200">
                            CAPTAIN
                          </span>
                        )}
                        {p.isActive === false ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-950/80 text-amber-400 border border-amber-800 shadow-sm inline-flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" />
                            Hidden
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 shadow-sm inline-flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5" />
                            Published
                          </span>
                        )}
                        <span
                          className="text-xs select-none"
                          title={`${countryLabel} (${p.countryCode || 'VN'})`}
                        >
                          {flagEmoji}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {p.position} · {p.level} · {p.height}cm · Reach {p.spikeTouch}cm · Joined{' '}
                        {joinedLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePlayerVisibility(p)}
                      className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl cursor-pointer transition-colors ${
                        p.isActive === false
                          ? 'bg-amber-950/50 text-amber-400 hover:bg-amber-900/60 border border-amber-800/60'
                          : 'bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/60'
                      }`}
                      title={p.isActive === false ? 'Click to Publish athlete' : 'Click to Hide athlete'}
                    >
                      {p.isActive === false ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const initCode = (p.countryCode || 'VN').toUpperCase();
                        const initCountry =
                          p.country ||
                          p.countryName ||
                          PLAYER_COUNTRIES.find((c) => c.code === initCode)?.name ||
                          'Vietnam';
                        const initFlag = p.countryFlag || countryCodeToFlagEmoji(initCode);
                        const initJoined = Number(p.joined ?? p.joinedYear ?? 2025) || 2025;
                        const rawBornYear = p.bornYear ?? (p as { birthYear?: number }).birthYear;
                        const initBornYear =
                          rawBornYear !== undefined &&
                          rawBornYear !== null &&
                          Number.isFinite(Number(rawBornYear)) &&
                          Number(rawBornYear) > 0
                            ? Math.trunc(Number(rawBornYear))
                            : undefined;
                        setEditingPlayer(p);
                        setPlayerForm({
                          ...p,
                          skillRank: p.skillRank ?? null,
                          gender: p.gender ?? null,
                          bornYear: initBornYear,
                          country: initCountry,
                          countryName: initCountry,
                          countryCode: initCode,
                          countryFlag: initFlag,
                          joined: initJoined,
                          joinedYear: initJoined,
                          captain: Boolean(p.captain || p.isCaptain),
                          isCaptain: Boolean(p.captain || p.isCaptain),
                        });
                        setIsPlayerModalOpen(true);
                      }}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer transition-colors"
                      title="Edit athlete profile"
                    >
                      <Edit3 className="w-4 h-4 text-orange-400" />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(p.id, p.fullName)}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-300 rounded-xl bg-slate-800/80 hover:bg-red-950/80 cursor-pointer transition-colors"
                      title="Delete athlete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  </div>

                  {/* Quick Inline Gender Cycle Badge & USAV Skill Rank Selector */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickGenderCycle(p)}
                        title="Bấm để đổi nhanh giới tính: Chưa rõ → ♂ Nam → ♀ Nữ → Chưa rõ"
                        aria-label={`Đổi giới tính cho ${p.fullName}`}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer active:scale-95 ${
                          p.gender === 'MALE'
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/45 hover:bg-sky-500/25'
                            : p.gender === 'FEMALE'
                              ? 'bg-pink-500/15 text-pink-300 border-pink-500/45 hover:bg-pink-500/25'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {p.gender === 'MALE' ? '♂ Nam' : p.gender === 'FEMALE' ? '♀ Nữ' : 'Chưa rõ'}
                      </button>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          rankMeta ? rankMeta.badgeClass : UNRANKED_BADGE_CLASS
                        }`}
                      >
                        {rankMeta ? `🇺🇸 RANK: ${rankMeta.code}` : 'UNRANKED'}
                      </span>
                    </div>
                    <select
                      aria-label={`USAV Skill Rank for ${p.fullName}`}
                      value={p.skillRank || ''}
                      onChange={(e) => handleQuickSkillRankChange(p, e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-[#161F30] border border-slate-700 hover:border-blue-500/60 text-[11px] font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Chưa xếp hạng</option>
                      {SKILL_RANKS.map((rank) => (
                        <option key={rank} value={rank}>
                          Hạng {rank}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            currentPage={safePage}
            totalItems={filteredPlayers.length}
            pageSize={PLAYERS_PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="athletes"
          />
          </>
        )}
      </div>

      <PlayerFormModal
        isOpen={isPlayerModalOpen}
        editingPlayer={editingPlayer}
        playerForm={playerForm}
        setPlayerForm={setPlayerForm}
        isUploadingPlayerPhoto={isUploadingPlayerPhoto}
        setIsUploadingPlayerPhoto={setIsUploadingPlayerPhoto}
        onClose={() => setIsPlayerModalOpen(false)}
        onSubmit={handleSavePlayer}
        notify={notify}
      />
    </>
  );
};
