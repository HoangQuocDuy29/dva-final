import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin, Plus, Pencil, Trash2, Users, Clock, ExternalLink, Search, X, Upload, Loader2, ChevronDown, ChevronRight,
  Eye, EyeOff, Check, Layers, CalendarClock, AlertTriangle, Copy, Mail, Phone, Power, KeyRound, Minus,
} from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { userService, venueService } from '../../../services/api';
import { optimizeCloudinaryLogoUrl, optimizeCloudinaryUrl, uploadToCloudinary } from '../../../utils/cloudinary';
import type { CourtClubProfile, SessionDailyOverridesMap, User, VenueCapacityMode, VenueFeeType, VenueGenderRule, VenuePlayStyle, VenueRecruitmentStatus, VenueSessionSlot, VenueType, VolleyballPosition, VolleyballVenue } from '../../../types';
import {
  VN_DAY_OPTIONS, PLAY_STYLE_OPTIONS, PLAY_STYLE_META, parsePlayStyles, GENDER_RULE_META, suggestGenderRule, RECRUITMENT_META, VENUE_TYPE_META, SESSION_POSITION_OPTIONS, HANOI_DISTRICTS, VIETNAM_CITIES, SURFACE_TYPES,
  getSubCourtNames, formatDaysOfWeek, formatShortVnDate, getMonthlyQuotaStatus, getVietnamNow, getSessionDailyState, getUpcomingSessionDates, isSessionCancelledOnDate, buildGoogleMapsUrl, getClubInitials, findClientSessionConflicts, isVenueClosedNow,
} from '../../../utils/venueSchedule';
import { SessionStatusBlock } from '../../../components/court-map/SessionStatusBlock';
import { RECOMMENDED_SKILL_RANK_PRESETS } from '../../../shared/skillRanks';
import { SpatialKpiRow, SpatialKpiItem } from '../components/spatial/SpatialKpiRow';
import { SpatialBentoGrid, SpatialBentoItem, BentoFilterKey } from '../components/spatial/SpatialBentoGrid';

type ModalState =
  | { kind: 'venue'; item?: VolleyballVenue }
  | { kind: 'club'; venue: VolleyballVenue; item?: CourtClubProfile }
  | { kind: 'session'; venue: VolleyballVenue; item?: VenueSessionSlot }
  | { kind: 'captain'; club?: CourtClubProfile; venue?: VolleyballVenue }
  | null;

const INP = 'w-full px-3 py-2 rounded-xl bg-[#0B0F19] border border-slate-700 text-xs text-white focus:outline-none focus:border-orange-500';
const F: React.FC<{ label: string; full?: boolean; tone?: string; children: React.ReactNode }> = ({ label, full, tone = 'text-slate-300', children }) => (
  <div className={full ? 'sm:col-span-2' : ''}><label className={`block font-bold mb-1 ${tone}`}>{label}</label>{children}</div>
);

export const VenuesTab: React.FC = () => {
  const { isSuperAdmin, isCaptain, activeModule, setActiveModule, data: { venuesList }, setData: { setVenuesList }, notify } = useAdminDashboard();
  const [subTab, setSubTab] = useState<'VENUES' | 'CAPTAINS'>('VENUES');
  const [showBentoOverview, setShowBentoOverview] = useState(true);
  const detailWorkspaceRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [expandedClubs, setExpandedClubs] = useState<Record<string, boolean>>({});
  const [selectedDateBySession, setSelectedDateBySession] = useState<Record<string, string>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [closureDrafts, setClosureDrafts] = useState<Record<string, { reason: string; until: string }>>({});
  const [cancelReasonDrafts, setCancelReasonDrafts] = useState<Record<string, string>>({});
  const [captainUsers, setCaptainUsers] = useState<User[]>([]);

  const [nowVn, setNowVn] = useState(() => getVietnamNow());
  useEffect(() => { const t = setInterval(() => setNowVn(getVietnamNow()), 30_000); return () => clearInterval(t); }, []);
  const reload = async () => setVenuesList(await venueService.getAdminVenues());
  const loadCaptainUsers = async () => { if (isSuperAdmin) try { setCaptainUsers((await userService.getUsers()).filter((u) => u.role === 'CAPTAIN')); } catch { /* ignore */ } };
  useEffect(() => { if (isSuperAdmin) void loadCaptainUsers(); }, [isSuperAdmin]);

  const set = (patch: Record<string, any>) => setForm((p) => ({ ...p, ...patch }));
  const toggleArr = (k: string, val: any) => setForm((p) => ({ ...p, [k]: (p[k] || []).includes(val) ? p[k].filter((x: any) => x !== val) : [...(p[k] || []), val] }));

  const allClubs = useMemo(() => venuesList.flatMap((venue) => (venue.clubs || []).map((club) => ({ venue, club, sessions: (venue.sessions || []).filter((s) => s.clubId === club.id) }))), [venuesList]);
  const q = query.trim().toLowerCase();
  const filteredVenues = useMemo(() => venuesList.filter((v) =>
    (cityFilter === 'ALL' || (v.city || 'Hà Nội') === cityFilter) &&
    (!q || [v.name, v.address, v.district, ...(v.clubs || []).flatMap((c) => [c.name, c.captainName, c.captainPhone, c.captainEmail || ''])].some((s) => s.toLowerCase().includes(q)))
  ), [venuesList, cityFilter, q]);

  const filteredCaptains = useMemo(() => !q ? allClubs : allClubs.filter(({ venue, club }) =>
    [club.captainName, club.captainPhone, club.captainEmail || '', club.name, venue.name].some((s) => s.toLowerCase().includes(q))
  ), [allClubs, q]);

  const selectedVenue = useMemo(() => filteredVenues.find((v) => v.id === selectedVenueId) || filteredVenues[0] || null, [filteredVenues, selectedVenueId]);

  useEffect(() => {
    if (!selectedVenue) return;
    setExpandedClubs((prev) => {
      const next = { ...prev };
      (selectedVenue.clubs || []).forEach((c, idx) => { if (next[c.id] === undefined) next[c.id] = idx < 2; });
      return next;
    });
  }, [selectedVenue?.id, selectedVenue?.clubs?.length]);

  const liveConflicts = useMemo(() =>
    modal?.kind === 'session' ? findClientSessionConflicts(modal.venue.sessions || [], { daysOfWeek: form.daysOfWeek || [], startTime: form.startTime || '', endTime: form.endTime || '', subCourts: form.subCourts || [] }, modal.item?.id) : [],
  [modal, form.daysOfWeek, form.startTime, form.endTime, form.subCourts]);

  const quickPatchSession = async (venueId: string, s: VenueSessionSlot, patch: Record<string, any>, msg?: string) => {
    setBusySlotId(s.id);
    try { await venueService.updateSession(venueId, s.id, patch); await reload(); if (msg) notify(msg, 2200); }
    catch (e: any) { notify(e?.message || 'Lỗi cập nhật ca chơi.', 3500); }
    finally { setBusySlotId(null); }
  };

  const patchDailyOverride = (venueId: string, s: VenueSessionSlot, dateStr: string, patch: { currentPlayers?: number; neededPositions?: VolleyballPosition[] }, msg?: string) => {
    const curDaily = getSessionDailyState(s, dateStr);
    const nextMap: SessionDailyOverridesMap = { ...(s.dailyOverrides || {}), [dateStr]: { currentPlayers: patch.currentPlayers ?? curDaily.currentPlayers, neededPositions: patch.neededPositions ?? curDaily.neededPositions } };
    return quickPatchSession(venueId, s, { dailyOverrides: nextMap }, msg);
  };

  const toggleSessionDateOff = (venueId: string, s: VenueSessionSlot, dateStr: string, reason?: string) => {
    const cur = s.cancelledDates || [];
    const exists = cur.includes(dateStr);
    const next = exists ? cur.filter((d) => d !== dateStr) : [...cur, dateStr].sort();
    return quickPatchSession(venueId, s, { isCancelled: false, cancelledDates: next, ...(!exists && reason ? { cancelReason: reason } : {}) }, exists ? `Đã mở lại buổi ${formatShortVnDate(dateStr)}.` : `Đã báo nghỉ buổi ${formatShortVnDate(dateStr)}.`);
  };

  const buildClubForm = (venue: VolleyballVenue, c?: CourtClubProfile) => {
    const isFree = venue.venueType === 'FREE_PUBLIC';
    return {
      name: c?.name || '', slug: c?.slug || '', logoUrl: c?.logoUrl || '', coverUrl: c?.coverUrl || '', galleryUrls: [...(c?.galleryUrls || [])],
      captainName: c?.captainName || '', captainPhone: c?.captainPhone || '', captainZalo: c?.captainZalo || '', captainEmail: c?.captainEmail || '',
      captainUserId: c?.captainUserId || '', createCaptainAccount: false, newCaptainEmail: c?.captainEmail || '', newCaptainPassword: '',
      playStyles: parsePlayStyles(c?.playStyle), tagsInput: c ? (c.tags || []).join(', ') : 'Giao lưu, Tuyển vãng lai', description: c?.description || '',
      feeType: c?.feeType || (isFree ? 'FREE' : 'PAID'), feeAmount: c?.feeAmount ?? (isFree ? 'Miễn phí' : '70k/buổi'), isActive: c ? c.isActive !== false : true,
    };
  };

  useEffect(() => {
    if (isCaptain && activeModule === 'CAPTAIN_PROFILE' && allClubs[0]) {
      setForm(buildClubForm(allClubs[0].venue, allClubs[0].club));
    }
  }, [isCaptain, activeModule, allClubs[0]?.club?.id, allClubs[0]?.club?.updatedAt]);

  const openModal = (next: NonNullable<ModalState>, presetClubId?: string) => {
    if (next.kind === 'venue') {
      const v = next.item;
      setForm({
        name: v?.name || '', slug: v?.slug || '', address: v?.address || '', city: v?.city || 'Hà Nội', district: v?.district || 'Thanh Xuân',
        latitude: String(v?.latitude ?? 21.0005), longitude: String(v?.longitude ?? 105.8294), coords: v ? `${v.latitude}, ${v.longitude}` : '',
        surfaceType: v?.surfaceType || 'Sàn thảm PVC', subCourtsCount: v?.subCourtsCount ?? 2, venueType: v?.venueType || 'COMMERCIAL',
        rentalPriceInfo: v?.rentalPriceInfo ?? '550.000đ / giờ / sân', entryNote: v?.entryNote || '', coverUrl: v?.coverUrl || v?.imageUrl || '',
        isDvaOfficial: Boolean(v?.isDvaOfficial), isFeatured: Boolean(v?.isFeatured),
        isClosed: Boolean(v?.isClosed), closureReason: v?.closureReason || '', closedUntil: v?.closedUntil ? v.closedUntil.slice(0, 10) : '',
      });
    } else if (next.kind === 'club') {
      setForm(buildClubForm(next.venue, next.item));
    } else if (next.kind === 'session') {
      if (!next.venue.clubs?.length) return notify('Hãy tạo ít nhất 1 CLB tại sân này trước.');
      const s = next.item; const cid = s?.clubId || presetClubId || next.venue.clubs[0].id;
      setForm({
        clubId: cid, daysOfWeek: s ? [...s.daysOfWeek] : [1, 3, 5], startTime: s?.startTime || '19:00', endTime: s?.endTime || '21:30',
        subCourts: s ? [...s.subCourts] : [getSubCourtNames(next.venue.subCourtsCount)[0]], recruitmentStatus: s?.recruitmentStatus || 'CHECK_CAPTAIN',
        capacityMode: s?.capacityMode || 'UNLIMITED', maxPlayers: s?.maxPlayers ?? 14,
        genderRule: s?.genderRule || suggestGenderRule(next.venue.clubs.find((c) => c.id === cid)?.playStyle),
        skillRankLabel: s?.skillRankLabel || '', forceOverride: false,
      });
    } else {
      const targetClub = next.club || allClubs[0]?.club; const targetVenue = next.venue || allClubs[0]?.venue;
      if (!targetClub || !targetVenue) return notify('Hãy tạo ít nhất 1 CLB trước.');
      setForm({ clubKey: `${targetVenue.id}::${targetClub.id}`, captainName: targetClub.captainName, captainPhone: targetClub.captainPhone, captainZalo: targetClub.captainZalo || '', captainEmail: targetClub.captainEmail || '', captainUserId: targetClub.captainUserId || '', createCaptainAccount: false, newCaptainEmail: targetClub.captainEmail || '', newCaptainPassword: '' });
    }
    setModal(next);
  };

  const handleUpload = async (files: FileList | null, field: string, subModule: string, multiple = false) => {
    if (!files?.length) return;
    const maxGal = isCaptain ? 5 : 20;
    const room = multiple ? Math.max(0, maxGal - (form.galleryUrls || []).length) : 1;
    if (multiple && room <= 0) return notify(`Thư viện ảnh tối đa ${maxGal} ảnh.`);
    setUploading(field);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, multiple ? Math.min(6, room) : 1)) urls.push((await uploadToCloudinary(f, 'courts', subModule)).url);
      setForm((p) => multiple ? { ...p, galleryUrls: [...(p.galleryUrls || []), ...urls].slice(0, maxGal) } : { ...p, [field]: urls[0] });
      notify('Đã tải ảnh lên Cloudinary!');
    } catch (e: any) { notify(e?.message || 'Lỗi tải ảnh Cloudinary.'); }
    finally { setUploading(null); }
  };

  const saveClosure = async (v: VolleyballVenue, nextClosed: boolean) => {
    const d = closureDrafts[v.id] ?? { reason: v.closureReason || '', until: v.closedUntil ? v.closedUntil.slice(0, 10) : '' };
    setSaving(true);
    try {
      await venueService.updateVenue(v.id, { isClosed: nextClosed, closureReason: nextClosed ? (d.reason.trim() || 'Sân tạm nghỉ lễ / bảo trì') : null, closedUntil: nextClosed && d.until ? d.until : null });
      await reload(); notify(nextClosed ? `Đã bật TẠM NGHỈ "${v.name}".` : `Đã mở cửa "${v.name}".`);
    } catch (e: any) { notify(e?.message || 'Lỗi cập nhật trạng thái sân.'); }
    finally { setSaving(false); }
  };

  const saveClubPayload = async (venue: VolleyballVenue, existing?: CourtClubProfile) => {
    let captainUserId: string | null | undefined;
    if (isSuperAdmin) {
      if (form.createCaptainAccount) {
        const email = String(form.newCaptainEmail || '').trim().toLowerCase(); const password = String(form.newCaptainPassword || '');
        if (!email || password.length < 8) throw new Error('Nhập email hợp lệ và mật khẩu ≥ 8 ký tự để tạo tài khoản CAPTAIN.');
        const created = await userService.createUser({ email, password, name: form.captainName.trim() || email, role: 'CAPTAIN' });
        await loadCaptainUsers(); captainUserId = created.id;
      } else captainUserId = form.captainUserId ? String(form.captainUserId) : null;
    }
    const coverLocked = isCaptain && getMonthlyQuotaStatus(existing?.coverUpdatedAt).locked;
    const galLocked = isCaptain && getMonthlyQuotaStatus(existing?.galleryUpdatedAt).locked;
    const p: Record<string, any> = {
      name: form.name.trim(), logoUrl: form.logoUrl?.trim() || null, captainName: form.captainName.trim(),
      playStyle: parsePlayStyles(form.playStyles).join(','), tags: String(form.tagsInput || '').split(',').map((s) => s.trim()).filter(Boolean),
      description: form.description?.trim() || null, feeType: form.feeType as VenueFeeType,
      feeAmount: form.feeType === 'FREE' ? (form.feeAmount?.trim() || 'Miễn phí') : (form.feeAmount?.trim() || null),
      ...(!coverLocked ? { coverUrl: form.coverUrl?.trim() || null } : {}),
      ...(!galLocked ? { galleryUrls: (form.galleryUrls || []).slice(0, isCaptain ? 5 : 20) } : {}),
      ...(!isCaptain ? { ...(form.slug?.trim() ? { slug: form.slug.trim() } : {}), captainPhone: form.captainPhone.trim(), captainZalo: form.captainZalo?.trim() || null, captainEmail: form.captainEmail?.trim() || null, captainUserId, isActive: Boolean(form.isActive) } : {}),
    };
    if (existing) await venueService.updateClub(venue.id, existing.id, p); else await venueService.createClub(venue.id, p as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.kind === 'venue') {
        const p = {
          name: form.name.trim(), ...(form.slug?.trim() ? { slug: form.slug.trim() } : {}), address: form.address.trim(), city: (form.city || 'Hà Nội').trim(), district: form.district.trim(),
          latitude: Number(form.latitude), longitude: Number(form.longitude), surfaceType: form.surfaceType, subCourtsCount: Number(form.subCourtsCount) || 1,
          venueType: form.venueType as VenueType, rentalPriceInfo: form.rentalPriceInfo?.trim() || null, entryNote: form.entryNote?.trim() || null,
          coverUrl: form.coverUrl?.trim() || null, isDvaOfficial: Boolean(form.isDvaOfficial), isFeatured: Boolean(form.isFeatured),
          isClosed: Boolean(form.isClosed), closureReason: form.isClosed ? (form.closureReason?.trim() || null) : null, closedUntil: form.isClosed && form.closedUntil ? form.closedUntil : null,
        };
        const saved = modal.item ? await venueService.updateVenue(modal.item.id, p) : await venueService.createVenue(p);
        setSelectedVenueId(saved.id);
      } else if (modal.kind === 'club') {
        await saveClubPayload(modal.venue, modal.item);
      } else if (modal.kind === 'session') {
        const p = {
          clubId: form.clubId, daysOfWeek: form.daysOfWeek, startTime: form.startTime, endTime: form.endTime, subCourts: form.subCourts,
          recruitmentStatus: form.recruitmentStatus as VenueRecruitmentStatus, capacityMode: (form.capacityMode || 'UNLIMITED') as VenueCapacityMode,
          maxPlayers: Math.max(1, Number(form.maxPlayers) || 14), genderRule: (form.genderRule || 'MIXED') as VenueGenderRule,
          skillRankLabel: form.skillRankLabel?.trim() || null, forceOverride: Boolean(form.forceOverride),
        };
        if (modal.item) await venueService.updateSession(modal.venue.id, modal.item.id, p); else await venueService.createSession(modal.venue.id, p);
      } else {
        const [vId, cId] = String(form.clubKey || '').split('::');
        if (!vId || !cId) throw new Error('Vui lòng chọn CLB gắn với Đội trưởng.');
        let captainUserId: string | null = form.captainUserId ? String(form.captainUserId) : null;
        if (form.createCaptainAccount) {
          const email = String(form.newCaptainEmail || '').trim().toLowerCase(); const password = String(form.newCaptainPassword || '');
          if (!email || password.length < 8) throw new Error('Nhập email hợp lệ và mật khẩu ≥ 8 ký tự để tạo tài khoản CAPTAIN.');
          captainUserId = (await userService.createUser({ email, password, name: form.captainName.trim() || email, role: 'CAPTAIN' })).id;
          await loadCaptainUsers();
        }
        await venueService.updateClub(vId, cId, { captainName: form.captainName.trim(), captainPhone: form.captainPhone.trim(), captainZalo: form.captainZalo?.trim() || null, captainEmail: form.captainEmail?.trim() || null, captainUserId });
      }
      await reload(); notify('Đã lưu thành công!'); setModal(null);
    } catch (err: any) { notify(err?.message || 'Thao tác thất bại.', 4500); }
    finally { setSaving(false); }
  };

  // Shared 1-tap operational card per session (used identically in SUPERADMIN Accordion & CAPTAIN self-service)
  const renderSessionCard = (venue: VolleyballVenue, s: VenueSessionSlot) => {
    const upcomingDates = getUpcomingSessionDates(s.daysOfWeek, nowVn);
    const selDate = selectedDateBySession[s.id] || upcomingDates[0].dateStr;
    const busy = busySlotId === s.id;
    const isOff = isSessionCancelledOnDate(s, selDate);
    const limited = s.capacityMode === 'LIMITED_SLOTS';
    const max = Math.max(1, s.maxPlayers ?? 14);
    const daily = getSessionDailyState(s, selDate);
    const cur = daily.currentPlayers;
    const posList = daily.neededPositions;
    const rec = RECRUITMENT_META[s.recruitmentStatus] || RECRUITMENT_META.CHECK_CAPTAIN;
    const reasonDraft = cancelReasonDrafts[s.id] ?? (s.cancelReason || '');

    return (
      <div key={s.id} onClick={() => setActiveSessionId(s.id)} className={`rounded-2xl p-3.5 border space-y-2.5 ${isOff ? 'bg-[#121622] border-amber-500/50' : 'bg-[#0B0F19]/90 border-slate-800'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 font-black">{formatDaysOfWeek(s.daysOfWeek)}</span>
            <span className="font-mono font-bold text-white"><Clock className="w-3 h-3 inline mr-1 text-orange-400" />{s.startTime}–{s.endTime}</span>
            {s.subCourts.map((sc) => <span key={sc} className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/35 text-[10px] font-bold">{sc}</span>)}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${rec.badgeClass}`}>{rec.label}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <select
              aria-label="Hạng USAV khuyến nghị"
              disabled={busy}
              value={s.skillRankLabel || ''}
              onChange={(e) => void quickPatchSession(venue.id, s, { skillRankLabel: e.target.value || null })}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-blue-950/70 text-blue-200 border-blue-700/60 focus:outline-none cursor-pointer"
              title="Gắn hạng trình độ USAV khuyến nghị cho ca chơi"
            >
              <option value="" className="bg-[#0B0F19] text-slate-300">🇺🇸 Chưa gắn hạng</option>
              {RECOMMENDED_SKILL_RANK_PRESETS.map((preset) => (
                <option key={preset} value={preset} className="bg-[#0B0F19] text-white">🇺🇸 USAV: {preset}</option>
              ))}
            </select>
            {(['MALE_ONLY', 'MIXED', 'FEMALE_ONLY'] as const).map((g) => (
              <button key={g} type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { genderRule: g })} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${(s.genderRule || 'MIXED') === g ? 'bg-purple-600 text-white border-purple-400' : 'bg-[#111827] text-slate-400 border-slate-800'}`}>{GENDER_RULE_META[g].shortLabel}</button>
            ))}
            {isSuperAdmin && (
              <>
                <button type="button" onClick={() => openModal({ kind: 'session', venue, item: s })} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"><Pencil className="w-3 h-3" /></button>
                <button type="button" onClick={async () => { if (!confirm('Xóa ca này?')) return; await venueService.deleteSession(venue.id, s.id); await reload(); notify('Đã xóa ca.'); }} className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </>
            )}
          </div>
        </div>

        {/* Quick Date Selector Bar (T2 23/11, T4 25/11, T7 28/11...) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-0.5">Ngày:</span>
          {upcomingDates.map((d) => {
            const active = selDate === d.dateStr;
            const dOff = isSessionCancelledOnDate(s, d.dateStr);
            const dCur = getSessionDailyState(s, d.dateStr).currentPlayers;
            return (
              <button key={d.dateStr} type="button" onClick={() => setSelectedDateBySession((p) => ({ ...p, [s.id]: d.dateStr }))} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer inline-flex items-center gap-1 ${active ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-orange-400 shadow' : 'bg-[#111827] text-slate-300 border-slate-700 hover:border-slate-500'}`}>
                <span>{d.label}</span>
                {dOff ? <span className="text-[9px] text-amber-300">⚠️</span> : (limited && dCur > 0 && <span className={`text-[9px] px-1 rounded ${active ? 'bg-black/25' : 'bg-sky-500/20 text-sky-300'}`}>{dCur}</span>)}
              </button>
            );
          })}
          <input type="date" aria-label="Chọn ngày khác" value={selDate} onChange={(e) => { if (e.target.value) setSelectedDateBySession((p) => ({ ...p, [s.id]: e.target.value })); }} className="px-2 py-1 rounded-lg bg-[#111827] border border-slate-700 text-[11px] text-slate-200 ml-auto" />
        </div>

        {/* 1-Tap Controls for Selected Date: Capacity, -/+ Players, OH-MB-OP-S-L, Off Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { capacityMode: limited ? 'UNLIMITED' : 'LIMITED_SLOTS' })} className="px-2.5 py-1.5 rounded-xl bg-[#161F30] border border-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer">
              {limited ? 'Giới hạn slot' : '∞ Tự do'}
            </button>
            {limited && (
              <div className="inline-flex items-center gap-1.5 bg-[#111827] border border-slate-700 rounded-xl px-2 py-1">
                <button type="button" disabled={busy || cur <= 0} onClick={() => void patchDailyOverride(venue.id, s, selDate, { currentPlayers: Math.max(0, cur - 1) })} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center justify-center cursor-pointer disabled:opacity-40"><Minus className="w-3.5 h-3.5" /></button>
                <span className="min-w-12 text-center font-mono font-black text-xs text-white tabular-nums">{cur} / {max}</span>
                <button type="button" disabled={busy} onClick={() => void patchDailyOverride(venue.id, s, selDate, { currentPlayers: cur + 1 })} className="w-7 h-7 rounded-lg bg-sky-600 hover:bg-sky-500 text-white inline-flex items-center justify-center cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                <span className="text-[10px] font-bold text-emerald-300 pl-1">Còn {Math.max(0, max - cur)}</span>
              </div>
            )}
          </div>
          <button type="button" disabled={busy} onClick={() => void toggleSessionDateOff(venue.id, s, selDate, reasonDraft.trim() || `Đội nghỉ buổi ${formatShortVnDate(selDate)}`)} className={`px-3 py-1.5 rounded-xl text-[11px] font-black border inline-flex items-center gap-1.5 cursor-pointer ${isOff ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'}`}>
            <Power className="w-3.5 h-3.5" />{isOff ? `⚠️ Nghỉ ${formatShortVnDate(selDate)} (Mở lại)` : `Nghỉ buổi ${formatShortVnDate(selDate)}`}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400">Thiếu vị trí ({formatShortVnDate(selDate)}):</span>
          {SESSION_POSITION_OPTIONS.map((p) => {
            const on = posList.includes(p.code);
            return (
              <button key={p.code} type="button" disabled={busy} onClick={() => void patchDailyOverride(venue.id, s, selDate, { neededPositions: on ? posList.filter((x) => x !== p.code) : [...posList, p.code] })} className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${on ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-orange-400 shadow' : 'bg-[#111827] text-slate-400 border-slate-700 hover:text-white'}`}>
                {p.code}
              </button>
            );
          })}
        </div>

        {isOff && (
          <div className="flex gap-2">
            <input value={reasonDraft} onChange={(e) => setCancelReasonDrafts((p) => ({ ...p, [s.id]: e.target.value }))} placeholder="Lý do nghỉ (VD: Thiếu quân / mưa bão...)" className={INP} />
            <button type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { cancelReason: reasonDraft.trim() || null }, 'Đã lưu lý do nghỉ.')} className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold shrink-0 cursor-pointer">Lưu</button>
          </div>
        )}
      </div>
    );
  };

  const renderCaptainAccountSection = (currentClubId?: string) => {
    if (!isSuperAdmin) return null;
    const assignedByUser = new Map(allClubs.filter((r) => r.club.captainUserId && r.club.id !== currentClubId).map((r) => [r.club.captainUserId!, r.club.name]));
    return (
      <div className="sm:col-span-2 p-3 rounded-2xl bg-cyan-950/25 border border-cyan-500/35 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-cyan-300 inline-flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" />Tài khoản CAPTAIN tự quản lý (Tùy chọn)</span>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 cursor-pointer">
            <input type="checkbox" checked={Boolean(form.createCaptainAccount)} onChange={(e) => set({ createCaptainAccount: e.target.checked, ...(e.target.checked ? { newCaptainEmail: form.newCaptainEmail || form.captainEmail || '' } : {}) })} />+ Tạo mới nhanh
          </label>
        </div>
        {!form.createCaptainAccount ? (
          <select className={INP} value={form.captainUserId || ''} onChange={(e) => set({ captainUserId: e.target.value })}>
            <option value="">— Không cấp tài khoản (Chỉ hiển thị liên hệ) —</option>
            {captainUsers.map((u) => { const other = assignedByUser.get(u.id); return <option key={u.id} value={u.id} disabled={Boolean(other)}>{u.fullName} ({u.email}){other ? ` — đã gán cho ${other}` : ''}</option>; })}
          </select>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input required type="email" placeholder="Email đăng nhập CAPTAIN *" className={INP} value={form.newCaptainEmail || ''} onChange={(e) => set({ newCaptainEmail: e.target.value })} />
            <input required type="password" minLength={8} placeholder="Mật khẩu (≥ 8 ký tự) *" className={INP} value={form.newCaptainPassword || ''} onChange={(e) => set({ newCaptainPassword: e.target.value })} />
          </div>
        )}
      </div>
    );
  };

  const renderClubFormFields = (club?: CourtClubProfile, fullPage = false) => {
    const coverQuota = isCaptain ? getMonthlyQuotaStatus(club?.coverUpdatedAt) : { locked: false, unlockDateLabel: null };
    const galQuota = isCaptain ? getMonthlyQuotaStatus(club?.galleryUpdatedAt) : { locked: false, unlockDateLabel: null };
    const galUrls: string[] = form.galleryUrls || [];
    const galFull = isCaptain && galUrls.length >= 5;
    const lockedInp = `${INP} opacity-60 cursor-not-allowed bg-slate-900/80`;

    const infoFields = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <F label="Tên CLB *" full={isCaptain}><input required className={INP} value={form.name || ''} onChange={(e) => set({ name: e.target.value })} /></F>
        {!isCaptain && <F label="Slug URL"><input className={INP} placeholder="tu-dong-tao" value={form.slug || ''} onChange={(e) => set({ slug: e.target.value })} /></F>}
        <F label="Tên Đội trưởng *"><input required className={INP} value={form.captainName || ''} onChange={(e) => set({ captainName: e.target.value })} /></F>
        <F label={isCaptain ? '🔒 SĐT Đội trưởng (Cố định)' : 'SĐT Đội trưởng *'}><input required={!isCaptain} disabled={isCaptain} readOnly={isCaptain} className={isCaptain ? lockedInp : INP} value={form.captainPhone || ''} onChange={(e) => set({ captainPhone: e.target.value })} /></F>
        <F label={isCaptain ? '🔒 Zalo (Cố định)' : 'Zalo'}><input disabled={isCaptain} readOnly={isCaptain} className={isCaptain ? lockedInp : INP} value={form.captainZalo || ''} onChange={(e) => set({ captainZalo: e.target.value })} /></F>
        <F label={isCaptain ? '🔒 Gmail (Nội bộ Admin · Cố định)' : 'Gmail (Nội bộ Admin)'} tone="text-amber-300"><input type="email" disabled={isCaptain} readOnly={isCaptain} className={isCaptain ? lockedInp : INP} value={form.captainEmail || ''} onChange={(e) => set({ captainEmail: e.target.value })} /></F>
        {isCaptain && (
          <p className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] font-semibold text-amber-200">
            🔒 Liên hệ Quốc Duy (Zalo/SĐT: 0768299329) nếu bạn muốn thay đổi SĐT, Zalo hoặc Gmail đội trưởng.
          </p>
        )}
        {renderCaptainAccountSection(club?.id)}
        <F label="Mục đích chơi (chọn 1 hoặc nhiều)" full>
          <div className="flex flex-wrap gap-2">
            {PLAY_STYLE_OPTIONS.map((id) => {
              const cur = parsePlayStyles(form.playStyles);
              const active = cur.includes(id);
              const m = PLAY_STYLE_META[id];
              const onToggle = () => active ? (cur.length <= 1 ? notify('Chọn ít nhất 1 mục đích chơi', 2200) : set({ playStyles: cur.filter((x) => x !== id) })) : set({ playStyles: PLAY_STYLE_OPTIONS.filter((x) => x === id || cur.includes(x)) });
              return <button key={id} type="button" onClick={onToggle} aria-pressed={active} className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${active ? 'bg-gradient-to-r from-red-600/90 to-orange-500/90 border-orange-400 text-white shadow-sm' : 'bg-[#0B0F19] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>{m.emoji} {m.shortLabel}</button>;
            })}
          </div>
        </F>
        <F label="Hình thức phí"><select className={INP} value={form.feeType} onChange={(e) => set({ feeType: e.target.value })}><option value="PAID">Thu phí</option><option value="FREE">Miễn phí (FREE)</option></select></F>
        <F label="Mức phí"><input className={INP} value={form.feeAmount || ''} onChange={(e) => set({ feeAmount: e.target.value })} /></F>
        <F label="Tags (dấu phẩy)" full><input className={INP} value={form.tagsInput || ''} onChange={(e) => set({ tagsInput: e.target.value })} /></F>
        <F label="Mô tả CLB" full><textarea rows={fullPage ? 5 : 2} className={INP} value={form.description || ''} onChange={(e) => set({ description: e.target.value })} /></F>
      </div>
    );

    const mediaFields = (
      <div className={fullPage ? 'rounded-2xl p-4 bg-[#0F172A]/85 border border-slate-800 space-y-4 text-xs' : 'space-y-3 text-xs pt-1'}>
        {fullPage && (
          <>
            <div className="flex items-center justify-between"><span className="font-heading font-black text-xs text-white">🖼️ Hình Ảnh & Xem Trước Công Khai</span><span className="text-[10px] font-bold text-cyan-300">Quota 30 ngày</span></div>
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0B0F19] relative h-40">
              {form.coverUrl ? <img src={optimizeCloudinaryUrl(form.coverUrl, 'detail')} alt="Ảnh bìa đội" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Chưa có ảnh bìa đội</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3.5 flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-lg shrink-0">
                  {form.logoUrl ? <img src={optimizeCloudinaryLogoUrl(form.logoUrl, 120)} alt="" className="w-full h-full object-cover" /> : <span className="font-heading font-black text-sm text-orange-400">{getClubInitials(form.name || 'CLB')}</span>}
                </div>
                <div className="min-w-0"><p className="font-heading font-black text-sm text-white truncate">{form.name || 'Tên CLB'}</p><p className="text-[10px] text-slate-300">Hiển thị công khai trên Bản đồ sân</p></div>
              </div>
            </div>
          </>
        )}
        <div className="flex items-center gap-2"><input className={INP} placeholder="Logo URL..." value={form.logoUrl || ''} onChange={(e) => set({ logoUrl: e.target.value })} /><label className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0">{uploading === 'logoUrl' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}Logo<input type="file" accept="image/*" className="hidden" onChange={(e) => void handleUpload(e.target.files, 'logoUrl', 'clubs')} /></label></div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input disabled={coverQuota.locked} className={coverQuota.locked ? lockedInp : INP} placeholder="Ảnh bìa Cover URL (Tối đa 1 ảnh)..." value={form.coverUrl || ''} onChange={(e) => set({ coverUrl: e.target.value })} />
            <label className={`px-3 py-2 rounded-xl border font-bold inline-flex items-center gap-1 shrink-0 ${coverQuota.locked ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-slate-700 cursor-pointer'}`}>
              {uploading === 'coverUrl' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}Cover
              <input type="file" accept="image/*" disabled={coverQuota.locked} className="hidden" onChange={(e) => void handleUpload(e.target.files, 'coverUrl', 'clubs')} />
            </label>
          </div>
          {coverQuota.locked && <p className="text-[11px] font-bold text-amber-300">⏳ Đã đổi ảnh bìa — Có thể đổi lại sau ngày {coverQuota.unlockDateLabel}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-300">Gallery ({galUrls.length}{isCaptain ? '/5 ảnh' : ''})</span>
            {galQuota.locked ? (
              <span className="text-[10px] font-bold text-amber-300">⏳ Mở lại sau {galQuota.unlockDateLabel}</span>
            ) : (
              <label className={`px-2.5 py-1 rounded-lg border font-bold ${galFull ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-orange-600/20 border-orange-500/40 text-orange-300 cursor-pointer'}`}>
                {uploading === 'gallery' ? 'Đang tải...' : galFull ? 'Đã đủ 5/5 ảnh' : '+ Thêm ảnh'}
                <input type="file" accept="image/*" multiple disabled={galFull} className="hidden" onChange={(e) => void handleUpload(e.target.files, 'gallery', 'clubs/gallery', true)} />
              </label>
            )}
          </div>
          {isCaptain && (
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full rounded-full transition-all ${galUrls.length >= 5 ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'}`} style={{ width: `${Math.min(100, (galUrls.length / 5) * 100)}%` }} /></div>
          )}
          <div className={`grid gap-2 ${fullPage ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-5'}`}>
            {(fullPage ? Array.from({ length: 5 }, (_, idx) => galUrls[idx] || null) : galUrls).map((u, i) => (
              u ? (
                <div key={`${u}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                  <img src={optimizeCloudinaryUrl(u, 'thumb')} alt="" className="w-full h-full object-cover" />
                  {!galQuota.locked && <button type="button" onClick={() => set({ galleryUrls: galUrls.filter((_, idx) => idx !== i) })} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/75 text-red-300 cursor-pointer"><X className="w-3 h-3" /></button>}
                </div>
              ) : (
                <div key={`slot-${i}`} className="aspect-square rounded-xl border border-dashed border-slate-700/80 bg-[#0B0F19]/60 flex items-center justify-center text-[10px] font-bold text-slate-600">#{i + 1}</div>
              )
            ))}
          </div>
          {galQuota.locked && <p className="text-[11px] font-bold text-amber-300">⏳ Đã cập nhật Gallery tháng này — Mở lại sau ngày {galQuota.unlockDateLabel}</p>}
        </div>
      </div>
    );

    if (fullPage) {
      return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7">{infoFields}</div>
          <div className="xl:col-span-5 xl:sticky xl:top-20">{mediaFields}</div>
        </div>
      );
    }
    return <div className="space-y-3">{infoFields}{mediaFields}</div>;
  };

  return (
    <div className="space-y-4">
      {isCaptain ? (
        /* CAPTAIN SELF-SERVICE VIEW: 2 FULL-WIDTH WORKSPACES VIA SIDEBAR */
        (() => {
          const entry = allClubs[0];
          if (!entry) return <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center space-y-2"><Users className="w-10 h-10 text-cyan-400 mx-auto" /><h2 className="font-heading font-black text-lg text-white">Chưa có Đội / CLB được liên kết</h2><p className="text-xs text-slate-400">Liên hệ Superadmin để gắn tài khoản CAPTAIN với CLB của bạn.</p></div>;
          const { venue, club, sessions } = entry;
          if (activeModule === 'CAPTAIN_PROFILE') {
            return (
              <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await saveClubPayload(venue, club); await reload(); notify('Đã lưu hồ sơ & ảnh đội thành công!'); } catch (err: any) { notify(err?.message || 'Lưu thất bại.', 4500); } finally { setSaving(false); } }} className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl w-full">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">🛡️ Hồ Sơ & Ảnh Đội</span>
                    <h2 className="font-heading font-black text-xl text-white mt-1">{club.name} · {venue.name}</h2>
                  </div>
                  <a href={`/services/court-map/teams/${club.slug}`} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-sky-300 text-xs font-bold inline-flex items-center gap-1.5">Xem trang công khai <ExternalLink className="w-3.5 h-3.5" /></a>
                </div>
                {renderClubFormFields(club, true)}
                <div className="flex justify-end pt-3 border-t border-white/10">
                  <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow cursor-pointer disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Lưu Thay Đổi Hồ Sơ</button>
                </div>
              </form>
            );
          }
          const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
          const activeDates = activeSession ? getUpcomingSessionDates(activeSession.daysOfWeek, nowVn) : [];
          const previewDate = activeSession ? (selectedDateBySession[activeSession.id] || activeDates[0]?.dateStr || nowVn.dateStr) : nowVn.dateStr;
          const previewDateObj = activeDates.find((d) => d.dateStr === previewDate);
          const previewDaily = activeSession ? getSessionDailyState(activeSession, previewDate) : { currentPlayers: 0, neededPositions: [] };
          const venueClosed = isVenueClosedNow(venue);
          const clubStyles = parsePlayStyles(club.playStyle).map((k) => PLAY_STYLE_META[k]);
          const teamUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/services/court-map/teams/${club.slug}`;

          // Captain 3-Column Spatial KPI metrics
          const weeklySessionsCount = sessions.reduce((acc, s) => acc + (s.daysOfWeek?.length || 0), 0);
          let captainTotalReg = 0;
          let captainTotalCap = 0;
          sessions.forEach((s) => {
            if (s.capacityMode === 'LIMITED_SLOTS') {
              const d = selectedDateBySession[s.id] || getUpcomingSessionDates(s.daysOfWeek, nowVn)[0]?.dateStr || nowVn.dateStr;
              captainTotalReg += getSessionDailyState(s, d).currentPlayers;
              captainTotalCap += Math.max(1, s.maxPlayers ?? 14);
            }
          });
          const captainFillPct = venueClosed ? 0 : captainTotalCap > 0 ? Math.min(100, Math.round((captainTotalReg / captainTotalCap) * 100)) : sessions.length > 0 ? 75 : 0;

          const captainKpis: SpatialKpiItem[] = [
            {
              id: 'cap-weekly-sessions',
              label: 'Số ca sinh hoạt tuần này',
              value: `${weeklySessionsCount} buổi / tuần`,
              subtitle: `${sessions.length} khung giờ cố định · ${club.name}`,
              badge: `${sessions.length} ca đang mở`,
              badgeTone: 'orange',
              icon: CalendarClock,
              accentColor: '#FB923C',
              sparkline: [Math.max(1, weeklySessionsCount - 1), weeklySessionsCount, weeklySessionsCount, Math.max(1, weeklySessionsCount)],
            },
            {
              id: 'cap-slots',
              label: 'Số slot đã đăng ký / Tổng slot',
              value: captainTotalCap > 0 ? `${captainTotalReg} / ${captainTotalCap}` : '∞ Tự do',
              subtitle: captainTotalCap > 0 ? `Còn trống ${Math.max(0, captainTotalCap - captainTotalReg)} slot buổi tới` : 'Chế độ mở không giới hạn người',
              badge: captainTotalCap > 0 ? `${captainFillPct}% lấp đầy` : 'Unlimited',
              badgeTone: captainFillPct >= 80 ? 'emerald' : 'sky',
              icon: Users,
              accentColor: '#34D399',
              gaugePct: captainFillPct,
              gaugeSublabel: 'Slot',
            },
            {
              id: 'cap-venue-status',
              label: 'Trạng thái mở cửa sân',
              value: venueClosed ? 'Tạm nghỉ' : 'Đang mở cửa',
              subtitle: venueClosed ? (venue.closureReason || 'Sân đang tạm đóng cửa') : `${venue.name} · ${venue.district}`,
              badge: venueClosed ? 'Đã khóa lịch' : 'Hoạt động bình thường',
              badgeTone: venueClosed ? 'rose' : 'emerald',
              icon: Power,
              accentColor: venueClosed ? '#FB7185' : '#34D399',
              gaugePct: venueClosed ? 0 : 100,
              gaugeLabel: venueClosed ? 'OFF' : 'ON',
              gaugeSublabel: 'Sân',
            },
          ];

          const captainBentoItems: SpatialBentoItem[] = sessions.map((s) => {
            const nextDate = selectedDateBySession[s.id] || getUpcomingSessionDates(s.daysOfWeek, nowVn)[0]?.dateStr || nowVn.dateStr;
            const isOff = venueClosed || isSessionCancelledOnDate(s, nextDate);
            const limited = s.capacityMode === 'LIMITED_SLOTS';
            const max = Math.max(1, s.maxPlayers ?? 14);
            const cur = getSessionDailyState(s, nextDate).currentPlayers;
            const pct = isOff ? 0 : limited ? Math.min(100, Math.round((cur / max) * 100)) : 75;
            const filterTags: BentoFilterKey[] = ['ALL'];
            if (isOff) filterTags.push('PAUSED');
            else {
              filterTags.push('ACTIVE');
              if (!limited || pct < 75) filterTags.push('OPEN_SLOTS');
            }
            return {
              id: `cap-session-${s.id}`,
              category: `${formatDaysOfWeek(s.daysOfWeek)} · ${s.subCourts.join(', ')}`,
              title: `${s.startTime} – ${s.endTime}`,
              description: `${venue.name}${s.skillRankLabel ? ` · USAV ${s.skillRankLabel}` : ''} · ${limited ? `Còn ${Math.max(0, max - cur)} slot` : '∞ Tự do'}`,
              percent: pct,
              gaugeLabel: isOff ? 'OFF' : limited ? `${pct}%` : '∞',
              gaugeSublabel: isOff ? 'Nghỉ' : 'Lấp đầy',
              statusTag: isOff ? 'Tạm nghỉ' : pct < 75 ? 'Còn nhiều slot' : 'Đang hoạt động',
              metaRight: limited ? `${cur}/${max}` : 'Tự do',
              filterTags,
              actionLabel: `Chỉnh sửa ca ${s.startTime}`,
              onAction: () => setActiveSessionId(s.id),
            };
          });

          const postText = activeSession ? [
            `🏐 ${club.name} — TUYỂN QUÂN GIAO LƯU`,
            `📍 Sân: ${venue.name} (${venue.address})`,
            `🗓️ Lịch: ${previewDateObj?.label || formatShortVnDate(previewDate)} • ${activeSession.startTime} – ${activeSession.endTime} (${activeSession.subCourts.join(', ')})`,
            `⚡ Thể thức: ${clubStyles.map((m) => `${m.emoji} ${m.shortLabel}`).join(' / ')} • ${(GENDER_RULE_META[activeSession.genderRule || 'MIXED'] || GENDER_RULE_META.MIXED).shortLabel}`,
            activeSession.skillRankLabel ? `🇺🇸 Trình độ USAV: ${activeSession.skillRankLabel}` : null,
            activeSession.capacityMode === 'LIMITED_SLOTS'
              ? `👥 Quân số: ${previewDaily.currentPlayers}/${activeSession.maxPlayers ?? 14} (Còn ${Math.max(0, (activeSession.maxPlayers ?? 14) - previewDaily.currentPlayers)} slot)`
              : `👥 Quân số: ∞ Không giới hạn người tham gia`,
            previewDaily.neededPositions.length > 0 ? `🎯 Cần gấp vị trí: ${previewDaily.neededPositions.join(' • ')}` : null,
            `💰 Phí: ${club.feeType === 'FREE' ? 'Miễn phí (FREE)' : club.feeAmount || 'Chia sân tại chỗ'}`,
            `📞 Liên hệ Đội trưởng ${club.captainName}: ${club.captainPhone}${club.captainZalo ? ` (Zalo: ${club.captainZalo})` : ''}`,
            `🔗 Xem chi tiết đội: ${teamUrl}`,
          ].filter(Boolean).join('\n') : '';

          return (
            <div className="space-y-6">
              {/* CAPTAIN 3-Column Spatial KPI Row */}
              <SpatialKpiRow items={captainKpis} />

              {/* CAPTAIN Bento Gradient Cards for Own Club Sessions */}
              {captainBentoItems.length > 0 && (
                <SpatialBentoGrid
                  title={`Đội Của Tôi · ${club.name}`}
                  subtitle="Theo dõi tỷ lệ lấp đầy từng ca sinh hoạt và bấm nút mũi tên để thao tác nhanh bên dưới"
                  items={captainBentoItems}
                />
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN (8/12): CLUB HEADER + SESSION CONTROLS */}
                <div className="xl:col-span-8 space-y-4 min-w-0">
                  {venueClosed && <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/60 text-xs text-red-100 flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /><div><strong className="uppercase">Sân {venue.name} đang tạm nghỉ:</strong> {venue.closureReason || 'Tạm đóng cửa'}</div></div>}
                  <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-white/15 shrink-0 flex items-center justify-center">{club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 120)} alt={club.name} className="w-full h-full object-cover" /> : <span className="font-heading font-black text-lg text-orange-400">{getClubInitials(club.name)}</span>}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]"><span className="px-2 py-0.5 rounded-full font-black uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">CAPTAIN · Lịch Chơi & Slot Ca</span><a href={`/services/court-map/teams/${club.slug}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 font-bold hover:underline inline-flex items-center gap-0.5">Trang công khai <ExternalLink className="w-3 h-3" /></a></div>
                        <h2 className="font-heading font-black text-lg text-white truncate mt-0.5">{club.name}</h2>
                        <p className="text-xs text-slate-400 truncate"><MapPin className="w-3 h-3 inline text-orange-400 mr-1" />{venue.name} · {venue.district}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setActiveModule('CAPTAIN_PROFILE')} className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-cyan-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">🛡️ Hồ Sơ & Ảnh Đội →</button>
                  </div>
                  <div className="space-y-3">{sessions.map((s) => renderSessionCard(venue, s))}</div>
                </div>

                {/* RIGHT COLUMN (4/12): RECRUITMENT POST GENERATOR + PUBLIC CARD PREVIEW */}
                {activeSession && (
                  <aside className="xl:col-span-4 space-y-4 xl:sticky xl:top-20">
                    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-4 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading font-black text-xs text-white">📋 Tạo Tin Tuyển Quân Nhanh</h3>
                        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(postText); notify('Đã copy mẫu tin tuyển quân', 2500); } catch { notify('Không thể copy tự động.', 2500); } }} className="px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shadow shrink-0"><Copy className="w-3 h-3" />Copy tin đăng</button>
                      </div>
                      <pre className="p-3 rounded-2xl bg-black/30 border border-white/10 text-[11px] text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-all">{postText}</pre>
                    </div>

                    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-4 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading font-black text-xs text-white">👁️ Xem Trước Hiển Thị Công Khai</h3>
                        <span className="text-[10px] font-bold text-orange-300">{previewDateObj?.label || formatShortVnDate(previewDate)}</span>
                      </div>
                      <div className={`rounded-2xl p-3.5 border space-y-2 ${!venueClosed && isSessionCancelledOnDate(activeSession, previewDate) ? 'opacity-50 bg-black/30 border-amber-500/40' : 'bg-white/[0.04] border-white/10'}`}>
                        <div className="flex items-start gap-2.5">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-slate-900 flex items-center justify-center">{club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 96)} alt={club.name} className="w-full h-full object-cover" /> : <span className="font-heading font-black text-xs text-orange-400">{getClubInitials(club.name)}</span>}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5"><span className="font-heading font-black text-xs text-white truncate">{club.name}</span><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${club.feeType === 'FREE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-amber-300'}`}>{club.feeType === 'FREE' ? 'FREE' : club.feeAmount || 'Thu phí'}</span></div>
                            <div className="flex flex-wrap gap-1 mt-1">{clubStyles.map((m) => <span key={m.shortLabel} className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${m.badgeClass}`}>{m.emoji} {m.shortLabel}</span>)}<span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${(GENDER_RULE_META[activeSession.genderRule || 'MIXED'] || GENDER_RULE_META.MIXED).badgeClass}`}>{(GENDER_RULE_META[activeSession.genderRule || 'MIXED'] || GENDER_RULE_META.MIXED).shortLabel}</span>{activeSession.skillRankLabel && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-950/85 text-blue-200 border border-blue-500/50">🇺🇸 USAV: {activeSession.skillRankLabel}</span>}{activeSession.subCourts.map((sc) => <span key={sc} className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-sky-500/15 text-sky-300 border border-sky-500/35">{sc}</span>)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/10 text-[11px]"><Clock className="w-3 h-3 text-orange-400 shrink-0" /><strong className="text-orange-300">{activeSession.startTime} – {activeSession.endTime}</strong><span className="text-slate-600">•</span><span className="text-slate-200 font-semibold">{formatDaysOfWeek(activeSession.daysOfWeek)}</span></div>
                        <SessionStatusBlock session={activeSession} venueClosed={venueClosed} targetDate={previewDate} todayDate={nowVn.dateStr} />
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        <>
          {/* SUPERADMIN TOP BAR & SUB-TABS */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="inline-flex bg-white/[0.04] border border-white/10 rounded-full p-1 self-start">
              {([['VENUES', `Quản lý Sân & Lịch Ca (${venuesList.length})`], ['CAPTAINS', `Danh bạ Đội trưởng (${allClubs.length})`]] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setSubTab(id)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${subTab === id ? 'bg-white text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {subTab === 'VENUES' && (
                <button type="button" onClick={() => setShowBentoOverview((v) => !v)} className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-slate-200 cursor-pointer">
                  {showBentoOverview ? 'Thu gọn Bento Grid' : 'Hiện Bento Grid'}
                </button>
              )}
              <a href="/services/court-map" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-sky-400 hover:underline inline-flex items-center gap-1">Bản Đồ Công Khai <ExternalLink className="w-3.5 h-3.5" /></a>
              {subTab === 'CAPTAINS' && <button type="button" onClick={() => openModal({ kind: 'captain' })} className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"><Users className="w-3.5 h-3.5" />Cập Nhật Đội Trưởng</button>}
            </div>
          </div>

          {subTab === 'VENUES' && showBentoOverview && venuesList.length > 0 && (
            <SpatialBentoGrid
              title="Court Map & Venues — Lưới Bento Tỷ Lệ Lấp Đầy"
              subtitle="Bấm nút mũi tên trắng trên thẻ sân để mở nhanh bảng điều khiển chi tiết bên dưới"
              items={venuesList.map((v): SpatialBentoItem => {
                const closed = isVenueClosedNow(v);
                const vSessions = v.sessions || [];
                let reg = 0;
                let cap = 0;
                vSessions.forEach((s) => {
                  if (s.capacityMode === 'LIMITED_SLOTS') {
                    const nd = getUpcomingSessionDates(s.daysOfWeek, nowVn)[0]?.dateStr || nowVn.dateStr;
                    reg += getSessionDailyState(s, nd).currentPlayers;
                    cap += Math.max(1, s.maxPlayers ?? 14);
                  }
                });
                const pct = closed ? 0 : cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : vSessions.length > 0 ? 75 : 25;
                const filterTags: BentoFilterKey[] = ['ALL'];
                if (closed) filterTags.push('PAUSED');
                else {
                  filterTags.push('ACTIVE');
                  if (pct < 75) filterTags.push('OPEN_SLOTS');
                }
                return {
                  id: `sa-venue-${v.id}`,
                  category: `${v.district} · ${(v.clubs || []).length} đội`,
                  title: v.name,
                  description: `${v.address} · ${vSessions.length} ca · ${v.surfaceType}`,
                  percent: pct,
                  gaugeSublabel: closed ? 'Tạm nghỉ' : 'Slot fill',
                  statusTag: closed ? 'Tạm nghỉ' : pct < 75 ? 'Còn nhiều slot' : 'Đang hoạt động',
                  metaRight: cap > 0 ? `${reg}/${cap}` : `${vSessions.length} ca`,
                  filterTags,
                  onAction: () => {
                    setSelectedVenueId(v.id);
                    detailWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  },
                };
              })}
            />
          )}

          {subTab === 'VENUES' ? (
            /* MASTER–DETAIL 2-COLUMN WORKSPACE (32% LEFT / 68% RIGHT) */
            <div ref={detailWorkspaceRef} className="flex flex-col lg:flex-row gap-4 items-start scroll-mt-20">
              {/* LEFT COLUMN (32%): VENUE LIST */}
              <aside className="w-full lg:w-[32%] shrink-0 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1"><Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm sân, quận, CLB..." className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-[#0F172A] border border-slate-700 text-xs text-white" /></div>
                  <button type="button" onClick={() => openModal({ kind: 'venue' })} className="px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"><Plus className="w-3.5 h-3.5" />Sân</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['ALL', ...VIETNAM_CITIES.map((c) => c.name)] as const).map((c) => (
                    <button key={c} type="button" onClick={() => setCityFilter(c)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${cityFilter === c ? 'bg-orange-500 text-white border-orange-400' : 'bg-[#0F172A] text-slate-400 border-slate-800 hover:text-white'}`}>{c === 'ALL' ? 'Tất cả' : c}</button>
                  ))}
                </div>
                <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-0.5">
                  {filteredVenues.map((v) => {
                    const closed = isVenueClosedNow(v); const active = selectedVenue?.id === v.id;
                    return (
                      <button key={v.id} type="button" onClick={() => setSelectedVenueId(v.id)} className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${active ? 'bg-gradient-to-r from-red-950/50 to-orange-950/35 border-orange-500/75 shadow' : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-heading font-black text-xs text-white truncate">{v.name}</p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{v.district} · {(v.clubs || []).length} đội · {(v.sessions || []).length} ca</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 border ${closed ? 'bg-red-950 text-red-300 border-red-500/50' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'}`}>{closed ? 'Tạm nghỉ' : 'Mở cửa'}</span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredVenues.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Không tìm thấy sân phù hợp.</p>}
                </div>
              </aside>

              {/* RIGHT COLUMN (68%): SELECTED VENUE WORKSPACE */}
              <section className="w-full lg:flex-1 min-w-0">
                {selectedVenue ? (() => {
                  const v = selectedVenue; const closed = isVenueClosedNow(v);
                  const draft = closureDrafts[v.id] ?? { reason: v.closureReason || '', until: v.closedUntil ? v.closedUntil.slice(0, 10) : '' };
                  const vt = VENUE_TYPE_META[v.venueType] || VENUE_TYPE_META.COMMERCIAL;
                  const allOpen = (v.clubs || []).length > 0 && (v.clubs || []).every((c) => expandedClubs[c.id]);
                  return (
                    <div className={`bg-white/[0.04] backdrop-blur-xl border rounded-3xl overflow-hidden shadow-xl ${closed ? 'border-red-500/50' : 'border-white/10'}`}>
                      <div className="p-5 border-b border-white/10 bg-white/[0.02] space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">{(v.coverUrl || v.imageUrl) ? <img src={optimizeCloudinaryUrl(v.coverUrl || v.imageUrl, 'thumb')} alt="" className="w-full h-full object-cover" /> : <MapPin className="w-5 h-5 text-orange-400" />}</div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-1.5 mb-1 text-[10px]">{v.isDvaOfficial && <span className="px-2 py-0.5 rounded-full font-black bg-gradient-to-r from-red-600 to-orange-500 text-white">DVA Official</span>}<span className={`px-2 py-0.5 rounded-full font-bold border ${vt.badgeClass}`}>{vt.shortLabel}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-semibold"><Layers className="w-3 h-3" />{v.surfaceType} · {v.subCourtsCount} sân</span></div>
                              <h3 className="font-heading font-black text-base text-white">{v.name}</h3>
                              <p className="text-xs text-slate-300">{v.address} · <a href={buildGoogleMapsUrl(v)} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Maps ↗</a></p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            <button type="button" onClick={() => openModal({ kind: 'club', venue: v })} className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Thêm Đội/CLB</button>
                            <button type="button" onClick={() => openModal({ kind: 'session', venue: v })} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"><CalendarClock className="w-3.5 h-3.5" />+ Ca</button>
                            <button type="button" onClick={() => openModal({ kind: 'venue', item: v })} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"><Pencil className="w-3.5 h-3.5" />Sửa Sân</button>
                            <button type="button" onClick={async () => { if (!confirm(`Xóa sân "${v.name}"?`)) return; await venueService.deleteVenue(v.id); await reload(); notify('Đã xóa sân.'); }} className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        {/* Inline Holiday Closure Toggle */}
                        <div className={`p-2.5 rounded-2xl border flex flex-col xl:flex-row xl:items-center gap-2 text-xs ${closed ? 'bg-red-950/35 border-red-500/45' : 'bg-[#0B0F19]/75 border-slate-800'}`}>
                          <button type="button" disabled={saving} onClick={() => void saveClosure(v, !closed)} className={`px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer border ${closed ? 'bg-red-600 text-white border-red-400' : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'}`}><Power className="w-3.5 h-3.5" />{closed ? 'Tạm nghỉ lễ Tết (Mở lại)' : 'Mở cửa · Báo nghỉ sân'}</button>
                          <input value={draft.reason} onChange={(e) => setClosureDrafts((p) => ({ ...p, [v.id]: { ...draft, reason: e.target.value } }))} placeholder="Lý do tạm nghỉ (Nghỉ lễ, bảo trì...)" className="flex-1 px-3 py-1.5 rounded-xl bg-[#111827] border border-slate-700 text-white" />
                          <div className="flex items-center gap-1.5 shrink-0"><input type="date" value={draft.until} onChange={(e) => setClosureDrafts((p) => ({ ...p, [v.id]: { ...draft, until: e.target.value } }))} className="px-2 py-1.5 rounded-xl bg-[#111827] border border-slate-700 text-white" /><button type="button" disabled={saving} onClick={() => void saveClosure(v, true)} className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer">Lưu</button></div>
                        </div>
                      </div>

                      {/* CLUBS & SESSIONS ACCORDION */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-300">Đội / CLB & Ca sinh hoạt ({(v.clubs || []).length} đội · {(v.sessions || []).length} ca)</span>
                          {(v.clubs || []).length > 0 && <button type="button" onClick={() => setExpandedClubs((p) => ({ ...p, ...Object.fromEntries((v.clubs || []).map((c) => [c.id, !allOpen])) }))} className="font-bold text-orange-400 hover:underline cursor-pointer">{allOpen ? 'Thu gọn tất cả' : 'Mở tất cả'}</button>}
                        </div>
                        {(v.clubs || []).map((club) => {
                          const open = Boolean(expandedClubs[club.id]);
                          const clubSessions = (v.sessions || []).filter((s) => s.clubId === club.id);
                          return (
                            <div key={club.id} className={`rounded-2xl border border-slate-800 bg-[#0F172A] overflow-hidden ${club.isActive === false ? 'opacity-55' : ''}`}>
                              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/40">
                                <button type="button" onClick={() => setExpandedClubs((p) => ({ ...p, [club.id]: !open }))} className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer">
                                  {open ? <ChevronDown className="w-4 h-4 text-orange-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
                                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">{club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 80)} alt="" className="w-full h-full object-cover" /> : <span className="font-heading font-black text-[11px] text-orange-400">{getClubInitials(club.name)}</span>}</div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5"><span className="font-bold text-xs text-white truncate">{club.name}</span>{parsePlayStyles(club.playStyle).map((k) => <span key={k} className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${PLAY_STYLE_META[k].badgeClass}`}>{PLAY_STYLE_META[k].emoji}</span>)}{club.captainUser && <span title={`CAPTAIN: ${club.captainUser.email}`} className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">🔑</span>}<span className="text-[10px] text-slate-400">({clubSessions.length} ca)</span></div>
                                    <p className="text-[10px] text-slate-400 truncate">{club.captainName} · {club.captainPhone}</p>
                                  </div>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button type="button" onClick={() => openModal({ kind: 'session', venue: v }, club.id)} className="p-1.5 rounded-lg bg-emerald-950 text-emerald-300 cursor-pointer" title="Thêm ca"><Plus className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={async () => { await venueService.updateClub(v.id, club.id, { isActive: !club.isActive }); await reload(); }} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">{club.isActive ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}</button>
                                  <button type="button" onClick={() => openModal({ kind: 'club', venue: v, item: club })} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={async () => { if (!confirm(`Xóa CLB "${club.name}"?`)) return; await venueService.deleteClub(v.id, club.id); await reload(); notify('Đã xóa CLB.'); }} className="p-1.5 rounded-lg bg-red-950/60 text-red-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                              {open && (
                                <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 space-y-2.5">
                                  {clubSessions.length ? clubSessions.map((s) => renderSessionCard(v, s)) : <p className="text-xs text-slate-500 italic">Chưa có ca sinh hoạt — bấm nút + để thêm ca.</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(v.clubs || []).length === 0 && <p className="text-xs text-slate-400 text-center py-6">Sân này chưa có CLB nào — bấm "+ Thêm Đội/CLB" ở trên.</p>}
                      </div>
                    </div>
                  );
                })() : <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center text-xs text-slate-400">Chọn một sân ở cột bên trái để quản lý đội và ca sinh hoạt.</div>}
              </section>
            </div>
          ) : (
            /* SUB-TAB 2: DANH BẠ ĐỘI TRƯỞNG */
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-300">Danh bạ Đội trưởng ({filteredCaptains.length} · Gmail ẩn khỏi Public API)</span>
                <div className="relative w-full sm:w-64"><Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm đội trưởng, SĐT, Gmail..." className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0F172A] border border-slate-700 text-xs text-white" /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[740px]">
                  <thead><tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 bg-[#111827]"><th className="py-2.5 px-4">Đội trưởng</th><th className="py-2.5 px-3">Đội / CLB</th><th className="py-2.5 px-3">Sân & Lịch hoạt động</th><th className="py-2.5 px-3">Liên hệ & Tài khoản</th><th className="py-2.5 px-4 text-right">Thao tác</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredCaptains.map(({ venue, club, sessions }) => (
                      <tr key={club.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">{club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 80)} alt="" className="w-full h-full object-cover" /> : <span className="font-heading font-black text-[11px] text-orange-400">{getClubInitials(club.name)}</span>}</div><span className="font-bold text-white">{club.captainName}</span></td>
                        <td className="py-3 px-3 font-bold text-orange-300">{club.name}</td>
                        <td className="py-3 px-3"><p className="font-semibold text-slate-200">{venue.name}</p><p className="text-[11px] text-slate-400">{sessions.map((s) => `${formatDaysOfWeek(s.daysOfWeek)} (${s.startTime}–${s.endTime})`).join(' · ') || 'Chưa có ca'}</p></td>
                        <td className="py-3 px-3 text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-slate-200"><Phone className="w-3 h-3 text-emerald-400" />{club.captainPhone}{club.captainZalo && <span className="text-sky-400">· Zalo: {club.captainZalo}</span>}</div>
                          <div className="flex items-center gap-1.5 text-slate-300"><Mail className="w-3 h-3 text-amber-400" />{club.captainEmail || <em className="text-slate-500">Chưa có Gmail</em>}</div>
                          {club.captainUser && <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-[10px] font-bold"><KeyRound className="w-2.5 h-2.5" />CAPTAIN: {club.captainUser.email}</div>}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {club.captainEmail && <button type="button" onClick={async () => { await navigator.clipboard.writeText(club.captainEmail!); notify(`Đã copy Gmail: ${club.captainEmail}`); }} className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"><Copy className="w-3 h-3" />Copy Gmail</button>}
                          <button type="button" onClick={() => openModal({ kind: 'captain', club, venue })} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"><Pencil className="w-3 h-3" />Sửa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* SINGLE SHARED DRY MODAL (VENUE / CLUB / SESSION / CAPTAIN) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#111827] border border-slate-700 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[#111827]/95 backdrop-blur border-b border-slate-800">
              <h3 className="font-heading font-black text-base text-white">
                {modal.kind === 'venue' ? (modal.item ? 'Sửa Địa Điểm Sân' : 'Thêm Sân Mới')
                  : modal.kind === 'club' ? `${modal.item ? 'Sửa' : 'Tạo'} Hồ Sơ CLB · ${modal.venue.name}`
                    : modal.kind === 'session' ? `${modal.item ? 'Sửa' : 'Thêm'} Ca · ${modal.venue.name}` : 'Cập Nhật Đội Trưởng'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
              {modal.kind === 'venue' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <F label="Tên sân *" full><input required className={INP} value={form.name || ''} onChange={(e) => set({ name: e.target.value })} /></F>
                  <F label="Địa chỉ *" full><input required className={INP} value={form.address || ''} onChange={(e) => set({ address: e.target.value })} /></F>
                  <F label="Thành phố *"><input required list="vn-cities-list" className={INP} value={form.city || 'Hà Nội'} onChange={(e) => set({ city: e.target.value })} /><datalist id="vn-cities-list">{VIETNAM_CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist></F>
                  <F label="Quận / Huyện *"><input required list="hanoi-districts-list" className={INP} value={form.district || ''} onChange={(e) => set({ district: e.target.value })} /><datalist id="hanoi-districts-list">{HANOI_DISTRICTS.map((d) => <option key={d} value={d} />)}</datalist></F>
                  <F label="Mặt sân"><select className={INP} value={form.surfaceType} onChange={(e) => set({ surfaceType: e.target.value })}>{SURFACE_TYPES.map((s) => <option key={s}>{s}</option>)}</select></F>
                  <F label="Loại sân"><select className={INP} value={form.venueType} onChange={(e) => set({ venueType: e.target.value })}><option value="COMMERCIAL">Sân dịch vụ</option><option value="FREE_PUBLIC">Sân miễn phí / Công cộng</option></select></F>
                  <F label={`Số sân con (${getSubCourtNames(form.subCourtsCount).join(', ')})`} full><input type="number" min={1} max={12} className={INP} value={form.subCourtsCount} onChange={(e) => set({ subCourtsCount: Number(e.target.value) })} /></F>
                  <F label="Giá thuê / phí vào sân" full><input className={INP} value={form.rentalPriceInfo || ''} onChange={(e) => set({ rentalPriceInfo: e.target.value })} /></F>
                  <F label="Lưu ý ra vào sân" full><textarea rows={2} className={INP} value={form.entryNote || ''} onChange={(e) => set({ entryNote: e.target.value })} /></F>
                  <F label="Dán nhanh tọa độ Google Maps (Lat, Lng)" full tone="text-orange-300"><input className={INP} placeholder="21.0005, 105.8294" value={form.coords || ''} onChange={(e) => { const m = e.target.value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/); set({ coords: e.target.value, ...(m ? { latitude: m[1], longitude: m[2] } : {}) }); }} /></F>
                  <F label="Latitude *"><input required type="number" step="any" className={INP} value={form.latitude || ''} onChange={(e) => set({ latitude: e.target.value })} /></F>
                  <F label="Longitude *"><input required type="number" step="any" className={INP} value={form.longitude || ''} onChange={(e) => set({ longitude: e.target.value })} /></F>
                  <div className="sm:col-span-2 flex items-center gap-2"><input className={INP} placeholder="Ảnh bìa URL..." value={form.coverUrl || ''} onChange={(e) => set({ coverUrl: e.target.value })} /><label className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0">{uploading === 'coverUrl' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => void handleUpload(e.target.files, 'coverUrl', 'venues')} /></label></div>
                  <div className="sm:col-span-2 flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-1.5 font-bold text-orange-300 cursor-pointer"><input type="checkbox" checked={Boolean(form.isDvaOfficial)} onChange={(e) => set({ isDvaOfficial: e.target.checked })} />DVA Official</label>
                    <label className="inline-flex items-center gap-1.5 font-bold text-amber-300 cursor-pointer"><input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(e) => set({ isFeatured: e.target.checked })} />Featured</label>
                    <label className="inline-flex items-center gap-1.5 font-bold text-red-300 cursor-pointer"><input type="checkbox" checked={Boolean(form.isClosed)} onChange={(e) => set({ isClosed: e.target.checked })} />Tạm nghỉ sân</label>
                  </div>
                  {form.isClosed && (<><F label="Lý do tạm nghỉ" tone="text-red-300"><input className={INP} value={form.closureReason || ''} onChange={(e) => set({ closureReason: e.target.value })} /></F><F label="Mở lại dự kiến" tone="text-red-300"><input type="date" className={INP} value={form.closedUntil || ''} onChange={(e) => set({ closedUntil: e.target.value })} /></F></>)}
                </div>
              )}

              {modal.kind === 'club' && renderClubFormFields(modal.item, false)}

              {modal.kind === 'session' && (
                <div className="space-y-3">
                  <F label="CLB *"><select required className={INP} value={form.clubId} onChange={(e) => { const cid = e.target.value; set({ clubId: cid, ...(!modal.item ? { genderRule: suggestGenderRule((modal.venue.clubs || []).find((c) => c.id === cid)?.playStyle) } : {}) }); }}>{(modal.venue.clubs || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
                  <F label="Thứ trong tuần *"><div className="grid grid-cols-7 gap-1.5">{VN_DAY_OPTIONS.map((d) => <button key={d.value} type="button" onClick={() => toggleArr('daysOfWeek', d.value)} className={`py-2 rounded-xl border font-bold cursor-pointer ${(form.daysOfWeek || []).includes(d.value) ? 'bg-gradient-to-r from-red-600 to-orange-500 border-orange-400 text-white' : 'bg-[#0B0F19] border-slate-700 text-slate-400'}`}>{d.short}</button>)}</div></F>
                  <div className="grid grid-cols-2 gap-3"><F label="Bắt đầu *"><input required type="time" className={INP} value={form.startTime || ''} onChange={(e) => set({ startTime: e.target.value })} /></F><F label="Kết thúc *"><input required type="time" className={INP} value={form.endTime || ''} onChange={(e) => set({ endTime: e.target.value })} /></F></div>
                  <F label="Sân con *"><div className="flex flex-wrap gap-2">{getSubCourtNames(modal.venue.subCourtsCount).map((sc) => <button key={sc} type="button" onClick={() => toggleArr('subCourts', sc)} className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer ${(form.subCourts || []).includes(sc) ? 'bg-sky-600 border-sky-400 text-white' : 'bg-[#0B0F19] border-slate-700 text-slate-300'}`}>{sc}</button>)}</div></F>
                  {liveConflicts.length > 0 && <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 space-y-1"><p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-400" />Trùng sân con: {liveConflicts.map((c) => `${c.clubName} (${formatDaysOfWeek(c.days)} ${c.startTime}–${c.endTime} · ${c.subCourts.join(', ')})`).join('; ')}</p><label className="inline-flex items-center gap-1.5 font-bold cursor-pointer"><input type="checkbox" checked={Boolean(form.forceOverride)} onChange={(e) => set({ forceOverride: e.target.checked })} />Vẫn lưu đè cảnh báo</label></div>}
                  <F label="Đối tượng tham gia"><div className="grid grid-cols-3 gap-1.5">{(['MALE_ONLY', 'MIXED', 'FEMALE_ONLY'] as const).map((g) => <button key={g} type="button" onClick={() => set({ genderRule: g })} className={`py-2 px-2 rounded-xl border font-bold cursor-pointer ${(form.genderRule || 'MIXED') === g ? 'bg-purple-600 border-purple-400 text-white' : 'bg-[#0B0F19] border-slate-700 text-slate-300'}`}>{GENDER_RULE_META[g].label}</button>)}</div></F>
                  <F label="🇺🇸 Hạng trình độ USAV khuyến nghị (Tùy chọn)">
                    <select className={INP} value={form.skillRankLabel || ''} onChange={(e) => set({ skillRankLabel: e.target.value })}>
                      <option value="">Chưa gắn hạng trình độ</option>
                      {RECOMMENDED_SKILL_RANK_PRESETS.map((preset) => <option key={preset} value={preset}>USAV: {preset}</option>)}
                    </select>
                  </F>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <F label="Trạng thái tuyển"><select className={INP} value={form.recruitmentStatus} onChange={(e) => set({ recruitmentStatus: e.target.value })}><option value="OPEN_RECRUIT">Đang tuyển slot</option><option value="CHECK_CAPTAIN">Hỏi đội trưởng</option><option value="FULL">Đã đủ người</option></select></F>
                    <F label="Chế độ quân số"><select className={INP} value={form.capacityMode || 'UNLIMITED'} onChange={(e) => set({ capacityMode: e.target.value })}><option value="UNLIMITED">∞ Không giới hạn</option><option value="LIMITED_SLOTS">Giới hạn slot</option></select></F>
                    {form.capacityMode === 'LIMITED_SLOTS' && <F label="Số người tối đa"><input type="number" min={1} max={100} className={INP} value={form.maxPlayers ?? 14} onChange={(e) => set({ maxPlayers: Number(e.target.value) })} /></F>}
                  </div>
                </div>
              )}

              {modal.kind === 'captain' && (
                <div className="space-y-3">
                  <F label="Đội / CLB quản lý *" tone="text-orange-300"><select required className={INP} value={form.clubKey || ''} onChange={(e) => { const [vId, cId] = e.target.value.split('::'); const hit = allClubs.find((r) => r.venue.id === vId && r.club.id === cId); set({ clubKey: e.target.value, captainName: hit?.club.captainName || '', captainPhone: hit?.club.captainPhone || '', captainZalo: hit?.club.captainZalo || '', captainEmail: hit?.club.captainEmail || '', captainUserId: hit?.club.captainUserId || '', createCaptainAccount: false }); }}>{allClubs.map(({ venue, club }) => <option key={club.id} value={`${venue.id}::${club.id}`}>{club.name} — {venue.name}</option>)}</select></F>
                  <F label="Tên Đội trưởng *"><input required className={INP} value={form.captainName || ''} onChange={(e) => set({ captainName: e.target.value })} /></F>
                  <F label="Số điện thoại *"><input required className={INP} value={form.captainPhone || ''} onChange={(e) => set({ captainPhone: e.target.value })} /></F>
                  <F label="Zalo"><input className={INP} value={form.captainZalo || ''} onChange={(e) => set({ captainZalo: e.target.value })} /></F>
                  <F label="Gmail (Ẩn ở Public API)" tone="text-amber-300"><input type="email" className={INP} value={form.captainEmail || ''} onChange={(e) => set({ captainEmail: e.target.value })} /></F>
                  {renderCaptainAccountSection(String(form.clubKey || '').split('::')[1])}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer">Hủy</button>
                <button type="submit" disabled={saving || (modal.kind === 'session' && liveConflicts.length > 0 && !form.forceOverride)} className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenuesTab;
