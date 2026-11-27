import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, X, Edit3, Trash2, Eye, EyeOff, ImageOff, Users, ChevronDown, Check } from 'lucide-react';
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
  const [openRankMenu, setOpenRankMenu] = useState<{
    player: Player;
    top: number;
    right: number;
    openUpward: boolean;
  } | null>(null);
  const rankMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openRankMenu) return undefined;
    const onOutside = (e: MouseEvent) => {
      if (rankMenuRef.current && !rankMenuRef.current.contains(e.target as Node)) {
        setOpenRankMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenRankMenu(null);
    };
    const onScrollOrResize = () => setOpenRankMenu(null);
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [openRankMenu]);
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

  const isPlayersLoaded = loadedScopes.has('PLAYERS');

  return (
    <>
      <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-5 dva-content-reveal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
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
            className="h-9 px-4 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold text-xs rounded-full inline-flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer self-start sm:self-auto shrink-0 transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Add Athlete</span>
          </button>
        </div>

        {/* TOOLBAR: STATUS FILTERS & MISSING AVATAR & SEARCH */}
        <div className="flex flex-col gap-3 bg-white/[0.025] p-3.5 rounded-2xl border border-white/[0.08]">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-white/[0.08]">
            {/* Quick Status Filters */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.04] p-1 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ALL'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <span>All</span>
                {isPlayersLoaded && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/30 font-mono tabular-nums">
                    {players.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-emerald-300 hover:bg-white/[0.06]'
                }`}
              >
                <span>Active</span>
                {isPlayersLoaded && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/30 font-mono tabular-nums">
                    {activeCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('HIDDEN')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'HIDDEN'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-amber-300 hover:bg-white/[0.06]'
                }`}
              >
                <span>Hidden</span>
                {isPlayersLoaded && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/30 font-mono tabular-nums">
                    {hiddenCount}
                  </span>
                )}
              </button>
            </div>

            {/* Secondary Filters: Missing Avatar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMissingAvatarOnly(!missingAvatarOnly)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 border ${
                  missingAvatarOnly
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/55 shadow-sm'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/10'
                }`}
                title="Show athletes with missing photo avatar"
              >
                <ImageOff className="w-3.5 h-3.5 text-orange-400" />
                <span>Missing Avatar</span>
                {isPlayersLoaded && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/35 font-mono tabular-nums text-orange-300">
                    {missingAvatarCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* USAV Skill Rank Filter Chips + Unknown Gender Pill */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-white/[0.08]">
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
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1 border ${
                    active
                      ? 'bg-sky-500/25 text-sky-100 border-sky-400/55 shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  <span>{r === 'ALL' ? 'All' : r === 'UNRANKED' ? 'Unranked' : r}</span>
                  {isPlayersLoaded && (
                    <span className="px-1 py-0.2 text-[9px] rounded-full bg-black/30 font-mono tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMissingGenderOnly(!missingGenderOnly)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 border sm:ml-auto ${
                missingGenderOnly
                  ? 'bg-sky-500/20 text-sky-200 border-sky-400/55 shadow-sm'
                  : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/10'
              }`}
              title="Lọc các thành viên chưa cập nhật giới tính"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Chưa rõ giới tính</span>
              {isPlayersLoaded && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/35 font-mono tabular-nums text-sky-300">
                  {missingGenderCount}
                </span>
              )}
            </button>
          </div>

          {/* SEARCH INPUT BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                placeholder="Search athlete by name, jersey #, position (OH/OP/MB/S/L), or division..."
                className="dva-glass-input w-full pl-10 pr-9 py-2.5 text-xs"
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
            <div className="text-xs text-slate-400 font-medium px-1 flex items-center gap-1.5 shrink-0 tabular-nums">
              <span>Showing:</span>
              <strong className="text-white font-mono">{isPlayersLoaded ? filteredPlayers.length : '—'}</strong>
              <span>of</span>
              <span className="text-slate-400 font-mono">{isPlayersLoaded ? players.length : '—'} athletes</span>
            </div>
          </div>
        </div>

        {!isPlayersLoaded ? (
          <div className="space-y-4">
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
        ) : filteredPlayers.length === 0 ? (
          <div className="p-8 text-center bg-white/[0.03] rounded-2xl border border-white/10 space-y-3">
            <p className="text-xs text-slate-400">
              No athletes found matching <strong className="text-white">"{playerSearchQuery}"</strong>.
            </p>
            <button
              type="button"
              onClick={() => setPlayerSearchQuery('')}
              className="h-8 px-4 bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-200 text-xs font-bold rounded-full transition-colors duration-150 cursor-pointer"
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
              const isRankMenuOpen = openRankMenu?.player.id === p.id;
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.055] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-150 flex flex-col gap-3 justify-between"
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
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-sm border border-yellow-200">
                            CAPTAIN
                          </span>
                        )}
                        {p.isActive === false ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/35 inline-flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" />
                            Hidden
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/12 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
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
                      <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        {p.position} · {p.level} · {p.height}cm · Reach {p.spikeTouch}cm · Joined{' '}
                        {joinedLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePlayerVisibility(p)}
                      className={`w-8 h-8 rounded-full bg-white/[0.05] border border-white/12 flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                        p.isActive === false
                          ? 'text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/35'
                          : 'text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/35'
                      }`}
                      title={p.isActive === false ? 'Click to Publish athlete' : 'Click to Hide athlete'}
                    >
                      {p.isActive === false ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
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
                      className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/12 flex items-center justify-center text-slate-300 hover:bg-orange-500/15 hover:border-orange-500/35 hover:text-orange-300 cursor-pointer transition-colors duration-150"
                      title="Edit athlete profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(p.id, p.fullName)}
                      className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/12 flex items-center justify-center text-slate-400 hover:bg-rose-500/15 hover:border-rose-500/35 hover:text-rose-300 cursor-pointer transition-colors duration-150"
                      title="Delete athlete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </div>

                  {/* Quick Inline Gender Cycle Badge & Custom Glass USAV Skill Rank Popover */}
                  <div className="pt-2.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickGenderCycle(p)}
                        title="Bấm để đổi nhanh giới tính: Chưa rõ → ♂ Nam → ♀ Nữ → Chưa rõ"
                        aria-label={`Đổi giới tính cho ${p.fullName}`}
                        className={`h-8 px-3 rounded-full text-[11px] font-bold border transition-colors transition-transform duration-150 cursor-pointer active:scale-95 ${
                          p.gender === 'MALE'
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/25'
                            : p.gender === 'FEMALE'
                              ? 'bg-pink-500/15 text-pink-300 border-pink-500/40 hover:bg-pink-500/25'
                              : 'bg-white/[0.05] text-slate-300 border-white/12 hover:bg-white/[0.1] hover:text-white'
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
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isRankMenuOpen}
                      aria-label={`USAV Skill Rank for ${p.fullName}`}
                      onClick={(e) => {
                        if (isRankMenuOpen) {
                          setOpenRankMenu(null);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const openUpward = rect.bottom + 240 > window.innerHeight;
                        setOpenRankMenu({
                          player: p,
                          top: openUpward ? rect.top - 6 : rect.bottom + 6,
                          right: Math.max(12, window.innerWidth - rect.right),
                          openUpward,
                        });
                      }}
                      className={`h-8 px-3 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ${
                        isRankMenuOpen
                          ? 'bg-sky-500/20 border-sky-400/55 text-sky-200'
                          : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/12 text-slate-200 hover:text-white'
                      }`}
                    >
                      <span>{p.skillRank ? `Hạng ${p.skillRank}` : 'Chưa xếp hạng'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isRankMenuOpen ? 'rotate-180 text-sky-300' : ''}`} />
                    </button>
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

      {/* Single Portal-Rendered Glass Skill Rank Popover (Zero Per-Card Blur Overhead) */}
      {openRankMenu && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={rankMenuRef}
            role="listbox"
            aria-label={`Chọn hạng USAV cho ${openRankMenu.player.fullName}`}
            style={{
              top: openRankMenu.top,
              right: openRankMenu.right,
              transform: openRankMenu.openUpward ? 'translateY(-100%)' : undefined,
            }}
            className="fixed z-[9999] min-w-[155px] rounded-2xl bg-[#0E1118]/95 backdrop-blur-2xl border border-white/15 shadow-[0_18px_45px_rgba(0,0,0,0.85)] p-1.5 space-y-0.5"
          >
            <button
              type="button"
              role="option"
              aria-selected={!openRankMenu.player.skillRank}
              onClick={() => {
                const target = openRankMenu.player;
                setOpenRankMenu(null);
                void handleQuickSkillRankChange(target, '');
              }}
              className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors duration-150 ${
                !openRankMenu.player.skillRank
                  ? 'bg-orange-500/20 text-orange-200'
                  : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <span>Chưa xếp hạng</span>
              {!openRankMenu.player.skillRank && <Check className="w-3 h-3 text-orange-300 shrink-0" />}
            </button>
            {SKILL_RANKS.map((rank) => {
              const active = openRankMenu.player.skillRank === rank;
              return (
                <button
                  key={rank}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    const target = openRankMenu.player;
                    setOpenRankMenu(null);
                    void handleQuickSkillRankChange(target, rank);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center justify-between gap-2 cursor-pointer transition-colors duration-150 ${
                    active
                      ? 'bg-sky-500/20 text-sky-200'
                      : 'text-slate-200 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span>Hạng {rank}</span>
                  {active && <Check className="w-3 h-3 text-sky-300 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}

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
