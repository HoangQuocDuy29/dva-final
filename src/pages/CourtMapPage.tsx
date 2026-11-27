import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MapPin, Navigation, Clock, Search, Sparkles, X, ChevronLeft, ChevronDown,
  Check, List, Map as MapIcon, Wallet, Layers, Info, RefreshCw, Timer, Tag, LocateFixed,
  AlertTriangle, Maximize2, Minimize2, SlidersHorizontal, RotateCcw, Link2,
} from 'lucide-react';
import { venueService } from '../services/api';
import type {
  RevealedSessionContact,
  RevealedVenueContact,
  VenueGenderRule,
  VenuePlayStyle,
  VenueSessionSlot,
  VenueType,
  VolleyballVenue,
} from '../types';
import {
  VN_DAY_OPTIONS,
  PLAY_STYLE_META,
  parsePlayStyles,
  GENDER_RULE_META,
  RECRUITMENT_META,
  VENUE_TYPE_META,
  VIETNAM_CITIES,
  VIETNAM_OVERVIEW,
  getVietnamNow,
  getDateForWeekdayInCurrentWeek,
  isSessionCancelledOnDate,
  hasAvailableSlots,
  getSubCourtNames,
  getSessionRealtimeInfo,
  isVenueClosedNow,
  formatClosedUntilDate,
  isVenueLiveNow,
  isVenueUpcomingToday,
  formatDaysOfWeek,
  formatDayFull,
  formatShortVnDate,
  buildGoogleMapsUrl,
  getClubInitials,
  parseTimeToMinutes,
  calcDistanceKm,
} from '../utils/venueSchedule';
import { optimizeCloudinaryLogoUrl, optimizeCloudinaryUrl } from '../utils/cloudinary';
import { HanoiLeafletMap, type MapVenueItem, type MapViewportTarget, type UserGeoPoint } from '../components/court-map/HanoiLeafletMap';
import { SessionStatusBlock } from '../components/court-map/SessionStatusBlock';
import { SlowServerPill } from '../components/common/GlassLoading';
import { ContactRevealModal, type ContactRevealTarget } from '../components/court-map/ContactRevealModal';
import {
  SessionContactRow,
  VenueRentalContactBlock,
  readRevealedContactCache,
  readRevealedVenueContactCache,
  writeRevealedContactCache,
  writeRevealedVenueContactCache,
} from '../components/court-map/SessionContactRow';

type TimeFilter = 'ALL' | 'LIVE' | 'UPCOMING_TODAY' | 'DAY';
type DropdownKey = 'DAY' | 'STYLE' | 'GENDER' | 'VENUE_TYPE' | null;

const STYLE_FILTER_ITEMS: Array<{ id: 'ALL' | VenuePlayStyle; label: string }> = [
  { id: 'ALL', label: 'Tất cả gu' },
  { id: 'COMPETITIVE', label: '🔥 Đấu căng' },
  { id: 'FUN_GAME', label: '😊 Chơi vui' },
  { id: 'TRAINING', label: '🏐 Tập luyện' },
];

const GENDER_FILTER_ITEMS: Array<{ id: 'ALL' | VenueGenderRule; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'MALE_ONLY', label: '♂ Chỉ Nam' },
  { id: 'MIXED', label: '⚥ Nam & Nữ' },
  { id: 'FEMALE_ONLY', label: '♀ Chỉ Nữ' },
];

const VENUE_TYPE_FILTER_ITEMS: Array<{ id: 'ALL' | VenueType; label: string }> = [
  { id: 'ALL', label: 'Mọi loại sân' },
  { id: 'COMMERCIAL', label: 'Sân dịch vụ' },
  { id: 'FREE_PUBLIC', label: 'Sân Free' },
];

export const CourtMapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [venues, setVenues] = useState<VolleyballVenue[]>(() => venueService.getCachedVenues() || []);
  const [loading, setLoading] = useState(() => !venueService.getCachedVenues());
  const [error, setError] = useState<string | null>(null);
  const [nowVn, setNowVn] = useState(() => getVietnamNow());
  const [timeMode, setTimeMode] = useState<TimeFilter>(() => {
    const d = searchParams.get('day');
    return d === 'LIVE' || d === 'UPCOMING_TODAY' ? d : d !== null && /^[0-6]$/.test(d) ? 'DAY' : 'ALL';
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = searchParams.get('day');
    return d !== null && /^[0-6]$/.test(d) ? Number(d) : getVietnamNow().dayOfWeek;
  });
  const [playStyle, setPlayStyle] = useState<'ALL' | VenuePlayStyle>(() => {
    const v = searchParams.get('vibe');
    return v === 'COMPETITIVE' || v === 'FUN_GAME' || v === 'TRAINING' ? v : 'ALL';
  });
  const [genderFilter, setGenderFilter] = useState<'ALL' | VenueGenderRule>(() => {
    const g = searchParams.get('gender');
    return g === 'MALE_ONLY' || g === 'MIXED' || g === 'FEMALE_ONLY' ? g : 'ALL';
  });
  const [venueType, setVenueType] = useState<'ALL' | VenueType>(() => {
    const t = searchParams.get('courtType');
    return t === 'COMMERCIAL' || t === 'FREE_PUBLIC' ? t : 'ALL';
  });
  const [onlyAvailableSlots, setOnlyAvailableSlots] = useState(() => searchParams.get('openSlots') === '1');
  const [cityFilter, setCityFilter] = useState<string>(() => {
    const c = searchParams.get('city');
    return VIETNAM_CITIES.some((item) => item.name === c) ? c! : 'ALL';
  });
  const [viewportTarget, setViewportTarget] = useState<MapViewportTarget | null>(() => {
    const c = searchParams.get('city');
    if (c && !searchParams.get('venue')) {
      const hit = VIETNAM_CITIES.find((item) => item.name === c);
      if (hit) return { lat: hit.lat, lng: hit.lng, zoom: hit.zoom, tick: Date.now() };
    }
    return null;
  });
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [mobileView, setMobileView] = useState<'MAP' | 'LIST'>('MAP');
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [userGeo, setUserGeo] = useState<UserGeoPoint | null>(null);
  const [geoTick, setGeoTick] = useState(0);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Dropdown, Mobile Filter Bottom Sheet, URL-synced Full-screen Map & Contact Reveal states
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isFullscreen = searchParams.get('view') === 'map';
  const initialVenueParamRef = useRef<string | null>(searchParams.get('venue'));
  const venueHydratedRef = useRef(false);
  const copyTimerRef = useRef<number | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenDropdownRef = useRef<HTMLDivElement | null>(null);

  const [revealedBySession, setRevealedBySession] = useState<Record<string, RevealedSessionContact>>({});
  const [visibleBySession, setVisibleBySession] = useState<Record<string, boolean>>({});
  const [revealedByVenue, setRevealedByVenue] = useState<Record<string, RevealedVenueContact>>({});
  const [visibleByVenue, setVisibleByVenue] = useState<Record<string, boolean>>({});
  const [revealTarget, setRevealTarget] = useState<ContactRevealTarget | null>(null);

  useEffect(() => {
    const syncNow = () => setNowVn(getVietnamNow());
    const t = setInterval(syncNow, 30_000);
    const onVis = () => { if (document.visibilityState === 'visible') syncNow(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((p) => (p === m ? null : p)), 3500);
  }, []);

  const loadVenues = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try { setVenues(await venueService.getPublicVenues({ forceRefresh })); }
    catch (e: any) { setError(e?.message || 'Không thể tải danh sách sân.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadVenues(false); }, [loadVenues]);

  // Outside click closes desktop dropdowns
  useEffect(() => {
    if (!openDropdown) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inMain = dropdownContainerRef.current?.contains(target);
      const inFull = fullscreenDropdownRef.current?.contains(target);
      if (!inMain && !inFull) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openDropdown]);

  // Hydrate initial ?venue=<slug|id> once venues finish loading (avoids async race with Drawer & Leaflet flyTo)
  useEffect(() => {
    if (venueHydratedRef.current || venues.length === 0) return;
    venueHydratedRef.current = true;
    const targetParam = initialVenueParamRef.current?.trim();
    if (!targetParam) return;
    const hit = venues.find((v) => v.slug === targetParam || v.id === targetParam);
    if (hit) {
      setSelectedId(hit.id);
      setFocusTick((n) => n + 1);
    } else {
      setSearchParams((prev) => {
        if (!prev.has('venue')) return prev;
        const next = new URLSearchParams(prev);
        next.delete('venue');
        return next;
      }, { replace: true });
    }
  }, [venues, setSearchParams]);

  // Sync filters & selected venue -> URL query params ({ replace: true } keeps Back stack clean)
  useEffect(() => {
    const next = new URLSearchParams();
    if (cityFilter !== 'ALL') next.set('city', cityFilter);
    if (timeMode === 'LIVE' || timeMode === 'UPCOMING_TODAY') next.set('day', timeMode);
    else if (timeMode === 'DAY') next.set('day', String(selectedDay));
    if (playStyle !== 'ALL') next.set('vibe', playStyle);
    if (genderFilter !== 'ALL') next.set('gender', genderFilter);
    if (venueType !== 'ALL') next.set('courtType', venueType);
    if (onlyAvailableSlots) next.set('openSlots', '1');
    if (query.trim()) next.set('q', query.trim());
    if (selectedId) {
      const hit = venues.find((v) => v.id === selectedId);
      next.set('venue', hit?.slug || selectedId);
    } else if (!venueHydratedRef.current && initialVenueParamRef.current) {
      next.set('venue', initialVenueParamRef.current);
    }
    if (isFullscreen) next.set('view', 'map');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [cityFilter, timeMode, selectedDay, playStyle, genderFilter, venueType, onlyAvailableSlots, query, selectedId, venues, isFullscreen, searchParams, setSearchParams]);

  // Full-screen Map entry/exit via React Router URL (?view=map) + body scroll lock + Escape key
  const enterFullscreen = useCallback(() => {
    setMobileView('MAP');
    setOpenDropdown(null);
    setFilterSheetOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', 'map');
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const exitFullscreen = useCallback(() => {
    setOpenDropdown(null);
    setSearchParams((prev) => {
      if (!prev.has('view')) return prev;
      const next = new URLSearchParams(prev);
      next.delete('view');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleCopyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setLinkCopied(false), 1800);
      showToast('Đã sao chép link bản đồ & bộ lọc!');
    } catch {
      showToast('Không thể sao chép link vào bộ nhớ tạm.');
    }
  }, [showToast]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isFullscreen]);

  useEffect(() => {
    if (!filterSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      if (!isFullscreen) document.body.style.overflow = prevOverflow;
    };
  }, [filterSheetOpen, isFullscreen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (revealTarget) return; // ContactRevealModal handles its own Escape
      if (openDropdown) { setOpenDropdown(null); return; }
      if (filterSheetOpen) { setFilterSheetOpen(false); return; }
      if (isFullscreen) { exitFullscreen(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealTarget, openDropdown, filterSheetOpen, isFullscreen, exitFullscreen]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUserGeo({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoTick((n) => n + 1);
        setLocating(false);
        showToast('Đã định vị — sắp xếp sân từ gần đến xa!');
      },
      () => {
        setLocating(false);
        showToast('Không thể lấy vị trí — vui lòng cấp quyền định vị cho trình duyệt.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCityChange = (nextCity: string) => {
    setCityFilter(nextCity);
    const t = VIETNAM_CITIES.find((c) => c.name === nextCity) ?? VIETNAM_OVERVIEW;
    setViewportTarget({ lat: t.lat, lng: t.lng, zoom: t.zoom, tick: Date.now() });
  };

  const handleViewAllVietnam = () => {
    setCityFilter('ALL');
    setSelectedId(null);
    setViewportTarget({ ...VIETNAM_OVERVIEW, tick: Date.now() });
  };

  const activeFilterCount =
    (timeMode !== 'ALL' ? 1 : 0) +
    (playStyle !== 'ALL' ? 1 : 0) +
    (genderFilter !== 'ALL' ? 1 : 0) +
    (venueType !== 'ALL' ? 1 : 0) +
    (onlyAvailableSlots ? 1 : 0) +
    (cityFilter !== 'ALL' ? 1 : 0);

  const hasAnyFilter = activeFilterCount > 0 || query.trim().length > 0;

  const resetAllFilters = () => {
    setTimeMode('ALL');
    setPlayStyle('ALL');
    setGenderFilter('ALL');
    setVenueType('ALL');
    setOnlyAvailableSlots(false);
    setCityFilter('ALL');
    setQuery('');
    setOpenDropdown(null);
  };

  const activeSelectedDay = timeMode === 'DAY' ? selectedDay : null;
  const viewedDay = activeSelectedDay ?? nowVn.dayOfWeek;
  const viewedDate = activeSelectedDay !== null ? getDateForWeekdayInCurrentWeek(activeSelectedDay, nowVn) : nowVn.dateStr;
  const filteringSessions = timeMode !== 'ALL' || playStyle !== 'ALL' || genderFilter !== 'ALL' || onlyAvailableSlots;

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = venues
      .map((venue) => {
        const closed = isVenueClosedNow(venue, nowVn.nowMs);
        const activeSessions = [...(venue.sessions || [])]
          .filter((s) => s.club && s.club.isActive !== false)
          .sort((a, b) => {
            const rk = (s: VenueSessionSlot) => {
              const st = getSessionRealtimeInfo(s, nowVn, closed, activeSelectedDay).state;
              return st === 'UPCOMING' ? 0 : st === 'LIVE' ? 1 : st === 'SCHEDULED' ? 2 : st === 'OTHER_DAY' ? 3 : st === 'CANCELLED' ? 4 : 5;
            };
            return rk(a) - rk(b) || parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
          });

        const matchingSessions = activeSessions.filter((s) => {
          if (!s.club) return false;
          if (playStyle !== 'ALL' && !parsePlayStyles(s.club.playStyle).includes(playStyle)) return false;
          if (genderFilter !== 'ALL' && (s.genderRule || 'MIXED') !== genderFilter) return false;
          if (onlyAvailableSlots && !hasAvailableSlots(s, viewedDate, closed)) return false;
          if (timeMode === 'LIVE') return !closed && getSessionRealtimeInfo(s, nowVn, closed).state === 'LIVE';
          if (timeMode === 'UPCOMING_TODAY') return !closed && getSessionRealtimeInfo(s, nowVn, closed).state === 'UPCOMING';
          return timeMode === 'DAY' ? s.daysOfWeek.includes(selectedDay) : true;
        });

        const hasDaySessions = activeSessions.some(
          (s) =>
            !isSessionCancelledOnDate(s, viewedDate) &&
            s.daysOfWeek.includes(viewedDay) &&
            (playStyle === 'ALL' || parsePlayStyles(s.club?.playStyle).includes(playStyle)) &&
            (genderFilter === 'ALL' || (s.genderRule || 'MIXED') === genderFilter) &&
            (!onlyAvailableSlots || hasAvailableSlots(s, viewedDate, closed))
        );

        const hasActivity = !closed && (filteringSessions ? matchingSessions.length > 0 : hasDaySessions);
        const venueCity = venue.city || 'Hà Nội';
        const matchesMeta =
          (cityFilter === 'ALL' || venueCity === cityFilter) &&
          (venueType === 'ALL' || venue.venueType === venueType) &&
          (!q ||
            [
              venue.name,
              venue.address,
              venueCity,
              venue.district,
              venue.surfaceType,
              ...(venue.clubs || []).flatMap((c) => [c.name, c.captainName, c.description || '', ...(c.tags || [])]),
            ].some((f) => f.toLowerCase().includes(q)));

        return {
          venue,
          closed,
          activeSessions,
          matchingSessions,
          hasDaySessions,
          hasActivity,
          isLive: isVenueLiveNow(venue, nowVn),
          distanceKm: userGeo ? calcDistanceKm(userGeo.lat, userGeo.lng, venue.latitude, venue.longitude) : null,
          matchesMeta,
        };
      })
      .filter((e) => e.matchesMeta);

    if (userGeo) {
      list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    } else if (filteringSessions) {
      list.sort((a, b) => Number(b.hasActivity) - Number(a.hasActivity) || b.matchingSessions.length - a.matchingSessions.length);
    }
    return list;
  }, [
    venues,
    nowVn,
    timeMode,
    selectedDay,
    viewedDay,
    viewedDate,
    playStyle,
    genderFilter,
    onlyAvailableSlots,
    filteringSessions,
    venueType,
    cityFilter,
    query,
    userGeo,
    activeSelectedDay,
  ]);

  const mapItems = useMemo<MapVenueItem[]>(
    () =>
      entries.map((e) => ({
        venue: e.venue,
        isLive: e.isLive,
        isClosed: e.closed,
        hasActivity: e.hasActivity,
        matchingSessionsCount: filteringSessions ? e.matchingSessions.length : e.activeSessions.length,
      })),
    [entries, filteringSessions]
  );

  const liveCount = useMemo(() => venues.filter((v) => isVenueLiveNow(v, nowVn)).length, [venues, nowVn]);
  const upcomingCount = useMemo(() => venues.filter((v) => isVenueUpcomingToday(v, nowVn)).length, [venues, nowVn]);
  const selected = useMemo(() => entries.find((e) => e.venue.id === selectedId) || null, [entries, selectedId]);

  const [activeVenue, setActiveVenue] = useState<typeof selected>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selected) {
      setIsSheetOpen(false);
      setActiveVenue(null);
      return;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveVenue(selected);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setIsSheetOpen(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [selected]);

  useEffect(() => {
    if (!isSheetOpen || window.innerWidth >= 1024 || isFullscreen) return;
    document.body.classList.add('overflow-hidden');
    return () => { document.body.classList.remove('overflow-hidden'); };
  }, [isSheetOpen, isFullscreen]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
  }, []);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedId(null);
      setActiveVenue(null);
      closeTimerRef.current = null;
    }, 300);
  }, []);

  const onSelectVenue = useCallback((id: string) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setIsSheetOpen(true);
    }
    setSelectedId(id);
    setShowAllSessions(false);
    setFocusTick((n) => n + 1);
  }, []);

  const handleRevealSuccess = useCallback((contact: RevealedSessionContact) => {
    writeRevealedContactCache(contact);
    setRevealedBySession((prev) => ({ ...prev, [contact.sessionId]: contact }));
    setVisibleBySession((prev) => ({ ...prev, [contact.sessionId]: true }));
  }, []);

  const handleToggleContactVisibility = useCallback((sessionId: string, visible: boolean) => {
    setVisibleBySession((prev) => ({ ...prev, [sessionId]: visible }));
  }, []);

  const handleVenueRevealSuccess = useCallback((contact: RevealedVenueContact) => {
    writeRevealedVenueContactCache(contact);
    setRevealedByVenue((prev) => ({ ...prev, [contact.venueId]: contact }));
    setVisibleByVenue((prev) => ({ ...prev, [contact.venueId]: true }));
  }, []);

  const handleToggleVenueVisibility = useCallback((venueId: string, visible: boolean) => {
    setVisibleByVenue((prev) => ({ ...prev, [venueId]: visible }));
  }, []);

  // Labels for Dropdown triggers
  const dayTriggerLabel = useMemo(() => {
    if (timeMode === 'LIVE') return `🟢 Đang đánh (${liveCount})`;
    if (timeMode === 'UPCOMING_TODAY') return `🟠 Sắp diễn ra (${upcomingCount})`;
    if (timeMode === 'DAY') {
      const opt = VN_DAY_OPTIONS.find((d) => d.value === selectedDay);
      return opt ? `${opt.label}${opt.value === nowVn.dayOfWeek ? ' · Hôm nay' : ''}` : 'Tất cả ngày';
    }
    return 'Ngày: Tất cả';
  }, [timeMode, selectedDay, nowVn.dayOfWeek, liveCount, upcomingCount]);

  const styleTriggerLabel = useMemo(() => {
    if (playStyle === 'ALL') return 'Gu chơi';
    return STYLE_FILTER_ITEMS.find((i) => i.id === playStyle)?.label || 'Gu chơi';
  }, [playStyle]);

  const genderTriggerLabel = useMemo(() => {
    if (genderFilter === 'ALL') return 'Đối tượng';
    return GENDER_FILTER_ITEMS.find((i) => i.id === genderFilter)?.label || 'Đối tượng';
  }, [genderFilter]);

  const venueTypeTriggerLabel = useMemo(() => {
    if (venueType === 'ALL') return 'Loại sân';
    return VENUE_TYPE_FILTER_ITEMS.find((i) => i.id === venueType)?.label || 'Loại sân';
  }, [venueType]);

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
      active
        ? 'border-orange-500/50 bg-orange-500/15 text-orange-200'
        : 'bg-white/[0.05] border-white/10 text-slate-200 hover:bg-white/[0.09] hover:text-white'
    }`;

  const renderDesktopDropdowns = (containerRef: React.RefObject<HTMLDivElement | null>, compact = false) => (
    <div ref={containerRef} className="hidden md:flex flex-wrap items-center gap-1.5 relative">
      {/* 1. Ngày Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown((p) => (p === 'DAY' ? null : 'DAY'))}
          aria-expanded={openDropdown === 'DAY'}
          className={pillClass(timeMode !== 'ALL')}
        >
          <span>{dayTriggerLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'DAY' ? 'rotate-180 text-orange-400' : 'text-slate-400'}`} />
        </button>
        {openDropdown === 'DAY' && (
          <div className="absolute left-0 mt-2 w-60 rounded-2xl bg-[#0B0D12]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-1.5 z-[970] space-y-0.5">
            <button
              type="button"
              onClick={() => { setTimeMode('ALL'); setOpenDropdown(null); }}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${timeMode === 'ALL' ? 'bg-orange-500/15 text-orange-200 border border-orange-500/40' : 'text-slate-200 hover:bg-white/[0.06]'}`}
            >
              <span>Tất cả ngày</span>
              {timeMode === 'ALL' && <Check className="w-3.5 h-3.5 text-orange-400" />}
            </button>
            <button
              type="button"
              onClick={() => { setTimeMode('LIVE'); setOpenDropdown(null); }}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${timeMode === 'LIVE' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40' : 'text-slate-200 hover:bg-white/[0.06]'}`}
            >
              <span>🟢 Đang đánh ({liveCount})</span>
              {timeMode === 'LIVE' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => { setTimeMode('UPCOMING_TODAY'); setOpenDropdown(null); }}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${timeMode === 'UPCOMING_TODAY' ? 'bg-orange-500/15 text-orange-200 border border-orange-500/40' : 'text-slate-200 hover:bg-white/[0.06]'}`}
            >
              <span>🟠 Sắp diễn ra hôm nay ({upcomingCount})</span>
              {timeMode === 'UPCOMING_TODAY' && <Check className="w-3.5 h-3.5 text-orange-400" />}
            </button>
            <div className="h-px bg-white/10 my-1" />
            {VN_DAY_OPTIONS.map((d) => {
              const isToday = d.value === nowVn.dayOfWeek;
              const active = timeMode === 'DAY' && selectedDay === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => { setSelectedDay(d.value); setTimeMode('DAY'); setOpenDropdown(null); }}
                  className={`w-full px-3 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${active ? 'bg-orange-500/15 text-orange-200 border border-orange-500/40' : 'text-slate-200 hover:bg-white/[0.06]'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{d.label}</span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/40">
                        Hôm nay
                      </span>
                    )}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Gu chơi Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown((p) => (p === 'STYLE' ? null : 'STYLE'))}
          aria-expanded={openDropdown === 'STYLE'}
          className={pillClass(playStyle !== 'ALL')}
        >
          <span>{styleTriggerLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'STYLE' ? 'rotate-180 text-orange-400' : 'text-slate-400'}`} />
        </button>
        {openDropdown === 'STYLE' && (
          <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-[#0B0D12]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-1.5 z-[970] space-y-0.5">
            {STYLE_FILTER_ITEMS.map((item) => {
              const active = playStyle === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setPlayStyle(item.id); setOpenDropdown(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${active ? 'bg-orange-500/15 text-orange-200 border border-orange-500/40' : 'text-slate-200 hover:bg-white/[0.06]'}`}
                >
                  <span>{item.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Đối tượng Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown((p) => (p === 'GENDER' ? null : 'GENDER'))}
          aria-expanded={openDropdown === 'GENDER'}
          className={pillClass(genderFilter !== 'ALL')}
        >
          <span>{genderTriggerLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'GENDER' ? 'rotate-180 text-orange-400' : 'text-slate-400'}`} />
        </button>
        {openDropdown === 'GENDER' && (
          <div className="absolute left-0 mt-2 w-44 rounded-2xl bg-[#0B0D12]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-1.5 z-[970] space-y-0.5">
            {GENDER_FILTER_ITEMS.map((item) => {
              const active = genderFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setGenderFilter(item.id); setOpenDropdown(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${active ? 'bg-orange-500/15 text-orange-200 border border-orange-500/40' : 'text-slate-200 hover:bg-white/[0.06]'}`}
                >
                  <span>{item.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Loại sân Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown((p) => (p === 'VENUE_TYPE' ? null : 'VENUE_TYPE'))}
          aria-expanded={openDropdown === 'VENUE_TYPE'}
          className={pillClass(venueType !== 'ALL')}
        >
          <span>{venueTypeTriggerLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'VENUE_TYPE' ? 'rotate-180 text-orange-400' : 'text-slate-400'}`} />
        </button>
        {openDropdown === 'VENUE_TYPE' && (
          <div className="absolute left-0 mt-2 w-44 rounded-2xl bg-[#0B0D12]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-1.5 z-[970] space-y-0.5">
            {VENUE_TYPE_FILTER_ITEMS.map((item) => {
              const active = venueType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setVenueType(item.id); setOpenDropdown(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${active ? 'bg-orange-500/15 text-orange-200 border border-orange-500/40' : 'text-slate-200 hover:bg-white/[0.06]'}`}
                >
                  <span>{item.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Chip gạt nhanh Còn slot */}
      <button
        type="button"
        role="switch"
        aria-checked={onlyAvailableSlots}
        onClick={() => setOnlyAvailableSlots((v) => !v)}
        className={pillClass(onlyAvailableSlots)}
      >
        <span className={`w-2 h-2 rounded-full transition-colors ${onlyAvailableSlots ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/30'}`} />
        <span>Còn slot</span>
      </button>

      {compact && (
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border cursor-pointer shrink-0 transition-colors ${
            userGeo ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/[0.05] text-blue-300 border-blue-500/40 hover:bg-blue-500/15'
          }`}
        >
          <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          <span>Gần tôi</span>
        </button>
      )}

      {/* 6. Reset button (only visible when at least 1 filter is active) */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="px-2.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 text-orange-300 hover:text-orange-200 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/35 cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );

  const renderDrawer = (entry: NonNullable<typeof selected>, isMobile: boolean) => {
    const { venue, closed, activeSessions, matchingSessions, hasDaySessions, distanceKm } = entry;
    const list = filteringSessions && !showAllSessions ? matchingSessions : activeSessions;
    const reopenStr = formatClosedUntilDate(venue.closedUntil);
    const vt = VENUE_TYPE_META[venue.venueType] || VENUE_TYPE_META.COMMERCIAL;

    return (
      <div className="flex flex-col h-full min-h-0 bg-[#0B0D12]/90 backdrop-blur-2xl text-white">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
          {!isMobile && !isFullscreen ? (
            <button type="button" onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-orange-400 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />Danh sách sân ({entries.length})
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-300">Chi tiết sân &amp; lịch ca</span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopyShareLink()}
              title="Sao chép link trỏ thẳng tới sân này"
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border cursor-pointer transition-colors ${
                linkCopied
                  ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
                  : 'bg-white/[0.06] border-white/15 text-slate-200 hover:border-orange-500/50 hover:text-orange-200'
              }`}
            >
              {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-orange-400" />}
              <span>{linkCopied ? 'Đã copy' : 'Copy Link'}</span>
            </button>
            <button type="button" onClick={() => (isMobile ? closeSheet() : setSelectedId(null))} aria-label="Đóng chi tiết sân" className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {closed && (
            <div className="p-3 rounded-2xl bg-red-950/75 border border-red-500/60 text-xs text-red-100 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-red-200 uppercase">⚠️ SÂN TẠM NGHỈ: {venue.closureReason || 'Tạm đóng cửa nghỉ lễ'}</p>
                {reopenStr && <p className="text-[11px] text-red-300">Dự kiến mở lại: <strong>{reopenStr}</strong></p>}
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden dva-glass-panel">
            {(venue.coverUrl || venue.imageUrl) && (
              <div className="relative h-36 bg-slate-900">
                <img src={optimizeCloudinaryUrl(venue.coverUrl || venue.imageUrl, 'card')} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141C2B] via-[#141C2B]/25 to-transparent" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {venue.isDvaOfficial && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-red-600 to-orange-500 text-white"><Sparkles className="w-3 h-3" />DVA Official</span>}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${vt.badgeClass}`}>{vt.shortLabel}</span>
                </div>
              </div>
            )}
            <div className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-heading font-black text-lg leading-snug">{venue.name}</h2>
                {distanceKm !== null && <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-400/40 text-blue-300 text-[10px] font-bold shrink-0">📍 Cách ~{distanceKm.toFixed(1)} km</span>}
              </div>
              <p className="text-xs text-slate-300 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />{venue.address}</p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 font-semibold">Quận {venue.district}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-sky-300 font-semibold"><Layers className="w-3 h-3" />{venue.surfaceType}</span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-orange-300 font-semibold">{venue.subCourtsCount} sân: {getSubCourtNames(venue.subCourtsCount).join(', ')}</span>
              </div>
              {(() => {
                const hasRental = venue.venueType === 'COMMERCIAL' && Boolean(venue.hasRentalContact || venue.rentalPhone?.trim());
                if (venue.venueType === 'FREE_PUBLIC') {
                  return (
                    <div className="p-2.5 rounded-xl border text-xs space-y-1.5 bg-emerald-950/30 border-emerald-500/35">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold inline-flex items-center gap-1"><Wallet className="w-3.5 h-3.5 text-emerald-400" />Sân Miễn Phí</span>
                        <strong className="text-emerald-300">Miễn phí</strong>
                      </div>
                      {venue.entryNote && <p className="text-[11px] text-slate-300 flex items-start gap-1"><Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />{venue.entryNote}</p>}
                    </div>
                  );
                }
                if (!hasRental && !venue.entryNote) return null;
                return (
                  <div className="p-3 rounded-xl border text-xs space-y-2 bg-[#0B0F19]/80 border-white/10">
                    {hasRental && (
                      <VenueRentalContactBlock
                        venue={venue}
                        revealedContact={revealedByVenue[venue.id] || readRevealedVenueContactCache(venue.id)}
                        isVisible={Boolean(visibleByVenue[venue.id] ?? false)}
                        onRevealSuccess={handleVenueRevealSuccess}
                        onToggleVisibility={handleToggleVenueVisibility}
                        onRequireVerify={setRevealTarget}
                        onNotify={showToast}
                      />
                    )}
                    {venue.entryNote && <p className="text-[11px] text-slate-300 flex items-start gap-1"><Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />{venue.entryNote}</p>}
                  </div>
                );
              })()}
              <a href={buildGoogleMapsUrl(venue)} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2"><Navigation className="w-4 h-4" />Chỉ đường Google Maps</a>
            </div>
          </div>

          {!closed && !hasDaySessions && (
            <div className="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{timeMode === 'DAY' ? formatDayFull(selectedDay) : 'Hôm nay'} không có ca sinh hoạt phù hợp bộ lọc — xem lịch các ca khác bên dưới.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-sm">Lịch Các Ca &amp; CLB ({list.length})</h3>
            {filteringSessions && activeSessions.length > matchingSessions.length && (
              <button type="button" onClick={() => setShowAllSessions((v) => !v)} className="text-[11px] font-bold text-orange-400 cursor-pointer">
                {showAllSessions ? 'Chỉ ca khớp lọc' : `+${activeSessions.length - matchingSessions.length} ca khác`}
              </button>
            )}
          </div>

          <div className={`space-y-2.5 pb-4 ${closed ? 'opacity-50' : ''}`}>
            {list.length === 0 ? (
              <div className="p-4 rounded-2xl dva-glass-panel text-center text-xs text-slate-400 space-y-2">
                <p>Không có ca nào khớp bộ lọc hiện tại tại sân này.</p>
                {activeSessions.length > 0 && (
                  <button type="button" onClick={() => setShowAllSessions(true)} className="px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-300 font-bold cursor-pointer">
                    Xem tất cả {activeSessions.length} ca của sân
                  </button>
                )}
              </div>
            ) : (
              list.map((s) => {
                const club = s.club;
                if (!club) return null;
                const styles = parsePlayStyles(club.playStyle).map((k) => PLAY_STYLE_META[k]);
                const genderMeta = GENDER_RULE_META[s.genderRule || 'MIXED'] || GENDER_RULE_META.MIXED;
                const rec = RECRUITMENT_META[s.recruitmentStatus] || RECRUITMENT_META.CHECK_CAPTAIN;
                const rt = getSessionRealtimeInfo(s, nowVn, closed, activeSelectedDay);
                const cancelled = !closed && isSessionCancelledOnDate(s, viewedDate);
                const revealed = revealedBySession[s.id] || readRevealedContactCache(s.id);
                const isContactVisible = Boolean(visibleBySession[s.id] ?? false);

                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl p-3.5 border space-y-2 ${
                      cancelled
                        ? 'opacity-50 bg-white/[0.03] border-amber-500/40'
                        : rt.state === 'LIVE'
                          ? 'opacity-80 hover:opacity-100 dva-glass-panel'
                          : rt.state === 'UPCOMING'
                            ? 'bg-gradient-to-br from-orange-500/15 to-white/[0.04] border-orange-400/75 ring-1 ring-orange-500/35'
                            : 'dva-glass-panel'
                    }`}
                  >
                    {!closed && !cancelled && (rt.state === 'LIVE' || rt.state === 'UPCOMING' || rt.state === 'SCHEDULED') && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        {rt.state === 'LIVE' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">● ĐANG ĐÁNH ({s.startTime} - {s.endTime})</span>
                        ) : rt.state === 'UPCOMING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-500/20 text-amber-200 border border-orange-400/60"><Timer className="w-3.5 h-3.5 text-orange-300" />⏳ {rt.countdownText}</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">📅 Lịch {formatDayFull(selectedDay)} {formatShortVnDate(viewedDate)} ({s.startTime} - {s.endTime})</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rec.badgeClass}`}>{rec.label}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <Link to={`/services/court-map/teams/${club.slug}`} className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-900 flex items-center justify-center">
                        {club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 96)} alt={club.name} className="w-full h-full object-cover" loading="lazy" /> : <span className="font-heading font-black text-xs text-orange-400">{getClubInitials(club.name)}</span>}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <Link to={`/services/court-map/teams/${club.slug}`} className="font-heading font-black text-sm text-white hover:text-orange-400 truncate">{club.name}</Link>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${club.feeType === 'FREE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-amber-300'}`}>{club.feeType === 'FREE' ? 'FREE' : club.feeAmount || 'Thu phí'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Đội trưởng: <strong className="text-slate-200">{club.captainName}</strong></p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {styles.map((st) => <span key={st.shortLabel} className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${st.badgeClass}`}>{st.emoji} {st.shortLabel}</span>)}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${genderMeta.badgeClass}`}>{genderMeta.shortLabel}</span>
                          {s.skillRankLabel && (
                            <Link
                              to="/information/skill-levels"
                              title="Xem bảng phân cấp trình độ chuẩn USAV"
                              className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-950/85 hover:bg-blue-900 text-blue-200 border border-blue-500/50 transition-colors"
                            >
                              🇺🇸 USAV: {s.skillRankLabel}
                            </Link>
                          )}
                          {s.subCourts.map((sc) => <span key={sc} className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/15 text-sky-300 border border-sky-500/35">{sc}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0B0F19]/80 border border-slate-800 text-xs">
                      <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <strong className="text-orange-300">{s.startTime} – {s.endTime}</strong>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-200 font-semibold">{formatDaysOfWeek(s.daysOfWeek)}</span>
                    </div>
                    <SessionStatusBlock session={s} venueClosed={closed} targetDate={viewedDate} todayDate={nowVn.dateStr} />
                    {club.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {club.tags.slice(0, 4).map((t) => (
                          <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300">
                            <Tag className="w-2.5 h-2.5 text-slate-500" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <SessionContactRow
                      sessionId={s.id}
                      club={club}
                      venue={venue}
                      session={s}
                      revealedContact={revealed}
                      isVisible={isContactVisible}
                      onRevealSuccess={handleRevealSuccess}
                      onToggleVisibility={handleToggleContactVisibility}
                      onRequireVerify={setRevealTarget}
                      onNotify={showToast}
                      detailHref={`/services/court-map/teams/${club.slug}`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="flex flex-col h-full bg-[#0B0D12]/40 backdrop-blur-xl">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-heading font-black text-sm">
          Danh Sách Sân ({entries.length})
          {userGeo && <span className="text-[10px] font-semibold text-blue-400 ml-1">· Gần nhất trước</span>}
        </h2>
        {hasAnyFilter && (
          <button type="button" onClick={resetAllFilters} className="text-[11px] font-bold text-orange-400 hover:text-orange-300 cursor-pointer inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />Xóa lọc
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading && !venues.length ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={`venue-skel-${idx}`} className="dva-skeleton p-3.5 rounded-2xl space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="dva-skeleton-bar w-11 h-11 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="dva-skeleton-bar h-3.5 w-36" />
                    <div className="dva-skeleton-bar h-2.5 w-48 max-w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="dva-skeleton-bar h-5 w-20 rounded-full" />
                  <div className="dva-skeleton-bar h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
            <SlowServerPill active className="pt-1 pb-2" />
          </div>
        ) : (
          <div className="space-y-2.5 dva-content-reveal">
            {entries.map(({ venue, closed, hasActivity, isLive, distanceKm, activeSessions, matchingSessions }) => {
            const vt = VENUE_TYPE_META[venue.venueType] || VENUE_TYPE_META.COMMERCIAL;
            const venueLogo =
              venue.mapLogoUrl ??
              (venue.featuredTeamId
                ? (venue.clubs || []).find((c) => c.id === venue.featuredTeamId)?.logoUrl
                : null) ??
              (venue.clubs || []).find((c) => Boolean(c.logoUrl))?.logoUrl ??
              null;
            const sessionCountLabel = filteringSessions
              ? `${matchingSessions.length}/${activeSessions.length} ca khớp`
              : `${(venue.clubs || []).length} CLB · ${activeSessions.length} ca`;
            return (
              <button
                key={venue.id}
                type="button"
                onClick={() => onSelectVenue(venue.id)}
                className={`w-full text-left p-3.5 dva-glass-card rounded-2xl cursor-pointer ${
                  closed
                    ? 'border-red-500/40 opacity-80'
                    : !hasActivity
                      ? 'opacity-65 hover:border-orange-500/40'
                      : 'border-orange-500/35 hover:border-orange-500/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`relative w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 flex items-center justify-center ${
                        closed
                          ? 'border-red-400/70 bg-slate-800'
                          : venue.isDvaOfficial
                            ? 'border-orange-400 bg-gradient-to-br from-red-600 to-orange-500'
                            : venue.venueType === 'FREE_PUBLIC'
                              ? 'border-emerald-400 bg-gradient-to-br from-emerald-600 to-emerald-500'
                              : 'border-white/20 bg-slate-900'
                      }`}
                    >
                      <span className="font-heading font-black text-[9px] text-white">
                        {closed ? 'NGHỈ' : venue.isDvaOfficial ? 'DVA' : venue.venueType === 'FREE_PUBLIC' ? 'FREE' : getClubInitials(venue.name)}
                      </span>
                      {venueLogo && (
                        <img
                          src={optimizeCloudinaryLogoUrl(venueLogo, 96)}
                          alt={venue.name}
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          className="absolute inset-0 w-full h-full object-cover bg-[#0B0D12]"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {closed && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-900/80 text-red-200 border border-red-500/50">TẠM NGHỈ</span>}
                        {venue.isDvaOfficial && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-red-600 to-orange-500 text-white">DVA</span>}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${vt.badgeClass}`}>{vt.shortLabel}</span>
                        {isLive && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">● Live</span>}
                        {distanceKm !== null && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-400/40">📍 ~{distanceKm.toFixed(1)} km</span>}
                      </div>
                      <h3 className="font-heading font-extrabold text-sm text-white truncate">{venue.name}</h3>
                      <p className="text-[11px] text-slate-400 truncate">{venue.district} · {venue.surfaceType} · {venue.subCourtsCount} sân</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full border text-[10px] font-bold shrink-0 ${filteringSessions && matchingSessions.length > 0 ? 'bg-orange-500/15 border-orange-500/40 text-orange-200' : 'bg-white/[0.06] border-white/10 text-slate-200'}`}>
                    {sessionCountLabel}
                  </span>
                </div>
              </button>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-transparent text-white flex flex-col">
      {/* Header & Clustered Filter Bar */}
      <section className="bg-transparent pt-3 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <div className="dva-glass-panel backdrop-blur-2xl rounded-3xl p-4 sm:p-5 space-y-3.5 relative">
            {/* Title + Search & Area Row */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
              <div className="min-w-0 lg:shrink-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black uppercase bg-orange-500/15 text-orange-400 border border-orange-500/35">
                    <MapPin className="w-3 h-3" />Hanoi Volleyball Radar
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 dva-glass-pill text-slate-300">
                    <Clock className="w-3 h-3 text-emerald-400" />Hà Nội: <strong className="text-white">{nowVn.timeLabel}</strong> ({nowVn.dayLabel})
                  </span>
                </div>
                <h1 className="font-heading font-black text-xl sm:text-2xl xl:text-[26px] lg:whitespace-nowrap mt-1">
                  Bản Đồ Sân Bóng Chuyền <span className="text-orange-500">Hà Nội</span>
                </h1>
              </div>

              {/* Desktop Search / City / Locate / Copy / Refresh */}
              <div className="hidden md:flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
                <div className="relative flex-1 min-w-[170px] sm:w-52 xl:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm sân, quận, CLB..."
                    className="w-full pl-9 pr-3 py-2 dva-glass-pill text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <select
                  aria-label="Lọc theo thành phố"
                  value={cityFilter}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="px-3 py-2 dva-glass-pill text-xs font-bold text-slate-100 focus:outline-none focus:border-orange-500 cursor-pointer shrink-0"
                >
                  <option value="ALL" className="bg-[#0B0D12]">🇻🇳 Toàn Việt Nam</option>
                  {VIETNAM_CITIES.map((c) => (
                    <option key={c.name} value={c.name} className="bg-[#0B0D12]">{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={locating}
                  className={`px-3 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border cursor-pointer shrink-0 ${
                    userGeo ? 'bg-blue-600 text-white border-blue-400' : 'dva-glass-pill text-blue-300 border-blue-500/40'
                  }`}
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span>📍 Gần tôi</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyShareLink()}
                  title="Sao chép link bộ lọc & bản đồ hiện tại"
                  className={`px-3 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border cursor-pointer shrink-0 transition-colors ${
                    linkCopied
                      ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
                      : 'dva-glass-pill text-slate-100 hover:border-orange-400'
                  }`}
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-orange-400" />}
                  <span>{linkCopied ? 'Đã copy' : 'Copy Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void loadVenues(true)}
                  disabled={loading}
                  aria-label="Làm mới"
                  className="p-2 dva-glass-pill text-slate-300 hover:text-white cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
                </button>
              </div>

              {/* Mobile Compact Toolbar (< md): Search + Bộ lọc (N) + Gần tôi */}
              <div className="flex md:hidden items-center gap-1.5 w-full">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm sân, quận, CLB..."
                    className="w-full pl-9 pr-3 py-2 dva-glass-pill text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(true)}
                  className={`px-3 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border shrink-0 cursor-pointer transition-colors ${
                    activeFilterCount > 0
                      ? 'border-orange-500/50 bg-orange-500/15 text-orange-200'
                      : 'bg-white/[0.05] border-white/10 text-slate-100'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
                  <span>Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={locating}
                  aria-label="Tìm sân gần tôi"
                  className={`px-2.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1 border shrink-0 cursor-pointer ${
                    userGeo ? 'bg-blue-600 text-white border-blue-400' : 'dva-glass-pill text-blue-300 border-blue-500/40'
                  }`}
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Gần tôi</span>
                </button>
              </div>
            </div>

            {/* Desktop Clustered Dropdown Filters + Quick Còn slot + Mobile Map/List Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              {renderDesktopDropdowns(dropdownContainerRef, false)}

              {/* Mobile quick row: Còn slot toggle + Reset + Map/List view switcher */}
              <div className="flex md:hidden items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onlyAvailableSlots}
                    onClick={() => setOnlyAvailableSlots((v) => !v)}
                    className={pillClass(onlyAvailableSlots)}
                  >
                    <span className={`w-2 h-2 rounded-full ${onlyAvailableSlots ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/30'}`} />
                    <span>Còn slot</span>
                  </button>
                  {hasAnyFilter && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="px-2.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 text-orange-300 bg-orange-500/10 border border-orange-500/35 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopyShareLink()}
                    aria-label="Sao chép link bộ lọc"
                    title="Sao chép link bộ lọc & bản đồ"
                    className={`w-8 h-8 rounded-full border inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                      linkCopied
                        ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
                        : 'dva-glass-pill text-slate-200 hover:border-orange-500/50'
                    }`}
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-orange-400" />}
                  </button>
                </div>
                <div className="flex dva-glass-pill p-0.5 shrink-0">
                  {([['MAP', MapIcon, 'Bản đồ'], ['LIST', List, `DS (${entries.length})`]] as const).map(([id, Icon, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMobileView(id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${mobileView === id ? 'bg-orange-500 text-white' : 'text-slate-300'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tablet (md..lg) Map/List toggle */}
              <div className="hidden md:flex lg:hidden dva-glass-pill p-0.5 shrink-0 ml-auto">
                {([['MAP', MapIcon, 'Bản đồ'], ['LIST', List, `Danh sách (${entries.length})`]] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMobileView(id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${mobileView === id ? 'bg-orange-500 text-white' : 'text-slate-300'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-700 text-xs text-red-200">{error}</div>
        </div>
      )}

      {/* Map + Sidebar Container (no backdrop-blur on immediate map ancestor so fixed fullscreen never traps) */}
      <section className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
        <div
          className={`flex flex-col lg:flex-row lg:h-[calc(100vh-15.5rem)] lg:min-h-[580px] rounded-2xl lg:rounded-3xl bg-white/[0.04] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] relative ${
            isFullscreen ? '' : 'overflow-hidden'
          }`}
        >
          {/* Map Wrapper: seamlessly switches between embedded and fixed 100dvh full-screen */}
          <div
            className={
              isFullscreen
                ? 'fixed inset-0 z-[900] h-[100dvh] w-screen bg-[#0B0D12]'
                : `relative isolate z-0 ${mobileView === 'LIST' ? 'hidden lg:block lg:flex-1 lg:h-full' : 'block w-full h-[64vh] min-h-[430px] lg:flex-1 lg:h-full'}`
            }
          >
            <HanoiLeafletMap
              items={mapItems}
              selectedVenueId={selectedId}
              onSelectVenue={onSelectVenue}
              focusTrigger={focusTick}
              isVisible={isFullscreen || mobileView === 'MAP'}
              isFullscreen={isFullscreen}
              userLocation={userGeo}
              userFocusTrigger={geoTick}
              viewportTarget={viewportTarget}
            />

            {/* Radar Sync Status Glass Pill while venues load */}
            {loading && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[420] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0D12]/85 backdrop-blur-xl border border-orange-500/35 shadow-xl text-[11px] font-bold text-orange-200 dva-content-reveal">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                <span>Đang đồng bộ radar sân...</span>
              </div>
            )}

            {/* Embedded Expand Button (Top-Right of map frame) */}
            {!isFullscreen && (
              <button
                type="button"
                onClick={enterFullscreen}
                aria-label="Mở bản đồ toàn màn hình"
                title="Mở bản đồ toàn màn hình"
                className="absolute top-3 right-3 z-[410] w-10 h-10 rounded-full bg-[#0B0D12]/80 hover:bg-[#0B0D12]/95 backdrop-blur-xl border border-white/15 hover:border-orange-500/60 text-white shadow-lg flex items-center justify-center cursor-pointer transition"
              >
                <Maximize2 className="w-4 h-4 text-orange-400" />
              </button>
            )}

            {/* Full-screen Floating Top Bar (safe-area-inset-top aware, z-[920]) */}
            {isFullscreen && (
              <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] inset-x-3 z-[920] pointer-events-none flex items-center justify-between gap-2">
                {/* Left / Center Controls */}
                <div className="pointer-events-auto flex items-center gap-1.5 min-w-0">
                  {/* Desktop inline frosted dropdown bar */}
                  <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#0B0D12]/85 backdrop-blur-2xl border border-white/15 shadow-2xl">
                    {renderDesktopDropdowns(fullscreenDropdownRef, true)}
                  </div>

                  {/* Mobile inline Bộ lọc + Gần tôi buttons */}
                  <div className="flex md:hidden items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterSheetOpen(true)}
                      className={`min-h-[42px] px-3.5 rounded-full backdrop-blur-xl border text-xs font-bold inline-flex items-center gap-1.5 shadow-lg cursor-pointer ${
                        activeFilterCount > 0
                          ? 'bg-[#0B0D12]/90 border-orange-500/50 text-orange-200'
                          : 'bg-[#0B0D12]/85 border-white/15 text-white'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
                      <span>Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={locating}
                      className={`min-h-[42px] px-3 rounded-full backdrop-blur-xl border text-xs font-bold inline-flex items-center gap-1.5 shadow-lg cursor-pointer ${
                        userGeo ? 'bg-blue-600/95 border-blue-400 text-white' : 'bg-[#0B0D12]/85 border-blue-500/40 text-blue-300'
                      }`}
                    >
                      <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                      <span>Gần tôi</span>
                    </button>
                  </div>
                </div>

                {/* Right Copy Link + Prominent Touch-Friendly Exit Button (Mobile & Desktop) */}
                <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleCopyShareLink()}
                    aria-label="Sao chép link bản đồ"
                    title="Sao chép link bản đồ & bộ lọc"
                    className={`w-[42px] h-[42px] rounded-full backdrop-blur-xl border shadow-lg flex items-center justify-center cursor-pointer shrink-0 transition ${
                      linkCopied
                        ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-300'
                        : 'bg-[#0B0D12]/85 hover:bg-[#0B0D12] border-white/15 hover:border-orange-500/50 text-white'
                    }`}
                  >
                    {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-orange-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={exitFullscreen}
                    aria-label="Thu nhỏ bản đồ"
                    className="min-h-[42px] px-3.5 rounded-full bg-[#0B0D12]/85 hover:bg-[#0B0D12] backdrop-blur-xl border border-orange-500/40 hover:border-orange-400 text-white shadow-lg flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0 transition"
                  >
                    <Minimize2 className="w-4 h-4 text-orange-400" />
                    <span>Thu nhỏ</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pin Legend Pill */}
            <div
              className={`absolute z-[400] pointer-events-none px-3 py-1.5 rounded-full bg-[#0B0D12]/80 backdrop-blur-xl border border-white/15 text-[10px] font-bold text-slate-200 flex items-center gap-2.5 ${
                isFullscreen ? 'bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3' : 'top-3 left-3'
              }`}
            >
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-600 to-orange-500" />Có lịch</span>
              <span className="inline-flex items-center gap-1 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 opacity-50" />Không lịch</span>
              <span className="inline-flex items-center gap-1 text-red-300"><span className="w-2.5 h-2.5 rounded-full bg-red-600" />Tạm nghỉ</span>
            </div>
          </div>

          {!isFullscreen && mobileView === 'LIST' && <div className="lg:hidden min-h-[60vh]">{renderList()}</div>}
          {!isFullscreen && (
            <aside className="hidden lg:flex lg:flex-col w-[380px] xl:w-[420px] shrink-0 border-l border-white/10 h-full overflow-hidden">
              {selected ? renderDrawer(selected, false) : renderList()}
            </aside>
          )}
        </div>
      </section>

      {/* Guide Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-10">
        <div className="dva-glass-panel rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/35">
              <Info className="w-3.5 h-3.5" />HƯỚNG DẪN SỬ DỤNG
            </span>
            <h2 className="font-heading font-black text-lg sm:text-xl lg:text-2xl text-white">Cách Tìm Sân &amp; Xin Ghép Kèo Nhanh Chóng</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="dva-glass-card rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 1</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Chọn Khu Vực &amp; Định Vị (📍 Gần tôi)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Chọn <strong className="text-white">Thành phố</strong> (Hà Nội, Đà Nẵng, TP.HCM), bấm <strong className="text-white">🇻🇳 Toàn Việt Nam</strong>, hoặc bấm <strong className="text-blue-300">📍 Gần tôi</strong> để bản đồ tự động đo khoảng cách (km) và xếp ưu tiên các sân gần bạn nhất.
              </p>
            </div>
            <div className="dva-glass-card rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 2</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Lọc Đúng Thứ, Gu Chơi &amp; Còn Slot</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dùng các cụm <strong className="text-white">Dropdown bộ lọc</strong> theo <strong className="text-white">Ngày</strong>, <strong className="text-white">Gu chơi</strong> (🔥 Đấu căng, 😊 Chơi vui, 🏐 Tập luyện), <strong className="text-white">Đối tượng</strong>, <strong className="text-white">Loại sân</strong> và bật chip <strong className="text-emerald-300">Còn slot</strong>.
              </p>
            </div>
            <div className="dva-glass-card rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 3</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Mở Toàn Màn Hình &amp; Xem Chi Tiết Sân</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bấm nút mở rộng góc phải bản đồ để soi sân toàn màn hình; bấm vào điểm ghim sân sáng màu để kiểm tra số slot trống và vị trí cần tuyển (<strong className="text-white">OH, MB, OP, S, L</strong>).
              </p>
            </div>
            <div className="dva-glass-card rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 4</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Xác Thực Hiện SĐT &amp; Nhắn Zalo Đội Trưởng</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bấm biểu tượng <strong className="text-orange-300">Con mắt</strong> để xác thực hiện SĐT Đội trưởng (xin ghép kèo), sau đó <strong className="text-sky-300">Nhắn Zalo</strong>, <strong className="text-emerald-300">Gọi điện</strong> hoặc <strong className="text-white">Copy</strong>. Nếu sân dịch vụ có cho thuê nguyên sân, thông tin <strong className="text-amber-300">Liên hệ chủ sân</strong> sẽ hiển thị riêng ở thẻ sân.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {([
              ['🟠 Ghim Sáng / ● Đang đánh', 'text-orange-300', 'Sân có lịch đội hoạt động trong ngày đang xem hoặc đang diễn ra trực tiếp.'],
              ['⚫ Ghim Xám Mờ', 'text-slate-300', 'Sân chưa có lịch đội sinh hoạt vào thứ đang lọc (bấm vào vẫn xem được lịch các ngày khác trong tuần).'],
              ['🔴 Tạm nghỉ / Báo nghỉ buổi', 'text-red-300', 'Sân tạm đóng cửa dịp lễ Tết hoặc đội tạm nghỉ riêng buổi hôm đó (hệ thống tự động mở lại ở các buổi tiếp theo).'],
            ] as const).map(([title, color, desc]) => (
              <div key={title} className="dva-glass-card rounded-2xl px-3.5 py-3 space-y-1">
                <p className={`text-xs font-extrabold ${color}`}>{title}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop Full-screen Venue Detail Drawer (z-[950] above z-[900] fullscreen map) */}
      {isFullscreen && selected && (
        <aside
          aria-label="Chi tiết sân toàn màn hình"
          className="hidden lg:flex fixed top-[calc(4.75rem+env(safe-area-inset-top))] right-3 bottom-3 w-[400px] max-w-[calc(100vw-1.5rem)] z-[950] rounded-3xl overflow-hidden border border-white/15 shadow-2xl flex-col"
        >
          {renderDrawer(selected, false)}
        </aside>
      )}

      {/* Mobile Venue Detail Bottom Sheet (z-[950] — works seamlessly in both normal & full-screen map) */}
      {activeVenue && (
        <div className="lg:hidden fixed inset-0 z-[950]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Đóng"
            onClick={closeSheet}
            className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${isSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] rounded-t-3xl overflow-hidden border-t border-white/15 bg-[#0B0D12]/95 backdrop-blur-2xl flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isSheetOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto my-2 shrink-0" />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{renderDrawer(activeVenue, true)}</div>
          </div>
        </div>
      )}

      {/* Mobile Filter Bottom Sheet (< md, z-[960]) */}
      {filterSheetOpen && (
        <div className="md:hidden fixed inset-0 z-[955]" role="dialog" aria-modal="true" aria-label="Bộ lọc tìm sân">
          <button
            type="button"
            aria-label="Đóng bộ lọc"
            onClick={() => setFilterSheetOpen(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
          />
          <div className="fixed inset-x-0 bottom-0 z-[960] rounded-t-3xl bg-[#0B0D12]/95 backdrop-blur-2xl border-t border-white/15 max-h-[82dvh] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                <h3 className="font-heading font-black text-base text-white">Bộ lọc tìm sân &amp; kèo</h3>
              </div>
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                aria-label="Đóng"
                className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick toggle: Còn slot */}
            <button
              type="button"
              role="switch"
              aria-checked={onlyAvailableSlots}
              onClick={() => setOnlyAvailableSlots((v) => !v)}
              className={`w-full px-4 py-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
                onlyAvailableSlots
                  ? 'bg-orange-500/15 border-orange-500/50 text-orange-200'
                  : 'bg-white/[0.04] border-white/10 text-slate-200'
              }`}
            >
              <div className="text-left">
                <p className="text-xs font-black">Chỉ hiện ca còn slot trống</p>
                <p className="text-[11px] text-slate-400">Lọc nhanh các ca chưa đủ người (availableSlots &gt; 0)</p>
              </div>
              <span
                className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                  onlyAvailableSlots ? 'bg-orange-500 justify-end' : 'bg-white/15 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow" />
              </span>
            </button>

            {/* Ngày */}
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Ngày &amp; Trạng thái</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setTimeMode('ALL')} className={pillClass(timeMode === 'ALL')}>Tất cả ngày</button>
                <button type="button" onClick={() => setTimeMode('LIVE')} className={pillClass(timeMode === 'LIVE')}>🟢 Đang đánh ({liveCount})</button>
                <button type="button" onClick={() => setTimeMode('UPCOMING_TODAY')} className={pillClass(timeMode === 'UPCOMING_TODAY')}>🟠 Sắp diễn ra ({upcomingCount})</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {VN_DAY_OPTIONS.map((d) => {
                  const isToday = d.value === nowVn.dayOfWeek;
                  const active = timeMode === 'DAY' && selectedDay === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => { setSelectedDay(d.value); setTimeMode('DAY'); }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-between cursor-pointer transition-colors ${
                        active
                          ? 'border-orange-500/50 bg-orange-500/15 text-orange-200'
                          : 'bg-white/[0.04] border-white/10 text-slate-200'
                      }`}
                    >
                      <span>{d.label}</span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/40">
                          Hôm nay
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gu chơi */}
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Gu chơi</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_FILTER_ITEMS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setPlayStyle(item.id)} className={pillClass(playStyle === item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Đối tượng */}
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Đối tượng</p>
              <div className="flex flex-wrap gap-1.5">
                {GENDER_FILTER_ITEMS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setGenderFilter(item.id)} className={pillClass(genderFilter === item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loại sân */}
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Loại sân</p>
              <div className="flex flex-wrap gap-1.5">
                {VENUE_TYPE_FILTER_ITEMS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setVenueType(item.id)} className={pillClass(venueType === item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Thành phố */}
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Thành phố</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={handleViewAllVietnam} className={pillClass(cityFilter === 'ALL')}>
                  🇻🇳 Toàn Việt Nam
                </button>
                {VIETNAM_CITIES.map((c) => (
                  <button key={c.name} type="button" onClick={() => handleCityChange(c.name)} className={pillClass(cityFilter === c.name)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={resetAllFilters}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="flex-[1.5] min-h-[44px] py-2.5 px-4 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/25 cursor-pointer"
              >
                Áp dụng ({entries.length} sân)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Reveal Verification Modal (z-[980]) */}
      <ContactRevealModal
        target={revealTarget}
        onClose={() => setRevealTarget(null)}
        onRevealed={handleRevealSuccess}
        onVenueRevealed={handleVenueRevealSuccess}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[990] max-w-[92vw] px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/50 text-xs font-semibold text-emerald-200 shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};

export default CourtMapPage;
