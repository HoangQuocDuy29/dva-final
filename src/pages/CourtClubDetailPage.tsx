import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Navigation, Clock, Tag, Wallet,
  CalendarDays, Timer, Layers, Image as ImageIcon, Check, X, Info, Sparkles, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { venueService } from '../services/api';
import type { RevealedSessionContact, VenueClubDetailResponse } from '../types';
import {
  PLAY_STYLE_META, parsePlayStyles, GENDER_RULE_META, RECRUITMENT_META, VENUE_TYPE_META, getVietnamNow, getSessionRealtimeInfo, isSessionCancelledOnDate,
  isVenueClosedNow, formatClosedUntilDate, formatDaysOfWeek, buildGoogleMapsUrl, getClubInitials,
} from '../utils/venueSchedule';
import { optimizeCloudinaryLogoUrl, optimizeCloudinaryUrl } from '../utils/cloudinary';
import { SessionStatusBlock } from '../components/court-map/SessionStatusBlock';
import { ContactRevealModal, type ContactRevealTarget } from '../components/court-map/ContactRevealModal';
import {
  SessionContactRow,
  readRevealedContactCache,
  writeRevealedContactCache,
} from '../components/court-map/SessionContactRow';

export const CourtClubDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [club, setClub] = useState<VenueClubDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowVn, setNowVn] = useState(() => getVietnamNow());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revealedBySession, setRevealedBySession] = useState<Record<string, RevealedSessionContact>>({});
  const [visibleBySession, setVisibleBySession] = useState<Record<string, boolean>>({});
  const [revealTarget, setRevealTarget] = useState<ContactRevealTarget | null>(null);

  const gallery = (club?.galleryUrls || []).filter(Boolean).slice(0, 5);
  const stepLightbox = useCallback(
    (delta: number) => setLightboxIndex((i) => (i === null || gallery.length < 2 ? i : (i + delta + gallery.length) % gallery.length)),
    [gallery.length]
  );

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((p) => (p === m ? null : p)), 3500);
  }, []);

  useEffect(() => { const t = setInterval(() => setNowVn(getVietnamNow()), 30_000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, stepLightbox]);

  useEffect(() => {
    if (!slug) { setError('Không tìm thấy đội bóng.'); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    venueService.getClubBySlug(slug)
      .then((res) => { if (!cancelled) setClub(res); })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Không thể tải hồ sơ CLB.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const handleRevealSuccess = useCallback((contact: RevealedSessionContact) => {
    writeRevealedContactCache(contact);
    setRevealedBySession((prev) => ({ ...prev, [contact.sessionId]: contact }));
    setVisibleBySession((prev) => ({ ...prev, [contact.sessionId]: true }));
  }, []);

  const handleToggleVisibility = useCallback((sessionId: string, visible: boolean) => {
    setVisibleBySession((prev) => ({ ...prev, [sessionId]: visible }));
  }, []);

  if (loading) return <div className="min-h-[60vh] bg-[#0B0F19] flex items-center justify-center"><div className="w-9 h-9 rounded-full border-2 border-slate-800 border-t-orange-500 animate-spin" /></div>;
  if (error || !club) return (
    <div className="min-h-[60vh] bg-[#0B0F19] text-white flex flex-col items-center justify-center px-4 text-center space-y-4">
      <Info className="w-10 h-10 text-red-400" /><h1 className="font-heading font-black text-xl">Không tìm thấy hồ sơ CLB</h1><p className="text-xs text-slate-400">{error}</p>
      <Link to="/services/court-map" className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-xs font-bold inline-flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" />Quay lại Bản đồ sân</Link>
    </div>
  );

  const styles = parsePlayStyles(club.playStyle).map((k) => PLAY_STYLE_META[k]);
  const vt = VENUE_TYPE_META[club.venue.venueType] || VENUE_TYPE_META.COMMERCIAL;
  const closed = isVenueClosedNow(club.venue, nowVn.nowMs);
  const reopenStr = formatClosedUntilDate(club.venue.closedUntil);
  const heroCover = club.coverUrl || club.venue.coverUrl || club.venue.imageUrl;
  const primarySession = club.sessions[0] || null;
  const primaryRevealed = primarySession ? (revealedBySession[primarySession.id] || readRevealedContactCache(primarySession.id)) : null;
  const primaryVisible = primarySession ? Boolean(visibleBySession[primarySession.id] ?? false) : false;

  return (
    <div className="min-h-screen bg-transparent text-white pb-16">
      <div className="border-b border-white/10 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs">
          <Link to="/services/court-map" className="inline-flex items-center gap-1.5 font-bold text-slate-300 hover:text-orange-400"><ArrowLeft className="w-4 h-4" />Quay lại Bản đồ sân Hà Nội</Link>
          <span className="text-slate-400 hidden sm:inline">Hà Nội: <strong className="text-white">{nowVn.timeLabel}</strong> ({nowVn.dayLabel})</span>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {closed && (
          <div className="p-4 rounded-2xl bg-red-950/75 border border-red-500/60 text-xs text-red-100 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-red-200 uppercase">⚠️ SÂN TẠM NGHỈ: {club.venue.closureReason || 'Tạm đóng cửa nghỉ lễ / bảo trì'}</p>
              {reopenStr && <p className="text-red-300 mt-0.5">Dự kiến mở lại: <strong>{reopenStr}</strong></p>}
            </div>
          </div>
        )}

        <div className="dva-glass-panel rounded-3xl overflow-hidden shadow-2xl">
          <div className="relative h-48 sm:h-64 bg-slate-900/70">
            {heroCover && <img src={optimizeCloudinaryUrl(heroCover, 'detail')} alt={club.name} className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12]/90 via-[#0B0D12]/35 to-transparent" />
            {club.venue.isDvaOfficial && <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-gradient-to-r from-red-600 to-orange-500 text-white"><Sparkles className="w-3.5 h-3.5" />DVA Official</span>}
          </div>

          <div className="px-5 sm:px-8 pb-6 -mt-12 relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
                <div className="w-24 h-24 rounded-3xl overflow-hidden bg-[#0B0D12] border-4 border-white/15 shadow-2xl flex items-center justify-center shrink-0">
                  {club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 160)} alt={club.name} className="w-full h-full object-cover" /> : <span className="font-heading font-black text-3xl text-orange-400">{getClubInitials(club.name)}</span>}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap gap-2">
                    {styles.map((st) => <span key={st.shortLabel} className={`px-3 py-0.5 rounded-full text-xs font-extrabold ${st.badgeClass}`}>{st.emoji} {st.label}</span>)}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${club.feeType === 'FREE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/45' : 'bg-amber-500/15 text-amber-300 border-amber-500/35'}`}>
                      <Wallet className="w-3.5 h-3.5" />{club.feeType === 'FREE' ? 'FREE · Miễn phí' : club.feeAmount || 'Thu phí'}
                    </span>
                  </div>
                  <h1 className="font-heading font-black text-2xl sm:text-3xl">{club.name}</h1>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-orange-400 shrink-0" />{club.venue.name} · {club.venue.address}</p>
                </div>
              </div>
            </div>
            {club.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
                {club.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 dva-glass-pill text-xs font-semibold text-slate-200"><Tag className="w-3 h-3 text-orange-400" />{t}</span>)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="dva-glass-panel rounded-3xl p-5 space-y-2">
              <h2 className="font-heading font-black text-base flex items-center gap-2"><Info className="w-4 h-4 text-orange-400" />Giới Thiệu &amp; Phong Cách Chơi</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{club.description || `${club.name} sinh hoạt định kỳ tại ${club.venue.name}.`}</p>
            </div>

            <div className={`dva-glass-panel rounded-3xl p-5 space-y-3 ${closed ? 'opacity-50' : ''}`}>
              <h2 className="font-heading font-black text-base flex items-center gap-2"><CalendarDays className="w-4 h-4 text-orange-400" />Lịch Hoạt Động Trọn Tuần ({club.sessions.length} ca)</h2>
              {club.sessions.map((s) => {
                const rt = getSessionRealtimeInfo(s, nowVn, closed);
                const rec = RECRUITMENT_META[s.recruitmentStatus] || RECRUITMENT_META.CHECK_CAPTAIN;
                const cancelled = !closed && isSessionCancelledOnDate(s, nowVn.dateStr);
                const revealed = revealedBySession[s.id] || readRevealedContactCache(s.id);
                const isContactVisible = Boolean(visibleBySession[s.id] ?? false);

                return (
                  <div key={s.id} className={`p-3.5 rounded-2xl border space-y-2.5 ${cancelled ? 'opacity-50 bg-white/[0.03] border-amber-500/40' : rt.state === 'LIVE' ? 'opacity-80 dva-glass-card border-emerald-500/40' : rt.state === 'UPCOMING' ? 'bg-gradient-to-r from-orange-500/15 to-white/[0.04] backdrop-blur-xl border-orange-400/75' : 'dva-glass-card rounded-2xl'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 font-extrabold">{formatDaysOfWeek(s.daysOfWeek)}</span>
                        <span className="inline-flex items-center gap-1 font-bold text-white"><Clock className="w-3.5 h-3.5 text-orange-400" />{s.startTime} – {s.endTime}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {styles.map((st) => <span key={st.shortLabel} className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${st.badgeClass}`}>{st.emoji} {st.shortLabel}</span>)}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${(GENDER_RULE_META[s.genderRule || 'MIXED'] || GENDER_RULE_META.MIXED).badgeClass}`}>{(GENDER_RULE_META[s.genderRule || 'MIXED'] || GENDER_RULE_META.MIXED).shortLabel}</span>
                        {s.skillRankLabel && (
                          <Link
                            to="/information/skill-levels"
                            title="Xem bảng phân cấp trình độ chuẩn USAV"
                            className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-950/85 hover:bg-blue-900 text-blue-200 border border-blue-500/50 transition-colors"
                          >
                            🇺🇸 USAV: {s.skillRankLabel}
                          </Link>
                        )}
                        {!closed && !cancelled && rt.state === 'LIVE' && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/45">● ĐANG ĐÁNH</span>}
                        {!closed && !cancelled && rt.state === 'UPCOMING' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/25 text-amber-200 border border-orange-400/60"><Timer className="w-3 h-3" />⏳ {rt.countdownText}</span>}
                        {!cancelled && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rec.badgeClass}`}>{rec.label}</span>}
                      </div>
                    </div>
                    <SessionStatusBlock session={s} venueClosed={closed} targetDate={nowVn.dateStr} todayDate={nowVn.dateStr} />
                    <div className="flex items-center gap-1.5 text-xs">
                      {s.subCourts.map((sc) => <span key={sc} className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/35 text-sky-300 font-bold text-[10px]">{sc}</span>)}
                      <span className="text-slate-400">tại {club.venue.name}</span>
                    </div>
                    <SessionContactRow
                      sessionId={s.id}
                      club={club}
                      venue={club.venue}
                      session={s}
                      revealedContact={revealed}
                      isVisible={isContactVisible}
                      onRevealSuccess={handleRevealSuccess}
                      onToggleVisibility={handleToggleVisibility}
                      onRequireVerify={setRevealTarget}
                      onNotify={showToast}
                    />
                  </div>
                );
              })}
            </div>

            <div className="dva-glass-panel rounded-3xl p-5 space-y-3">
              <h2 className="font-heading font-black text-base flex items-center gap-2"><ImageIcon className="w-4 h-4 text-orange-400" />Thư Viện Ảnh Sinh Hoạt ({gallery.length})</h2>
              {gallery.length === 0 ? <p className="text-xs text-slate-400">Chưa có ảnh sinh hoạt.</p> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((u, i) => (
                    <button key={`${u}-${i}`} type="button" onClick={() => setLightboxIndex(i)} className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 hover:border-orange-500/60 cursor-pointer">
                      <img src={optimizeCloudinaryUrl(u, 'card')} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="dva-glass-card rounded-3xl p-5 space-y-3">
              <p className="text-[10px] font-black uppercase text-orange-400">Liên Hệ Đội Trưởng</p>
              <div>
                <h3 className="font-heading font-black text-base">{club.captainName}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Bấm biểu tượng con mắt để xác thực &amp; hiện SĐT/Zalo</p>
              </div>
              {primarySession ? (
                <SessionContactRow
                  sessionId={primarySession.id}
                  club={club}
                  venue={club.venue}
                  session={primarySession}
                  revealedContact={primaryRevealed}
                  isVisible={primaryVisible}
                  onRevealSuccess={handleRevealSuccess}
                  onToggleVisibility={handleToggleVisibility}
                  onRequireVerify={setRevealTarget}
                  onNotify={showToast}
                />
              ) : (
                <p className="text-xs text-slate-400 font-mono">{club.captainPhone}</p>
              )}
            </div>

            <div className="dva-glass-card rounded-3xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-400">Địa Điểm</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${vt.badgeClass}`}>{vt.shortLabel}</span></div>
              <h3 className="font-heading font-black text-base">{club.venue.name}</h3>
              <p className="text-slate-300">{club.venue.address}</p>
              <div className="flex flex-wrap gap-1.5"><span className="px-2.5 py-0.5 dva-glass-pill">Quận {club.venue.district}</span><span className="inline-flex items-center gap-1 px-2.5 py-0.5 dva-glass-pill text-sky-300"><Layers className="w-3 h-3" />{club.venue.surfaceType}</span></div>
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-200 leading-relaxed">
                {club.venue.venueType === 'FREE_PUBLIC' ? <div className="flex justify-between"><span className="text-slate-400">Loại sân:</span><strong className="text-emerald-300">Sân Miễn Phí</strong></div> : <>Nếu bạn muốn thuê sân, hãy liên hệ <a href="tel:0768299329" className="font-black text-amber-300 hover:text-orange-300 underline decoration-amber-400/60 underline-offset-2 whitespace-nowrap">0768299329</a></>}
              </div>
              <a href={buildGoogleMapsUrl(club.venue)} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold flex items-center justify-center gap-1.5"><Navigation className="w-4 h-4" />Chỉ đường Google Maps</a>
            </div>
          </aside>
        </div>
      </section>

      <ContactRevealModal
        target={revealTarget}
        onClose={() => setRevealTarget(null)}
        onRevealed={handleRevealSuccess}
      />

      {lightboxIndex !== null && gallery[lightboxIndex] && (
        <div className="fixed inset-0 z-[120] bg-black/92 flex items-center justify-center p-4 select-none" role="dialog" aria-modal="true" onClick={() => setLightboxIndex(null)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={(e) => { const s = touchStartX.current, x = e.changedTouches[0]?.clientX; touchStartX.current = null; if (s !== null && x !== undefined && Math.abs(x - s) > 40) stepLightbox(x < s ? 1 : -1); }}
        >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-bold text-white">{lightboxIndex + 1} / {gallery.length}</span>
            <button type="button" aria-label="Đóng" onClick={() => setLightboxIndex(null)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          {gallery.length > 1 && (<>
            <button type="button" aria-label="Ảnh trước" onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }} className="absolute left-3 sm:left-6 z-10 w-11 h-11 rounded-full bg-slate-900/85 hover:bg-orange-500 border border-white/20 text-white flex items-center justify-center shadow-xl cursor-pointer transition-colors"><ChevronLeft className="w-6 h-6" /></button>
            <button type="button" aria-label="Ảnh tiếp theo" onClick={(e) => { e.stopPropagation(); stepLightbox(1); }} className="absolute right-3 sm:right-6 z-10 w-11 h-11 rounded-full bg-slate-900/85 hover:bg-orange-500 border border-white/20 text-white flex items-center justify-center shadow-xl cursor-pointer transition-colors"><ChevronRight className="w-6 h-6" /></button>
          </>)}
          <img src={optimizeCloudinaryUrl(gallery[lightboxIndex], 'zoom')} alt="" className="max-w-full max-h-[88vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[990] max-w-[92vw] px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/50 text-xs font-semibold text-emerald-200 shadow-2xl flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /><span>{toast}</span></div>}
    </div>
  );
};

export default CourtClubDetailPage;
