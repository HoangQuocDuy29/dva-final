import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Navigation, MessageCircle, Phone, Clock, Search, Sparkles, X, ChevronLeft, ChevronRight,
  Check, List, Map as MapIcon, Wallet, Layers, Info, RefreshCw, Timer, Tag, LocateFixed, AlertTriangle,
} from 'lucide-react';
import { venueService } from '../services/api';
import type { CourtClubProfile, VenueGenderRule, VenuePlayStyle, VenueSessionSlot, VenueType, VolleyballVenue } from '../types';
import {
  VN_DAY_OPTIONS, PLAY_STYLE_META, GENDER_RULE_META, RECRUITMENT_META, VENUE_TYPE_META, VIETNAM_CITIES, VIETNAM_OVERVIEW, getVietnamNow, getDateForWeekdayInCurrentWeek, isSessionCancelledOnDate, getSubCourtNames,
  getSessionRealtimeInfo, isVenueClosedNow, formatClosedUntilDate, isVenueLiveNow, isVenueUpcomingToday,
  formatDaysOfWeek, formatDayFull, buildGoogleMapsUrl, buildZaloContact, sanitizePhoneForLink, getClubInitials, parseTimeToMinutes, calcDistanceKm,
} from '../utils/venueSchedule';
import { optimizeCloudinaryLogoUrl, optimizeCloudinaryUrl } from '../utils/cloudinary';
import { HanoiLeafletMap, type MapVenueItem, type MapViewportTarget, type UserGeoPoint } from '../components/court-map/HanoiLeafletMap';
import { SessionStatusBlock } from '../components/court-map/SessionStatusBlock';

type TimeFilter = 'ALL' | 'LIVE' | 'UPCOMING_TODAY' | 'DAY';

export const CourtMapPage: React.FC = () => {
  const [venues, setVenues] = useState<VolleyballVenue[]>(() => venueService.getCachedVenues() || []);
  const [loading, setLoading] = useState(() => !venueService.getCachedVenues());
  const [error, setError] = useState<string | null>(null);
  const [nowVn, setNowVn] = useState(() => getVietnamNow());
  const [timeMode, setTimeMode] = useState<TimeFilter>('ALL');
  const [selectedDay, setSelectedDay] = useState(() => getVietnamNow().dayOfWeek);
  const [playStyle, setPlayStyle] = useState<'ALL' | VenuePlayStyle>('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | VenueGenderRule>('ALL');
  const [venueType, setVenueType] = useState<'ALL' | VenueType>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [viewportTarget, setViewportTarget] = useState<MapViewportTarget | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [mobileView, setMobileView] = useState<'MAP' | 'LIST'>('MAP');
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [userGeo, setUserGeo] = useState<UserGeoPoint | null>(null);
  const [geoTick, setGeoTick] = useState(0);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { const t = setInterval(() => setNowVn(getVietnamNow()), 30_000); return () => clearInterval(t); }, []);
  const showToast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast((p) => (p === m ? null : p)), 3500); }, []);

  const loadVenues = useCallback(async (forceRefresh = false) => {
    setLoading(true); setError(null);
    try { setVenues(await venueService.getPublicVenues({ forceRefresh })); }
    catch (e: any) { setError(e?.message || 'Không thể tải danh sách sân.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadVenues(false); }, [loadVenues]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserGeo({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoTick((n) => n + 1); setLocating(false); showToast('Đã định vị — sắp xếp sân từ gần đến xa!'); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCityChange = (nextCity: string) => {
    setCityFilter(nextCity);
    const t = VIETNAM_CITIES.find((c) => c.name === nextCity) ?? VIETNAM_OVERVIEW;
    setViewportTarget({ lat: t.lat, lng: t.lng, zoom: t.zoom, tick: Date.now() });
  };
  const handleViewAllVietnam = () => { setCityFilter('ALL'); setSelectedId(null); setViewportTarget({ ...VIETNAM_OVERVIEW, tick: Date.now() }); };

  const activeSelectedDay = timeMode === 'DAY' ? selectedDay : null;
  const viewedDay = activeSelectedDay ?? nowVn.dayOfWeek;
  const viewedDate = activeSelectedDay !== null ? getDateForWeekdayInCurrentWeek(activeSelectedDay, nowVn) : nowVn.dateStr;

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = venues.map((venue) => {
      const closed = isVenueClosedNow(venue, nowVn.nowMs);
      const activeSessions = [...(venue.sessions || [])].filter((s) => s.club && s.club.isActive !== false).sort((a, b) => {
        const rk = (s: VenueSessionSlot) => { const st = getSessionRealtimeInfo(s, nowVn, closed, activeSelectedDay).state; return st === 'UPCOMING' ? 0 : st === 'LIVE' ? 1 : st === 'SCHEDULED' ? 2 : st === 'OTHER_DAY' ? 3 : st === 'CANCELLED' ? 4 : 5; };
        return rk(a) - rk(b) || parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
      });
      const matchingSessions = activeSessions.filter((s) => {
        if (!s.club || (playStyle !== 'ALL' && s.club.playStyle !== playStyle) || (genderFilter !== 'ALL' && (s.genderRule || 'MIXED') !== genderFilter)) return false;
        if (timeMode === 'LIVE') return !closed && getSessionRealtimeInfo(s, nowVn, closed).state === 'LIVE';
        if (timeMode === 'UPCOMING_TODAY') return !closed && getSessionRealtimeInfo(s, nowVn, closed).state === 'UPCOMING';
        return timeMode === 'DAY' ? s.daysOfWeek.includes(selectedDay) : true;
      });
      const hasDaySessions = activeSessions.some((s) => !isSessionCancelledOnDate(s, viewedDate) && s.daysOfWeek.includes(viewedDay) && (playStyle === 'ALL' || s.club?.playStyle === playStyle) && (genderFilter === 'ALL' || (s.genderRule || 'MIXED') === genderFilter));
      const hasActivity = !closed && (timeMode === 'ALL' && genderFilter === 'ALL' ? hasDaySessions : matchingSessions.length > 0);
      const venueCity = venue.city || 'Hà Nội';
      const matchesMeta = (cityFilter === 'ALL' || venueCity === cityFilter) && (venueType === 'ALL' || venue.venueType === venueType) && (
        !q || [venue.name, venue.address, venueCity, venue.district, venue.surfaceType, ...(venue.clubs || []).flatMap((c) => [c.name, c.captainName, c.description || '', ...(c.tags || [])])].some((f) => f.toLowerCase().includes(q))
      );
      return { venue, closed, activeSessions, matchingSessions, hasDaySessions, hasActivity, isLive: isVenueLiveNow(venue, nowVn), distanceKm: userGeo ? calcDistanceKm(userGeo.lat, userGeo.lng, venue.latitude, venue.longitude) : null, matchesMeta };
    }).filter((e) => e.matchesMeta);
    if (userGeo) list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    return list;
  }, [venues, nowVn, timeMode, selectedDay, viewedDay, viewedDate, playStyle, genderFilter, venueType, cityFilter, query, userGeo]);

  const mapItems = useMemo<MapVenueItem[]>(() => entries.map((e) => ({ venue: e.venue, isLive: e.isLive, isClosed: e.closed, hasActivity: e.hasActivity, matchingSessionsCount: e.matchingSessions.length || e.activeSessions.length })), [entries]);
  const liveCount = useMemo(() => venues.filter((v) => isVenueLiveNow(v, nowVn)).length, [venues, nowVn]);
  const upcomingCount = useMemo(() => venues.filter((v) => isVenueUpcomingToday(v, nowVn)).length, [venues, nowVn]);
  const selected = useMemo(() => entries.find((e) => e.venue.id === selectedId) || null, [entries, selectedId]);
  const [activeVenue, setActiveVenue] = useState<typeof selected>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selected) { setIsSheetOpen(false); setActiveVenue(null); return; }
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setActiveVenue(selected);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setIsSheetOpen(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [selected]);
  useEffect(() => {
    if (!isSheetOpen || window.innerWidth >= 1024) return;
    document.body.classList.add('overflow-hidden');
    return () => { document.body.classList.remove('overflow-hidden'); };
  }, [isSheetOpen]);
  useEffect(() => () => { if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current); }, []);
  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => { setSelectedId(null); setActiveVenue(null); closeTimerRef.current = null; }, 300);
  }, []);
  const onSelectVenue = useCallback((id: string) => {
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; setIsSheetOpen(true); }
    setSelectedId(id); setShowAllSessions(false); setFocusTick((n) => n + 1);
  }, []);
  const openZalo = async (club: CourtClubProfile, venue: VolleyballVenue, s: VenueSessionSlot) => {
    const { zaloUrl, messageTemplate } = buildZaloContact(club, venue, s);
    try { await navigator.clipboard.writeText(messageTemplate); showToast('Đã sao chép tin nhắn mẫu hỏi slot — dán vào Zalo để gửi!'); } catch { /* ignore */ }
    window.open(zaloUrl, '_blank', 'noopener,noreferrer');
  };

  const renderDrawer = (entry: NonNullable<typeof selected>, isMobile: boolean) => {
    const { venue, closed, activeSessions, matchingSessions, hasDaySessions, distanceKm } = entry;
    const filtering = timeMode !== 'ALL' || playStyle !== 'ALL' || genderFilter !== 'ALL';
    const list = filtering && !showAllSessions ? matchingSessions : activeSessions;
    const reopenStr = formatClosedUntilDate(venue.closedUntil);
    const vt = VENUE_TYPE_META[venue.venueType] || VENUE_TYPE_META.COMMERCIAL;

    return (
      <div className="flex flex-col h-full min-h-0 bg-[#0F1420] text-white">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#0F1420]/95 backdrop-blur border-b border-slate-800">
          {!isMobile ? <button type="button" onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-orange-400 cursor-pointer"><ChevronLeft className="w-4 h-4" />Danh sách sân ({entries.length})</button> : <span className="text-xs font-bold text-slate-300">Chi tiết sân & lịch ca</span>}
          <button type="button" onClick={() => (isMobile ? closeSheet() : setSelectedId(null))} aria-label="Đóng chi tiết sân" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {closed && (
            <div className="p-3 rounded-2xl bg-red-950/75 border border-red-500/60 text-xs text-red-100 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div><p className="font-black text-red-200 uppercase">⚠️ SÂN TẠM NGHỈ: {venue.closureReason || 'Tạm đóng cửa nghỉ lễ'}</p>{reopenStr && <p className="text-[11px] text-red-300">Dự kiến mở lại: <strong>{reopenStr}</strong></p>}</div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden bg-[#141C2B] border border-slate-800">
            {(venue.coverUrl || venue.imageUrl) && (
              <div className="relative h-36 bg-slate-900">
                <img src={optimizeCloudinaryUrl(venue.coverUrl || venue.imageUrl, 'card')} alt={venue.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141C2B] via-[#141C2B]/25 to-transparent" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {venue.isDvaOfficial && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-red-600 to-orange-500 text-white"><Sparkles className="w-3 h-3" />DVA Official</span>}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border backdrop-blur ${vt.badgeClass}`}>{vt.shortLabel}</span>
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
              <div className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${venue.venueType === 'FREE_PUBLIC' ? 'bg-emerald-950/30 border-emerald-500/35' : 'bg-[#0B0F19]/80 border-slate-800'}`}>
                {venue.venueType === 'FREE_PUBLIC' ? (
                  <div className="flex justify-between gap-2"><span className="font-bold inline-flex items-center gap-1"><Wallet className="w-3.5 h-3.5 text-emerald-400" />Sân Miễn Phí</span><strong className="text-emerald-300">Miễn phí</strong></div>
                ) : (
                  <p className="font-semibold text-slate-200 leading-relaxed flex items-start gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Nếu bạn muốn thuê sân, hãy liên hệ <a href="tel:0768299329" className="font-black text-amber-300 hover:text-orange-300 underline decoration-amber-400/60 underline-offset-2 whitespace-nowrap">0768299329</a></span>
                  </p>
                )}
                {venue.entryNote && <p className="text-[11px] text-slate-300 flex items-start gap-1"><Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />{venue.entryNote}</p>}
              </div>
              <a href={buildGoogleMapsUrl(venue)} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2"><Navigation className="w-4 h-4" />Chỉ đường Google Maps</a>
            </div>
          </div>

          {!closed && !hasDaySessions && (
            <div className="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" /><span>{timeMode === 'DAY' ? formatDayFull(selectedDay) : 'Hôm nay'} không có ca sinh hoạt — xem lịch các ngày khác bên dưới.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-sm">Lịch Các Ca & CLB ({list.length})</h3>
            {filtering && activeSessions.length > matchingSessions.length && (
              <button type="button" onClick={() => setShowAllSessions((v) => !v)} className="text-[11px] font-bold text-orange-400 cursor-pointer">{showAllSessions ? 'Chỉ ca khớp lọc' : `+${activeSessions.length - matchingSessions.length} ca khác`}</button>
            )}
          </div>

          <div className={`space-y-2.5 pb-4 ${closed ? 'opacity-50' : ''}`}>
            {list.map((s) => {
              const club = s.club;
              if (!club) return null;
              const style = PLAY_STYLE_META[club.playStyle] || PLAY_STYLE_META.FUN_GAME;
              const rec = RECRUITMENT_META[s.recruitmentStatus] || RECRUITMENT_META.CHECK_CAPTAIN;
              const rt = getSessionRealtimeInfo(s, nowVn, closed, activeSelectedDay);
              const cancelled = !closed && isSessionCancelledOnDate(s, viewedDate);
              return (
                <div key={s.id} className={`rounded-2xl p-3.5 border space-y-2 ${cancelled ? 'opacity-50 bg-[#121622] border-amber-500/40' : rt.state === 'LIVE' ? 'opacity-65 hover:opacity-95 bg-[#121826] border-slate-700' : rt.state === 'UPCOMING' ? 'bg-gradient-to-br from-[#1B1726] to-[#141C2B] border-orange-400/75 ring-1 ring-orange-500/35' : 'bg-[#141C2B] border-slate-800'}`}>
                  {!closed && !cancelled && (rt.state === 'LIVE' || rt.state === 'UPCOMING' || rt.state === 'SCHEDULED') && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      {rt.state === 'LIVE' ? <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">● ĐANG ĐÁNH ({s.startTime} - {s.endTime})</span> : rt.state === 'UPCOMING' ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-500/20 text-amber-200 border border-orange-400/60"><Timer className="w-3.5 h-3.5 text-orange-300" />⏳ {rt.countdownText}</span> : <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">📅 Lịch {formatDayFull(selectedDay)} ({s.startTime} - {s.endTime})</span>}
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${style.badgeClass}`}>{style.emoji} {style.shortLabel} • {(GENDER_RULE_META[s.genderRule || 'MIXED'] || GENDER_RULE_META.MIXED).shortLabel}</span>
                        {s.subCourts.map((sc) => <span key={sc} className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/15 text-sky-300 border border-sky-500/35">{sc}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0B0F19]/80 border border-slate-800 text-xs">
                    <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" /><strong className="text-orange-300">{s.startTime} – {s.endTime}</strong><span className="text-slate-600">•</span><span className="text-slate-200 font-semibold">{formatDaysOfWeek(s.daysOfWeek)}</span>
                  </div>
                  <SessionStatusBlock session={s} venueClosed={closed} targetDate={viewedDate} todayDate={nowVn.dateStr} />
                  {club.tags?.length > 0 && <div className="flex flex-wrap gap-1">{club.tags.slice(0, 4).map((t) => <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300"><Tag className="w-2.5 h-2.5 text-slate-500" />{t}</span>)}</div>}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void openZalo(club, venue, s)} className="flex-1 py-2 px-2.5 rounded-xl bg-[#0068FF] hover:bg-[#0058D9] text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"><MessageCircle className="w-3.5 h-3.5 shrink-0" /><span>Zalo</span></button>
                    <a href={`tel:${sanitizePhoneForLink(club.captainPhone)}`} className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/45 text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Phone className="w-3.5 h-3.5 shrink-0" /><span>Gọi</span></a>
                    <Link to={`/services/court-map/teams/${club.slug}`} className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 hover:text-orange-300 font-bold text-xs inline-flex items-center justify-center gap-0.5 whitespace-nowrap shrink-0"><span>Chi tiết</span><ChevronRight className="w-3.5 h-3.5 shrink-0" /></Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="flex flex-col h-full bg-[#0F1420]">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-heading font-black text-sm">Danh Sách Sân ({entries.length}){userGeo && <span className="text-[10px] font-semibold text-blue-400 ml-1">· Gần nhất trước</span>}</h2>
        {(timeMode !== 'ALL' || playStyle !== 'ALL' || genderFilter !== 'ALL' || venueType !== 'ALL' || cityFilter !== 'ALL' || query) && <button type="button" onClick={() => { setTimeMode('ALL'); setPlayStyle('ALL'); setGenderFilter('ALL'); setVenueType('ALL'); setCityFilter('ALL'); setQuery(''); }} className="text-[11px] font-bold text-orange-400 cursor-pointer">Xóa lọc</button>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading && !venues.length ? <div className="py-16 flex justify-center"><div className="w-7 h-7 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin" /></div> : entries.map(({ venue, closed, hasActivity, isLive, distanceKm, activeSessions }) => {
          const vt = VENUE_TYPE_META[venue.venueType] || VENUE_TYPE_META.COMMERCIAL;
          return (
            <button key={venue.id} type="button" onClick={() => onSelectVenue(venue.id)} className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${closed ? 'bg-[#121622] border-red-500/40 opacity-80' : !hasActivity ? 'bg-[#121826] border-slate-800 opacity-60' : 'bg-[#141C2B] border-orange-500/35 hover:border-orange-500/70'}`}>
              <div className="flex items-start justify-between gap-2">
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
                <span className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-200 shrink-0">{(venue.clubs || []).length} CLB · {activeSessions.length} ca</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0B0F19] text-white flex flex-col">
      <section className="border-b border-slate-800/80 bg-gradient-to-b from-[#111827] to-[#0B0F19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black uppercase bg-orange-500/15 text-orange-400 border border-orange-500/35"><MapPin className="w-3 h-3" />Hanoi Volleyball Radar</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"><Clock className="w-3 h-3 text-emerald-400" />Hà Nội: <strong className="text-white">{nowVn.timeLabel}</strong> ({nowVn.dayLabel})</span>
              </div>
              <h1 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl mt-1">Bản Đồ Sân Bóng Chuyền <span className="text-orange-500">Hà Nội</span></h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
              <div className="relative flex-1 min-w-[150px] sm:w-52 xl:w-60"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm sân, quận, CLB..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141C2B] border border-slate-700 text-xs text-white focus:outline-none focus:border-orange-500" /></div>
              <select aria-label="Lọc theo thành phố" value={cityFilter} onChange={(e) => handleCityChange(e.target.value)} className="px-2.5 py-2 rounded-xl bg-[#141C2B] border border-slate-700 text-xs font-bold text-slate-100 focus:outline-none focus:border-orange-500 cursor-pointer shrink-0">
                <option value="ALL">Tất cả TP</option>
                {VIETNAM_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <button type="button" onClick={handleViewAllVietnam} className="px-2.5 py-2 rounded-xl bg-[#141C2B] hover:border-orange-400 border border-slate-700 text-xs font-bold text-slate-100 cursor-pointer shrink-0">🇻🇳 Toàn Việt Nam</button>
              <button type="button" onClick={handleLocateMe} disabled={locating} className={`px-2.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border cursor-pointer shrink-0 ${userGeo ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#141C2B] text-blue-300 border-blue-500/40'}`}><LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} /><span>📍 Gần tôi</span></button>
              <button type="button" onClick={() => void loadVenues(true)} disabled={loading} aria-label="Làm mới" className="p-2 rounded-xl bg-[#141C2B] border border-slate-700 text-slate-300 cursor-pointer shrink-0"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} /></button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-2">
              {([['ALL', `Tất cả sân (${venues.length})`], ['LIVE', `🟢 Đang đánh (${liveCount})`], ['UPCOMING_TODAY', `🟠 Sắp diễn ra (${upcomingCount})`]] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTimeMode(id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border cursor-pointer ${timeMode === id ? 'bg-white text-slate-950 border-white' : 'bg-[#141C2B] text-slate-300 border-slate-800'}`}>{label}</button>
              ))}
              <span className="h-5 w-px bg-slate-800 mx-0.5 shrink-0" />
              {VN_DAY_OPTIONS.map((d) => {
                const active = timeMode === 'DAY' && selectedDay === d.value;
                return <button key={d.value} type="button" onClick={() => { if (active) setTimeMode('ALL'); else { setSelectedDay(d.value); setTimeMode('DAY'); } }} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 border cursor-pointer ${active ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-orange-400' : 'bg-[#141C2B] text-slate-300 border-slate-800'}`}>{d.short}</button>;
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center w-full lg:w-auto">
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {(['ALL', 'COMPETITIVE', 'FUN_GAME', 'TRAINING'] as const).map((id) => (
                    <button key={id} type="button" onClick={() => setPlayStyle(id)} className={`px-1.5 sm:px-2.5 py-1 md:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border cursor-pointer ${playStyle === id ? (id === 'ALL' ? 'bg-slate-200 text-slate-950 border-white' : PLAY_STYLE_META[id].activeClass) : 'bg-[#141C2B] text-slate-300 border-slate-800'}`}>{id === 'ALL' ? 'Tất cả gu' : `${PLAY_STYLE_META[id].emoji} ${PLAY_STYLE_META[id].shortLabel}`}</button>
                  ))}
                </div>
                <span className="hidden md:block h-5 w-px bg-slate-800 mx-0.5 shrink-0" />
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {([['ALL', 'Tất cả'], ['MALE_ONLY', '♂️ Chỉ Nam'], ['MIXED', '⚥ Nam & Nữ'], ['FEMALE_ONLY', '♀️ Chỉ Nữ']] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setGenderFilter(id)} className={`px-1.5 sm:px-2.5 py-1 md:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border cursor-pointer ${genderFilter === id ? 'bg-purple-600 text-white border-purple-400' : 'bg-[#141C2B] text-slate-300 border-slate-800'}`}>{label}</button>
                  ))}
                </div>
                <span className="hidden md:block h-5 w-px bg-slate-800 mx-0.5 shrink-0" />
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {([['ALL', 'Mọi loại sân'], ['COMMERCIAL', 'Sân dịch vụ'], ['FREE_PUBLIC', 'Sân Free']] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setVenueType(id)} className={`px-1.5 sm:px-2.5 py-1 md:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border cursor-pointer ${venueType === id ? 'bg-sky-600 text-white border-sky-400' : 'bg-[#141C2B] text-slate-300 border-slate-800'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="flex lg:hidden bg-[#141C2B] border border-slate-800 rounded-xl p-0.5 shrink-0">
                {([['MAP', MapIcon, 'Bản đồ'], ['LIST', List, `Danh sách (${entries.length})`]] as const).map(([id, Icon, label]) => (
                  <button key={id} type="button" onClick={() => setMobileView(id)} className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${mobileView === id ? 'bg-orange-500 text-white' : 'text-slate-400'}`}><Icon className="w-3.5 h-3.5" />{label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3"><div className="p-3 rounded-xl bg-red-950/60 border border-red-700 text-xs text-red-200">{error}</div></div>}

      <section className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-15.5rem)] lg:min-h-[580px] rounded-2xl lg:rounded-3xl overflow-hidden border border-slate-800 bg-[#0F1420] relative">
          <div className={`relative isolate z-0 ${mobileView === 'LIST' ? 'hidden lg:block lg:flex-1 lg:h-full' : 'block w-full h-[64vh] min-h-[430px] lg:flex-1 lg:h-full'}`}>
            <HanoiLeafletMap items={mapItems} selectedVenueId={selectedId} onSelectVenue={onSelectVenue} focusTrigger={focusTick} isVisible={mobileView === 'MAP'} userLocation={userGeo} userFocusTrigger={geoTick} viewportTarget={viewportTarget} />
            <div className="absolute top-3 left-3 z-[400] pointer-events-none px-2.5 py-1.5 rounded-xl bg-[#0B0F19]/90 backdrop-blur border border-slate-700 text-[10px] font-bold text-slate-200 flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-600 to-orange-500" />Có lịch</span>
              <span className="inline-flex items-center gap-1 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 opacity-50" />Không lịch</span>
              <span className="inline-flex items-center gap-1 text-red-300"><span className="w-2.5 h-2.5 rounded-full bg-red-600" />Tạm nghỉ</span>
            </div>
          </div>
          {mobileView === 'LIST' && <div className="lg:hidden min-h-[60vh]">{renderList()}</div>}
          <aside className="hidden lg:flex lg:flex-col w-[380px] xl:w-[420px] shrink-0 border-l border-slate-800 h-full overflow-hidden">{selected ? renderDrawer(selected, false) : renderList()}</aside>
        </div>
      </section>

      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-10">
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/35">
              <Info className="w-3.5 h-3.5" />HƯỚNG DẪN SỬ DỤNG
            </span>
            <h2 className="font-heading font-black text-lg sm:text-xl lg:text-2xl text-white">Cách Tìm Sân &amp; Xin Ghép Kèo Nhanh Chóng</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 1</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Chọn Khu Vực &amp; Định Vị (📍 Gần tôi)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Chọn <strong className="text-white">Thành phố</strong> (Hà Nội, Đà Nẵng, TP.HCM), bấm <strong className="text-white">🇻🇳 Toàn Việt Nam</strong>, hoặc bấm <strong className="text-blue-300">📍 Gần tôi</strong> để bản đồ tự động đo khoảng cách (km) và xếp ưu tiên các sân gần bạn nhất.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 2</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Lọc Đúng Thứ, Gu Chơi &amp; Giới Tính</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Chọn <strong className="text-white">Thứ trong tuần (T2 → CN)</strong>, lọc theo <strong className="text-white">Gu chơi</strong> (🔥 Đấu căng, 😊 Chơi vui, 🎯 Tập luyện), <strong className="text-white">Đối tượng</strong> (♂️ Chỉ Nam, ⚥ Nam &amp; Nữ, ♀️ Chỉ Nữ) và <strong className="text-white">Loại sân</strong> (Sân dịch vụ, Sân miễn phí).
              </p>
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 3</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Xem Slot Trống &amp; Vị Trí Đang Thiếu</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bấm vào điểm ghim sân sáng màu để xem danh sách các đội đang hoạt động, kiểm tra số suất (slot) còn trống theo đúng ngày đã chọn và các vị trí đang cần tuyển (<strong className="text-white">OH</strong> Chủ công, <strong className="text-white">MB</strong> Phụ công, <strong className="text-white">OP</strong> Đối chuyền, <strong className="text-white">S</strong> Chuyền hai, <strong className="text-white">L</strong> Libero).
              </p>
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-2">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-[11px]">Bước 4</span>
              <h3 className="font-heading font-extrabold text-sm text-white leading-snug">Nhắn Zalo Đội Trưởng Hoặc Thuê Sân</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bấm <strong className="text-sky-300">Zalo</strong> hoặc <strong className="text-emerald-300">Gọi</strong> trực tiếp cho đội trưởng của đội phù hợp để xin ghép buổi. Nếu bạn cần <strong className="text-white">thuê nguyên sân dịch vụ</strong> cho đội riêng, liên hệ ngay hotline điều phối{' '}
                <a href="tel:0768299329" className="font-black text-amber-300 hover:text-orange-300 underline decoration-amber-400/60 underline-offset-2 whitespace-nowrap">0768299329</a>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {([
              ['🟠 Ghim Sáng / ● Đang đánh', 'text-orange-300', 'Sân có lịch đội hoạt động trong ngày đang xem hoặc đang diễn ra trực tiếp.'],
              ['⚫ Ghim Xám Mờ', 'text-slate-300', 'Sân chưa có lịch đội sinh hoạt vào thứ đang lọc (bấm vào vẫn xem được lịch các ngày khác trong tuần).'],
              ['🔴 Tạm nghỉ / Báo nghỉ buổi', 'text-red-300', 'Sân tạm đóng cửa dịp lễ Tết hoặc đội tạm nghỉ riêng buổi hôm đó (hệ thống tự động mở lại ở các buổi tiếp theo).'],
            ] as const).map(([title, color, desc]) => (
              <div key={title} className="bg-[#0B0F19]/60 border border-white/10 rounded-xl px-3.5 py-3 space-y-1">
                <p className={`text-xs font-extrabold ${color}`}>{title}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {activeVenue && (
        <div className="lg:hidden fixed inset-0 z-[100]" role="dialog" aria-modal="true">
          <button type="button" aria-label="Đóng" onClick={closeSheet} className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${isSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
          <div className={`fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-3xl overflow-hidden border-t border-slate-700 bg-[#0F1420] flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto my-2 shrink-0" />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{renderDrawer(activeVenue, true)}</div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] max-w-[92vw] px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/50 text-xs font-semibold text-emerald-200 shadow-2xl flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /><span>{toast}</span></div>}
    </div>
  );
};

export default CourtMapPage;
