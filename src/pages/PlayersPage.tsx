import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  User, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutGrid
} from 'lucide-react';
import { Player, VolleyballPosition, User as UserType, countryCodeToFlagEmoji } from '../types';
import { playerService } from '../services/api';
import { INITIAL_PLAYERS } from '../data/mockData';

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

  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'SINGLE_TAB' | '3_COLUMNS'>('SINGLE_TAB');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8; // 8 player cards per page for optimal grid layout

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';

  // Load players
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const data = await playerService.getPlayers();
      if (Array.isArray(data) && data.length > 0) {
        setPlayers(data);
      }
    } catch (err) {
      console.warn('Using fallback initial players:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // Reset pagination when level, search, or position changes
  useEffect(() => {
    setCurrentPage(1);
  }, [resolvedLevel, search, selectedPosition]);

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
        return { label: 'OPPOSITE HITTER', bg: 'bg-[#F97316]' };
      case 'S':
        return { label: 'SETTER', bg: 'bg-[#0EA5E9]' };
      default:
        return { label: pos, bg: 'bg-slate-700' };
    }
  };

  // Filter & Alphabetical (A-Z) Sort helper
  const filterAndSortList = (list: Player[]) => {
    return list
      .filter((p) => {
        if (selectedPosition !== 'ALL' && p.position !== selectedPosition) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            p.fullName.toLowerCase().includes(q) ||
            String(p.jerseyNumber).includes(q) ||
            p.position.toLowerCase().includes(q) ||
            (p.bio && p.bio.toLowerCase().includes(q)) ||
            p.hometownCountry.toLowerCase().includes(q) ||
            (p.country && p.country.toLowerCase().includes(q)) ||
            (p.countryName && p.countryName.toLowerCase().includes(q)) ||
            (p.countryCode && p.countryCode.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi', { sensitivity: 'base' }));
  };

  // Squad counts (alphabetically sorted)
  const seniorPlayers = useMemo(() => filterAndSortList(players.filter(p => p.level === 'SENIOR')), [players, search, selectedPosition]);
  const juniorPlayers = useMemo(() => filterAndSortList(players.filter(p => p.level === 'JUNIOR')), [players, search, selectedPosition]);
  const youthPlayers = useMemo(() => filterAndSortList(players.filter(p => p.level === 'YOUTH')), [players, search, selectedPosition]);

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

    return (
      <div
        key={player.id}
        className={`w-full rounded-3xl bg-[#131822] p-5 shadow-xl transition-all duration-300 flex flex-col justify-between relative group hover:scale-[1.01] ${
          isTeamCaptain 
            ? 'border-2 border-amber-500/80 shadow-lg shadow-amber-500/10 hover:border-amber-400 ring-1 ring-amber-400/30' 
            : 'border border-[#1e2738] hover:border-slate-600'
        }`}
      >
        {/* Top Badges: Captain Badge (Top-Left) and Flag (Top-Right) */}
        <div className="flex items-center justify-between mb-2">
          {isTeamCaptain ? (
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-md shadow-amber-500/30 border border-yellow-200 flex items-center gap-1">
              ★ CAPTAIN
            </span>
          ) : (
            <div />
          )}
          <div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0c1017] border border-slate-800 text-xs select-none"
            title={`${resolvedCountryName} (${resolvedCountryCode})`}
          >
            <span className="text-base leading-none">{resolvedFlag}</span>
            <span className="font-mono font-bold text-[10px] text-slate-300">{resolvedCountryCode}</span>
          </div>
        </div>

        <div>
          {/* Athlete Avatar Photo */}
          <div className="w-28 h-32 mx-auto rounded-2xl bg-[#0c1017] border border-slate-700/60 overflow-hidden shadow-inner flex items-center justify-center mt-1">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.fullName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-red-950 flex items-center justify-center font-athletic font-black text-3xl text-orange-400">
                #{player.jerseyNumber}
              </div>
            )}
          </div>

          {/* Athlete Name & Flag */}
          <h3 className="font-heading font-extrabold text-base sm:text-lg text-white text-center mt-3 tracking-wide flex items-center justify-center gap-1.5">
            <span>{player.fullName}</span>
            <span className="text-sm select-none" title={resolvedCountryName}>{resolvedFlag}</span>
          </h3>

          {/* Position Pill Badge */}
          <div className="flex justify-center mt-1.5">
            <span className={`${posMeta.bg} text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm`}>
              {posMeta.label}
            </span>
          </div>

          {/* 4-Box Metric Grid */}
          <div className="grid grid-cols-2 gap-2 my-3">
            <div className="bg-[#0c1017] rounded-xl p-2 text-center border border-[#1a2332]">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">HEIGHT</span>
              <span className="font-mono font-extrabold text-white text-xs sm:text-sm">{player.height}cm</span>
            </div>
            <div className="bg-[#0c1017] rounded-xl p-2 text-center border border-[#1a2332]">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">REACH</span>
              <span className="font-mono font-extrabold text-white text-xs sm:text-sm">{player.spikeTouch}cm</span>
            </div>
            {player.blockTouch > 0 && (
              <div className="bg-[#0c1017] rounded-xl p-2 text-center border border-[#1a2332]">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">BLOCK</span>
                <span className="font-mono font-extrabold text-white text-xs sm:text-sm">{player.blockTouch}cm</span>
              </div>
            )}
            <div className="bg-[#0c1017] rounded-xl p-2 text-center border border-[#1a2332]">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">JOINED</span>
              <span className="font-mono font-extrabold text-white text-xs sm:text-sm">{resolvedJoined}</span>
            </div>
            <div className="bg-[#0c1017] rounded-xl p-2 text-center border border-[#1a2332]">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">BORN</span>
              <span className="font-mono font-extrabold text-white text-xs sm:text-sm">{player.bornYear || 2005}</span>
            </div>
          </div>

          {/* Bottom Metadata Rows */}
          <div className="border-t border-[#1a2332] pt-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 text-[11px]">Country / Origin</span>
              <span className="font-semibold text-white text-[11px] flex items-center gap-1">
                <span>{resolvedFlag}</span>
                <span>{player.hometownCountry ? `${player.hometownCountry}, ${resolvedCountryName}` : resolvedCountryName}</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 text-[11px]">Joined: {resolvedJoined}</span>
              <span className="font-mono font-bold text-orange-400 text-xs">#{player.jerseyNumber}</span>
            </div>
          </div>

          {player.bio && (
            <p className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 italic leading-snug line-clamp-2">
              "{player.bio}"
            </p>
          )}

        </div>
      </div>
    );
  };

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
                : 'bg-[#121826] border-slate-800 hover:border-slate-700 hover:bg-[#161f33]'
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
                {juniorPlayers.length} Athletes
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
                : 'bg-[#121826] border-slate-800 hover:border-slate-700 hover:bg-[#1f1722]'
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
                {seniorPlayers.length} Athletes
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
                : 'bg-[#121826] border-slate-800 hover:border-slate-700 hover:bg-[#131f1c]'
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
                {youthPlayers.length} Athletes
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

        {/* SEARCH BAR & POSITION FILTERS (Positioned below the 3 big level buttons) */}
        <div className="bg-[#121826] p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Live Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search athlete name, jersey #, position, hometown..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#0c1017] border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0c1017] rounded-xl border border-slate-800 self-end md:self-auto text-xs">
              <button
                type="button"
                onClick={() => setViewMode('SINGLE_TAB')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'SINGLE_TAB'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Single Squad Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3_COLUMNS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === '3_COLUMNS'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>3-Column Overview</span>
              </button>
            </div>

          </div>

          {/* Position Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Position:</span>
            {[
              { id: 'ALL', label: 'All Positions' },
              { id: 'OH', label: 'Outside Hitter (OH)' },
              { id: 'OP', label: 'Opposite Hitter (OP)' },
              { id: 'MB', label: 'Middle Blocker (MB)' },
              { id: 'S', label: 'Setter (S)' },
              { id: 'L', label: 'Libero (L)' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPosition(item.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPosition === item.id
                    ? 'bg-red-600 text-white shadow-md shadow-red-950 ring-1 ring-red-400'
                    : 'bg-[#161F30] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* PRIMARY VIEW: SINGLE LEVEL ROSTER GRID (Default, spacious and uncrowded) */}
        {viewMode === 'SINGLE_TAB' ? (
          <div>
            <div id="players-grid-top" className="scroll-mt-24" />

            {/* Empty state */}
            {paginatedPlayers.length === 0 ? (
              <div className="p-16 rounded-3xl bg-[#121826] border border-dashed border-slate-800 text-center space-y-3">
                <User className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-heading font-bold text-white text-base">No Athletes Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No athletes in the {resolvedLevel} tier match your current search or position filter.
                </p>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSelectedPosition('ALL'); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

              {juniorPlayers.length === 0 ? (
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
                      {seniorPlayers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-300/80 mt-1">
                    Seasoned players with &gt; 3 years competitive experience
                  </p>
                </div>
              </div>

              {seniorPlayers.length === 0 ? (
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
                      {youthPlayers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80 mt-1">
                    Youth athletic fundamentals & skill development
                  </p>
                </div>
              </div>

              {youthPlayers.length === 0 ? (
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
