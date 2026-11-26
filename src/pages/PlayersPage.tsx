import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Columns3,
  LayoutGrid,
  X,
  RotateCcw,
  Check
} from 'lucide-react';
import { Player, PlayerGender, SkillRank, VolleyballPosition, User as UserType, countryCodeToFlagEmoji } from '../types';
import { SKILL_RANK_LIST, getSkillRankMeta, UNRANKED_BADGE_CLASS } from '../shared/skillRanks';
import { playerService } from '../services/api';
import { SlowServerPill } from '../components/common/GlassLoading';

interface PlayersPageProps {
  currentUser: UserType;
}

export const PlayersPage: React.FC<PlayersPageProps> = ({ currentUser }) => {
  const { levelParam } = useParams<{ levelParam?: string }>();
  const navigate = useNavigate();

  // Resolve level from URL: default is JUNIOR as requested
  const resolvedLevel = useMemo<'JUNIOR' | 'SENIOR' | 'YOUTH'>(() => {
    const p = (levelParam || '').toLowerCase();
    if (p === 'senior') return 'SENIOR';
    if (p === 'youth' || p === 'kid') return 'YOUTH';
    return 'JUNIOR'; // Default level
  }, [levelParam]);

  const [initialCache] = useState(() => playerService.getCachedPlayers());
  const [players, setPlayers] = useState<Player[]>(() =>
    initialCache ? initialCache.data.filter((p) => p.isActive !== false) : []
  );
  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [search, setSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | PlayerGender>('ALL');
  const [selectedRank, setSelectedRank] = useState<'ALL' | SkillRank | 'UNRANKED'>('ALL');
  const [openDropdown, setOpenDropdown] = useState<'position' | 'gender' | 'rank' | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<'SINGLE_TAB' | '3_COLUMNS'>('SINGLE_TAB');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8; // 8 player cards per page for optimal grid layout

  const POSITION_OPTIONS = [
    { id: 'ALL', label: 'All Positions' },
    { id: 'OH', label: 'Outside Hitter (OH)' },
    { id: 'OP', label: 'Opposite Spiker (OP)' },
    { id: 'MB', label: 'Middle Blocker (MB)' },
    { id: 'S', label: 'Setter (S)' },
    { id: 'L', label: 'Libero (L)' },
  ] as const;

  const GENDER_OPTIONS = [
    { id: 'ALL', label: 'All Genders' },
    { id: 'MALE', label: '♂ Male' },
    { id: 'FEMALE', label: '♀ Female' },
  ] as const;

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedPosition !== 'ALL' ||
    selectedGender !== 'ALL' ||
    selectedRank !== 'ALL';

  const resetAllFilters = () => {
    setSearch('');
    setSelectedPosition('ALL');
    setSelectedGender('ALL');
    setSelectedRank('ALL');
    setOpenDropdown(null);
  };

  useEffect(() => {
    if (!openDropdown) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdown]);

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';

  // Load players with SWR cache hydration + background revalidation when stale
  const fetchPlayers = async (forceRefresh = false) => {
    if (!initialCache) setLoading(true);
    try {
      const data = await playerService.getPlayers({ forceRefresh });
      const activeOnly = Array.isArray(data) ? data.filter((p) => p.isActive !== false) : [];
      setPlayers(activeOnly);
    } catch (err) {
      console.error('[PlayersPage] Error fetching players:', err);
      if (!initialCache) setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlayers(Boolean(initialCache?.isStale));
  }, []);

  // Reset pagination when level, search, position, gender, or USAV rank changes
  useEffect(() => {
    setCurrentPage(1);
  }, [resolvedLevel, search, selectedPosition, selectedGender, selectedRank]);

  // Normalize Vietnamese city/province names into English for public display
  const formatHometownEnglish = (raw?: string): string => {
    if (!raw) return '';
    return raw
      .replace(/Hà Nội/gi, 'Hanoi')
      .replace(/TP\.\s*Hồ Chí Minh|Hồ Chí Minh/gi, 'Ho Chi Minh City')
      .replace(/Đà Nẵng/gi, 'Da Nang')
      .replace(/Hải Phòng/gi, 'Hai Phong')
      .replace(/Bình Dương/gi, 'Binh Duong')
      .replace(/Đồng Nai/gi, 'Dong Nai')
      .replace(/Nam Định/gi, 'Nam Dinh')
      .replace(/Khánh Hòa/gi, 'Khanh Hoa')
      .replace(/Bắc Ninh/gi, 'Bac Ninh')
      .replace(/Nghệ An/gi, 'Nghe An')
      .replace(/Thanh Hóa/gi, 'Thanh Hoa')
      .replace(/Thái Bình/gi, 'Thai Binh')
      .replace(/Quảng Ninh/gi, 'Quang Ninh')
      .replace(/Cần Thơ/gi, 'Can Tho')
      .replace(/Việt Nam/gi, 'Vietnam');
  };

  // Position badge styling
  const getPositionBadgeStyle = (pos: VolleyballPosition) => {
    switch (pos) {
      case 'MB':
        return { label: 'MIDDLE BLOCKER', bg: 'bg-[#10B981]' };
      case 'L':
        return { label: 'LIBERO', bg: 'bg-[#8B5CF6]' };
      case 'OH':
        return { label: 'OUTSIDE HITTER', bg: 'bg-[#EF4444]' };
      case 'OP':
        return { label: 'OPPOSITE SPIKER', bg: 'bg-[#F97316]' };
      case 'S':
        return { label: 'SETTER', bg: 'bg-[#0EA5E9]' };
      default:
        return { label: pos, bg: 'bg-slate-700' };
    }
  };

  // Filter helper: giữ nguyên thứ tự chuẩn từ Backend/Database
  // (theo từng level: Captain đứng đầu, sau đó đến số áo tăng dần)
  const filterPlayers = (list: Player[]) => {
    return list.filter((p) => {
      if (p.isActive === false) return false;
      if (selectedPosition !== 'ALL' && p.position !== selectedPosition) return false;
      if (selectedGender !== 'ALL' && p.gender !== selectedGender) return false;
      if (selectedRank === 'UNRANKED' && p.skillRank) return false;
      if (selectedRank !== 'ALL' && selectedRank !== 'UNRANKED' && p.skillRank !== selectedRank) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.fullName.toLowerCase().includes(q) ||
          String(p.jerseyNumber).includes(q) ||
          p.position.toLowerCase().includes(q) ||
          (p.skillRank && p.skillRank.toLowerCase().includes(q)) ||
          (p.bio && p.bio.toLowerCase().includes(q)) ||
          p.hometownCountry.toLowerCase().includes(q) ||
          (p.country && p.country.toLowerCase().includes(q)) ||
          (p.countryName && p.countryName.toLowerCase().includes(q)) ||
          (p.countryCode && p.countryCode.toLowerCase().includes(q))
        );
      }
      return true;
    });
  };

  // Squad counts by level (sử dụng trực tiếp thứ tự đã sắp xếp từ API)
  const seniorPlayers = useMemo(() => filterPlayers(players.filter(p => p.level === 'SENIOR')), [players, search, selectedPosition, selectedGender, selectedRank]);
  const juniorPlayers = useMemo(() => filterPlayers(players.filter(p => p.level === 'JUNIOR')), [players, search, selectedPosition, selectedGender, selectedRank]);
  const youthPlayers = useMemo(() => filterPlayers(players.filter(p => p.level === 'YOUTH')), [players, search, selectedPosition, selectedGender, selectedRank]);

  // Active level list for Single Tab
  const activeLevelPlayers = useMemo(() => {
    if (resolvedLevel === 'SENIOR') return seniorPlayers;
    if (resolvedLevel === 'YOUTH') return youthPlayers;
    return juniorPlayers;
  }, [resolvedLevel, seniorPlayers, juniorPlayers, youthPlayers]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(activeLevelPlayers.length / pageSize));
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return activeLevelPlayers.slice(startIndex, startIndex + pageSize);
  }, [activeLevelPlayers, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const targetElement = document.getElementById('players-grid-top');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectLevel = (level: 'JUNIOR' | 'SENIOR' | 'YOUTH') => {
    navigate(`/players/${level.toLowerCase()}`);
  };

  const renderPlayerCard = (player: Player) => {
    const posMeta = getPositionBadgeStyle(player.position);
    const isTeamCaptain = Boolean(player.captain || player.isCaptain);
    const resolvedCountryCode = (player.countryCode || 'VN').toUpperCase();
    const resolvedCountryName = player.country || player.countryName || 'Vietnam';
    const resolvedFlag = player.countryFlag || countryCodeToFlagEmoji(resolvedCountryCode);
    const resolvedJoined = player.joined ?? player.joinedYear ?? 2025;
    const rankMeta = getSkillRankMeta(player.skillRank);

    const formattedCity = player.hometownCountry ? formatHometownEnglish(player.hometownCountry).trim() : '';
    const formattedCountry = formatHometownEnglish(resolvedCountryName).trim();
    const originLabel = formattedCity
      ? formattedCity.toLowerCase().includes(formattedCountry.toLowerCase())
        ? formattedCity
        : `${formattedCity}, ${formattedCountry}`
      : formattedCountry;

    return (
      <div
        key={player.id}
        className={`w-full max-w-md mx-auto h-full dva-glass-card p-4 sm:p-5 shadow-xl flex flex-col justify-between relative group hover:scale-[1.01] transition-transform duration-200 ${
          isTeamCaptain
            ? 'border-2 border-amber-500/80 shadow-lg shadow-amber-500/10 hover:border-amber-400 ring-1 ring-amber-400/30'
            : 'border border-white/10 hover:border-white/25'
        }`}
      >
        {/* Top Section: Header Bar + Portrait + Name/Badges + 2x2 Metrics */}
        <div className="flex flex-col">
          {/* Top Badges: Captain Badge (Top-Left) and Flag (Top-Right) */}
          <div className="flex items-center justify-between min-h-[26px] mb-2.5">
            {isTeamCaptain ? (
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-md shadow-amber-500/30 border border-yellow-200 flex items-center gap-1">
                ★ CAPTAIN
              </span>
            ) : (
              <div />
            )}
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-xs select-none"
              title={`${resolvedCountryName} (${resolvedCountryCode})`}
            >
              <span className="text-sm leading-none">{resolvedFlag}</span>
              <span className="font-sans tabular-nums font-bold text-[10px] text-slate-300">{resolvedCountryCode}</span>
            </div>
          </div>

          {/* Athlete Portrait Frame + Floating Glass Jersey Badge */}
          <div className="relative w-32 h-40 sm:w-36 sm:h-44 mx-auto rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent shadow-[0_12px_30px_rgba(0,0,0,0.45)] flex items-center justify-center">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.fullName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-red-950/70 flex items-center justify-center">
                <User className="w-12 h-12 text-white/25" />
              </div>
            )}
            <span
              className="absolute bottom-2 right-2 bg-[#0B0D12]/85 backdrop-blur-md border border-orange-500/40 text-orange-400 font-sans tabular-nums font-bold text-xs px-2 py-0.5 rounded-lg shadow-lg"
              aria-label={`Jersey number ${player.jerseyNumber}`}
            >
              #{player.jerseyNumber}
            </span>
          </div>

          {/* Athlete Name (+ Inline Gender Symbol) & Single-Row Position/Rank Badges */}
          <div className="mt-3">
            <h3
              className="font-heading font-extrabold text-base sm:text-[17px] leading-snug text-white text-center tracking-wide flex items-center justify-center gap-1.5"
              title={player.fullName}
            >
              <span className="truncate">{player.fullName}</span>
              {player.gender && (
                <span
                  title={player.gender === 'MALE' ? 'Male' : 'Female'}
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold border shrink-0 select-none ${
                    player.gender === 'MALE'
                      ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
                      : 'bg-pink-500/15 text-pink-300 border-pink-400/40'
                  }`}
                >
                  {player.gender === 'MALE' ? '♂' : '♀'}
                </span>
              )}
            </h3>

            {/* Single-Line Locked Pills (Position + USAV Skill Rank) */}
            <div className="flex flex-nowrap items-center justify-center gap-1.5 mt-2 overflow-hidden">
              <span className={`${posMeta.bg} text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap shrink-0`}>
                {posMeta.label}
              </span>
              <Link
                to="/information/skill-levels"
                title={
                  rankMeta
                    ? `USAV ${rankMeta.code} — ${rankMeta.labelEn} (View skill level guide)`
                    : 'Unranked — View USAV skill level guide'
                }
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all hover:scale-105 whitespace-nowrap shrink-0 ${
                  rankMeta ? rankMeta.badgeClass : UNRANKED_BADGE_CLASS
                }`}
              >
                <span>{rankMeta ? `RANK: ${rankMeta.code}` : 'UNRANKED'}</span>
              </Link>
            </div>
          </div>

          {/* Balanced 2x2 Metric Grid: HEIGHT | REACH / BLOCK | BORN */}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            <div className="py-2 px-2 rounded-xl bg-white/[0.035] border border-white/10 text-center">
              <span className="text-[10px] tracking-wider text-slate-400 font-semibold uppercase block">HEIGHT</span>
              <span className="font-sans tabular-nums font-bold text-xs sm:text-sm text-white">
                {player.height ? `${player.height}cm` : '—'}
              </span>
            </div>
            <div className="py-2 px-2 rounded-xl bg-white/[0.035] border border-white/10 text-center">
              <span className="text-[10px] tracking-wider text-slate-400 font-semibold uppercase block">REACH</span>
              <span className="font-sans tabular-nums font-bold text-xs sm:text-sm text-white">
                {player.spikeTouch ? `${player.spikeTouch}cm` : '—'}
              </span>
            </div>
            <div className="py-2 px-2 rounded-xl bg-white/[0.035] border border-white/10 text-center">
              <span className="text-[10px] tracking-wider text-slate-400 font-semibold uppercase block">BLOCK</span>
              <span className="font-sans tabular-nums font-bold text-xs sm:text-sm text-white">
                {player.blockTouch > 0 ? `${player.blockTouch}cm` : '—'}
              </span>
            </div>
            <div className="py-2 px-2 rounded-xl bg-white/[0.035] border border-white/10 text-center">
              <span className="text-[10px] tracking-wider text-slate-400 font-semibold uppercase block">BORN</span>
              <span className="font-sans tabular-nums font-bold text-xs sm:text-sm text-white">
                {player.bornYear || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Footer: Compact Origin + Joined Row & Equal-Height Quote Slot */}
        <div className="mt-3.5 pt-2.5 border-t border-white/10 space-y-2">
          <div
            className="flex items-center justify-center gap-1.5 text-[11px] text-slate-300 truncate"
            title={`${originLabel} · Joined ${resolvedJoined}`}
          >
            <span className="shrink-0 leading-none">{resolvedFlag}</span>
            <span className="truncate font-medium text-slate-200">{originLabel}</span>
            <span className="text-slate-500 shrink-0">·</span>
            <span className="shrink-0 text-slate-400 font-sans tabular-nums">Joined {resolvedJoined}</span>
          </div>

          <p className="text-[11px] text-slate-400 italic leading-5 line-clamp-2 min-h-[2.5rem] text-center">
            {player.bio ? `"${player.bio}"` : ''}
          </p>
        </div>
      </div>
    );
  };

  const renderSkeletonCard = (idx: string | number) => (
    <div
      key={`skeleton-player-${idx}`}
      className="w-full max-w-md mx-auto h-full dva-skeleton p-4 sm:p-5 rounded-3xl flex flex-col justify-between"
    >
      <div className="flex flex-col">
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between min-h-[26px] mb-2.5">
          <div className="dva-skeleton-bar h-5 w-20 rounded-full" />
          <div className="dva-skeleton-bar h-5 w-12 rounded-full" />
        </div>
        {/* Portrait frame skeleton */}
        <div className="dva-skeleton-bar w-32 h-40 sm:w-36 sm:h-44 mx-auto rounded-2xl" />
        {/* Name + 2 locked pills */}
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="dva-skeleton-bar h-5 w-36 rounded-lg" />
          <div className="flex items-center justify-center gap-1.5">
            <div className="dva-skeleton-bar h-4 w-24 rounded-full" />
            <div className="dva-skeleton-bar h-4 w-16 rounded-full" />
          </div>
        </div>
        {/* 2x2 metric grid skeleton */}
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          {Array.from({ length: 4 }).map((_, statIdx) => (
            <div key={statIdx} className="dva-skeleton-bar h-[54px] rounded-xl" />
          ))}
        </div>
      </div>
      {/* Bottom origin + 2-line quote slot */}
      <div className="mt-3.5 pt-2.5 border-t border-white/[0.07] space-y-2">
        <div className="dva-skeleton-bar h-3.5 w-40 mx-auto rounded-full" />
        <div className="space-y-1.5 min-h-[2.5rem] flex flex-col items-center justify-center">
          <div className="dva-skeleton-bar h-3 w-11/12 rounded" />
          <div className="dva-skeleton-bar h-3 w-3/4 rounded" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
            DVA Official Team Rosters
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading">
            Official Athlete Roster & Squad Lineups
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Select a competitive division to explore athlete profiles, physical reach statistics, and specialist volleyball positions.
          </p>

          {isAdmin && (
            <div className="pt-2">
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl hover:bg-red-900 transition-colors"
              >
                <span>Logged in as Admin · Open Admin Athlete Management Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* 3 BIG LEVEL BUTTONS (Required: Displayed prominently ABOVE the position buttons) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Level 1: Junior (Default) */}
          <button
            type="button"
            onClick={() => handleSelectLevel('JUNIOR')}
            className={`p-5 sm:p-6 rounded-3xl text-left transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between border-2 ${
              resolvedLevel === 'JUNIOR'
                ? 'bg-gradient-to-br from-blue-950/80 via-[#131d33] to-[#0E1524] border-cyan-400 shadow-2xl shadow-cyan-950/60 ring-2 ring-cyan-500/30 scale-[1.02]'
                : 'dva-glass-card'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  resolvedLevel === 'JUNIOR'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  Intermediate Tier
                </span>
                <h3 className="font-heading font-black text-xl sm:text-2xl text-white mt-2">
                  Junior Squad
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs ${
                resolvedLevel === 'JUNIOR' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300'
              }`}>
                {loading ? '...' : `${juniorPlayers.length} Athletes`}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Intermediate athletes mastering passing platform, arm-swing biomechanics, and tactical 5-1 / 6-2 rotation formations.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold">
              <span className={resolvedLevel === 'JUNIOR' ? 'text-cyan-400' : 'text-slate-400'}>
                {resolvedLevel === 'JUNIOR' ? '● Currently Active Squad' : 'Click to View Junior Squad'}
              </span>
              <span className="text-slate-500 font-mono text-[10px]">/players/junior</span>
            </div>
          </button>

          {/* Level 2: Senior */}
          <button
            type="button"
            onClick={() => handleSelectLevel('SENIOR')}
            className={`p-5 sm:p-6 rounded-3xl text-left transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between border-2 ${
              resolvedLevel === 'SENIOR'
                ? 'bg-gradient-to-br from-red-950/80 via-[#26151b] to-[#0E1524] border-red-500 shadow-2xl shadow-red-950/60 ring-2 ring-red-500/30 scale-[1.02]'
                : 'dva-glass-card'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  resolvedLevel === 'SENIOR'
                    ? 'bg-red-950 text-red-300 border-red-700'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  Championship Core
                </span>
                <h3 className="font-heading font-black text-xl sm:text-2xl text-white mt-2">
                  Senior Squad
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs ${
                resolvedLevel === 'SENIOR' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {loading ? '...' : `${seniorPlayers.length} Athletes`}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Veteran players with <strong>over 3 years of competitive tournament experience</strong>, explosive jump reach, and high-IQ play.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold">
              <span className={resolvedLevel === 'SENIOR' ? 'text-red-400' : 'text-slate-400'}>
                {resolvedLevel === 'SENIOR' ? '● Currently Active Squad' : 'Click to View Senior Squad'}
              </span>
              <span className="text-slate-500 font-mono text-[10px]">/players/senior</span>
            </div>
          </button>

          {/* Level 3: Youth */}
          <button
            type="button"
            onClick={() => handleSelectLevel('YOUTH')}
            className={`p-5 sm:p-6 rounded-3xl text-left transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between border-2 ${
              resolvedLevel === 'YOUTH'
                ? 'bg-gradient-to-br from-emerald-950/80 via-[#13241e] to-[#0E1524] border-emerald-400 shadow-2xl shadow-emerald-950/60 ring-2 ring-emerald-500/30 scale-[1.02]'
                : 'dva-glass-card'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  resolvedLevel === 'YOUTH'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  Youth
                </span>
                <h3 className="font-heading font-black text-xl sm:text-2xl text-white mt-2">
                  Youth
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs ${
                resolvedLevel === 'YOUTH' ? 'bg-emerald-400 text-black' : 'bg-slate-800 text-slate-300'
              }`}>
                {loading ? '...' : `${youthPlayers.length} Athletes`}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Youth players developing motor coordination, receiving posture, agility movement, and genuine sportsmanship.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold">
              <span className={resolvedLevel === 'YOUTH' ? 'text-emerald-400' : 'text-slate-400'}>
                {resolvedLevel === 'YOUTH' ? '● Currently Active Squad' : 'Click to View Youth'}
              </span>
              <span className="text-slate-500 font-mono text-[10px]">/players/youth</span>
            </div>
          </button>

        </div>

        {/* SEARCH BAR & GLASS DROPDOWN FILTERS */}
        <div className="relative z-30 dva-glass-panel p-4 sm:p-5 rounded-3xl space-y-3.5">
          {/* Row 1: Glass Search Input & View Mode Toggle */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Live Search Bar */}
            <div className="relative w-full md:flex-1 md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search athlete name, jersey #, position, hometown..."
                className="dva-glass-input w-full h-[46px] pl-11 pr-9 text-[16px] sm:text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="w-full md:w-auto grid grid-cols-2 md:flex items-center gap-1 p-1 bg-white/[0.035] rounded-2xl border border-white/10 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('SINGLE_TAB')}
                className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  viewMode === 'SINGLE_TAB'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>Single Squad Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3_COLUMNS')}
                className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  viewMode === '3_COLUMNS'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5 shrink-0" />
                <span>3-Column Overview</span>
              </button>
            </div>
          </div>

          {/* Row 2: Compact Thematic Glass Popover Dropdowns + Reset + USAV Guide */}
          <div ref={filtersRef} className="relative flex flex-wrap items-center gap-2.5 pt-3.5 border-t border-white/10">
            {/* 1. Position Dropdown */}
            <div className="sm:relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'position'}
                aria-haspopup="listbox"
                onClick={() => setOpenDropdown((prev) => (prev === 'position' ? null : 'position'))}
                className={`inline-flex items-center gap-2 px-3.5 h-[38px] rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedPosition !== 'ALL' || openDropdown === 'position'
                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.18)]'
                    : 'dva-glass-pill text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>
                  {selectedPosition === 'ALL'
                    ? 'Position'
                    : POSITION_OPTIONS.find((item) => item.id === selectedPosition)?.label || selectedPosition}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openDropdown === 'position' ? 'rotate-180 text-orange-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {openDropdown === 'position' && (
                <div
                  role="listbox"
                  aria-label="Filter by position"
                  className="absolute left-0 right-0 sm:right-auto top-[calc(100%+8px)] rounded-2xl bg-[#0E1118]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-1.5 z-50 sm:min-w-[220px]"
                >
                  {POSITION_OPTIONS.map((item) => {
                    const isSelected = selectedPosition === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedPosition(item.id);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/20 text-orange-200'
                            : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Gender Dropdown */}
            <div className="sm:relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'gender'}
                aria-haspopup="listbox"
                onClick={() => setOpenDropdown((prev) => (prev === 'gender' ? null : 'gender'))}
                className={`inline-flex items-center gap-2 px-3.5 h-[38px] rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedGender !== 'ALL' || openDropdown === 'gender'
                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.18)]'
                    : 'dva-glass-pill text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>
                  {selectedGender === 'ALL'
                    ? 'Gender'
                    : selectedGender === 'MALE'
                    ? '♂ Male'
                    : '♀ Female'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openDropdown === 'gender' ? 'rotate-180 text-orange-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {openDropdown === 'gender' && (
                <div
                  role="listbox"
                  aria-label="Filter by gender"
                  className="absolute left-0 right-0 sm:right-auto top-[calc(100%+8px)] rounded-2xl bg-[#0E1118]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-1.5 z-50 sm:min-w-[210px]"
                >
                  {GENDER_OPTIONS.map((item) => {
                    const isSelected = selectedGender === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedGender(item.id);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/20 text-orange-200'
                            : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                        }`}
                      >
                        <span
                          className={
                            item.id === 'MALE'
                              ? 'text-sky-300'
                              : item.id === 'FEMALE'
                              ? 'text-pink-300'
                              : ''
                          }
                        >
                          {item.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. USAV Rank Dropdown */}
            <div className="sm:relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'rank'}
                aria-haspopup="listbox"
                onClick={() => setOpenDropdown((prev) => (prev === 'rank' ? null : 'rank'))}
                className={`inline-flex items-center gap-2 px-3.5 h-[38px] rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedRank !== 'ALL' || openDropdown === 'rank'
                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.18)]'
                    : 'dva-glass-pill text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>
                  {selectedRank === 'ALL'
                    ? 'USAV Rank'
                    : selectedRank === 'UNRANKED'
                    ? 'Rank: Unranked'
                    : `Rank: ${selectedRank}`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openDropdown === 'rank' ? 'rotate-180 text-orange-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {openDropdown === 'rank' && (
                <div
                  role="listbox"
                  aria-label="Filter by USAV rank"
                  className="absolute left-0 right-0 sm:right-auto top-[calc(100%+8px)] rounded-2xl bg-[#0E1118]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-1.5 z-50 sm:min-w-[240px]"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedRank === 'ALL'}
                    onClick={() => {
                      setSelectedRank('ALL');
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors cursor-pointer ${
                      selectedRank === 'ALL'
                        ? 'bg-orange-500/20 text-orange-200'
                        : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span>All Ranks</span>
                    {selectedRank === 'ALL' && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                  </button>

                  {SKILL_RANK_LIST.map((tier) => {
                    const isSelected = selectedRank === tier.code;
                    return (
                      <button
                        key={tier.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedRank(tier.code);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/20 text-orange-200'
                            : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${tier.badgeClass}`}>
                            {tier.code}
                          </span>
                          <span className="truncate text-[11px] text-slate-300 font-medium">{tier.labelEn}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedRank === 'UNRANKED'}
                    onClick={() => {
                      setSelectedRank('UNRANKED');
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors cursor-pointer ${
                      selectedRank === 'UNRANKED'
                        ? 'bg-orange-500/20 text-orange-200'
                        : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span>Unranked</span>
                    {selectedRank === 'UNRANKED' && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                  </button>
                </div>
              )}
            </div>

            {/* 4. Reset Button (Shown when any filter or search is active) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-full text-xs font-bold bg-red-500/15 border border-red-500/35 text-red-300 hover:bg-red-500/25 hover:text-white transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* 5. USAV Guide Link */}
            <Link
              to="/information/skill-levels"
              className="ml-auto text-[11px] font-bold text-blue-300 hover:text-orange-400 transition-colors whitespace-nowrap"
            >
              USAV Guide ↗
            </Link>
          </div>
        </div>

        {/* PRIMARY VIEW: SINGLE LEVEL ROSTER GRID (Default, spacious and uncrowded) */}
        {viewMode === 'SINGLE_TAB' ? (
          <div>
            <div id="players-grid-top" className="scroll-mt-24" />

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                  {Array.from({ length: 8 }).map((_, i) => renderSkeletonCard(i))}
                </div>
                <SlowServerPill active />
              </div>
            ) : paginatedPlayers.length === 0 ? (
              <div className="p-16 rounded-3xl dva-glass-panel border-dashed text-center space-y-3 dva-content-reveal">
                <User className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="font-heading font-bold text-white text-base">No Athletes Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No athletes in the {resolvedLevel} tier match your current filters.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 dva-glass-pill hover:bg-white/10 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch dva-content-reveal">
                {paginatedPlayers.map((p) => renderPlayerCard(p))}
              </div>
            )}

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 mb-4">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-2.5 rounded-xl border border-slate-800 bg-[#121826] text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => handlePageChange(pg)}
                    className={`w-10 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      currentPage === pg
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-950/50 font-extrabold ring-1 ring-red-400/50'
                        : 'bg-[#121826] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-2.5 rounded-xl border border-slate-800 bg-[#121826] text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        ) : (
          /* OPTIONAL 3 COLUMNS COMPARISON VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: JUNIOR */}
            <div className="bg-[#0E1524] rounded-3xl border border-cyan-950/70 p-5 space-y-4">
              <div className="bg-[#131822] p-4 rounded-2xl border border-cyan-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <h2 className="font-heading font-black text-lg text-white">Junior Squad</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {juniorPlayers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300/80 mt-1">
                    Intermediate skill development · 5-1 / 6-2 formations
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(`col1-${i}`))}
                </div>
              ) : juniorPlayers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs bg-[#131822]/60 rounded-2xl border border-dashed border-slate-800">
                  No junior athletes found
                </div>
              ) : (
                <div className="space-y-4">
                  {juniorPlayers.map((p) => renderPlayerCard(p))}
                </div>
              )}
            </div>

            {/* COLUMN 2: SENIOR */}
            <div className="bg-[#0E1524] rounded-3xl border border-red-950/70 p-5 space-y-4">
              <div className="bg-[#131822] p-4 rounded-2xl border border-red-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <h2 className="font-heading font-black text-lg text-white">Senior Squad</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                      {loading ? '...' : seniorPlayers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-300/80 mt-1">
                    Seasoned players with &gt; 3 years competitive experience
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(`col2-${i}`))}
                </div>
              ) : seniorPlayers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs bg-[#131822]/60 rounded-2xl border border-dashed border-slate-800">
                  No senior athletes found
                </div>
              ) : (
                <div className="space-y-4">
                  {seniorPlayers.map((p) => renderPlayerCard(p))}
                </div>
              )}
            </div>

            {/* COLUMN 3: YOUTH */}
            <div className="bg-[#0E1524] rounded-3xl border border-emerald-950/70 p-5 space-y-4">
              <div className="bg-[#131822] p-4 rounded-2xl border border-emerald-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <h2 className="font-heading font-black text-lg text-white">Youth</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {loading ? '...' : youthPlayers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80 mt-1">
                    Youth athletic fundamentals & skill development
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(`col3-${i}`))}
                </div>
              ) : youthPlayers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs bg-[#131822]/60 rounded-2xl border border-dashed border-slate-800">
                  No youth athletes found
                </div>
              ) : (
                <div className="space-y-4">
                  {youthPlayers.map((p) => renderPlayerCard(p))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
