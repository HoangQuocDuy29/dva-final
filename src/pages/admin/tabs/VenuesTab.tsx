import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin, Plus, Pencil, Trash2, Users, Clock, ExternalLink, Search, X, Upload, Loader2,
  Eye, EyeOff, Check, Layers, CalendarClock, AlertTriangle, Copy, Mail, Phone, Power, KeyRound, Minus,
} from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { userService, venueService } from '../../../services/api';
import { optimizeCloudinaryLogoUrl, optimizeCloudinaryUrl, uploadToCloudinary } from '../../../utils/cloudinary';
import type { CourtClubProfile, User, VenueCapacityMode, VenueFeeType, VenueGenderRule, VenuePlayStyle, VenueRecruitmentStatus, VenueSessionSlot, VenueType, VolleyballPosition, VolleyballVenue } from '../../../types';
import {
  VN_DAY_OPTIONS, PLAY_STYLE_META, GENDER_RULE_META, suggestGenderRule, RECRUITMENT_META, VENUE_TYPE_META, SESSION_POSITION_OPTIONS, HANOI_DISTRICTS, VIETNAM_CITIES, SURFACE_TYPES,
  getSubCourtNames, formatDaysOfWeek, formatShortVnDate, getVietnamNow, isSessionCancelledOnDate, buildGoogleMapsUrl, getClubInitials, findClientSessionConflicts, isVenueClosedNow,
} from '../../../utils/venueSchedule';

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
  const { isSuperAdmin, isCaptain, data: { venuesList }, setData: { setVenuesList }, notify } = useAdminDashboard();
  const [subTab, setSubTab] = useState<'VENUES' | 'CAPTAINS'>('VENUES');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [closureDrafts, setClosureDrafts] = useState<Record<string, { reason: string; until: string }>>({});
  const [cancelReasonDrafts, setCancelReasonDrafts] = useState<Record<string, string>>({});
  const [cancelDateDrafts, setCancelDateDrafts] = useState<Record<string, string>>({});
  const [captainUsers, setCaptainUsers] = useState<User[]>([]);
  const todayVn = getVietnamNow().dateStr;

  const toggleSessionDateOff = (venueId: string, s: VenueSessionSlot, dateStr: string, reason?: string) => {
    const cur = s.cancelledDates || [];
    const exists = cur.includes(dateStr);
    const next = exists ? cur.filter((d) => d !== dateStr) : [...cur, dateStr].sort();
    return quickPatchSession(
      venueId, s,
      { isCancelled: false, cancelledDates: next, ...(!exists && reason ? { cancelReason: reason } : {}) },
      exists ? `Đã mở lại buổi ${formatShortVnDate(dateStr)}.` : `Đã báo nghỉ buổi ${formatShortVnDate(dateStr)}.`
    );
  };

  const reload = async () => setVenuesList(await venueService.getAdminVenues());
  const loadCaptainUsers = async () => {
    if (!isSuperAdmin) return;
    try { setCaptainUsers((await userService.getUsers()).filter((u) => u.role === 'CAPTAIN')); } catch { /* ignore */ }
  };
  useEffect(() => { if (isSuperAdmin) void loadCaptainUsers(); }, [isSuperAdmin]);

  const set = (patch: Record<string, any>) => setForm((p) => ({ ...p, ...patch }));
  const toggleArr = (k: string, val: any) => setForm((p) => ({ ...p, [k]: (p[k] || []).includes(val) ? p[k].filter((x: any) => x !== val) : [...(p[k] || []), val] }));

  const quickPatchSession = async (venueId: string, s: VenueSessionSlot, patch: Record<string, any>, msg?: string) => {
    setBusySlotId(s.id);
    try {
      await venueService.updateSession(venueId, s.id, patch);
      await reload();
      if (msg) notify(msg, 2200);
    } catch (e: any) { notify(e?.message || 'Lỗi cập nhật ca chơi.', 3500); }
    finally { setBusySlotId(null); }
  };

  const allClubs = useMemo(() =>
    venuesList.flatMap((venue) => (venue.clubs || []).map((club) => ({ venue, club, sessions: (venue.sessions || []).filter((s) => s.clubId === club.id) }))),
  [venuesList]);

  const q = query.trim().toLowerCase();
  const filteredVenues = useMemo(() => !q ? venuesList : venuesList.filter((v) =>
    [v.name, v.address, v.district, ...(v.clubs || []).flatMap((c) => [c.name, c.captainName, c.captainPhone, c.captainEmail || ''])].some((s) => s.toLowerCase().includes(q))
  ), [venuesList, q]);

  const filteredCaptains = useMemo(() => !q ? allClubs : allClubs.filter(({ venue, club }) =>
    [club.captainName, club.captainPhone, club.captainEmail || '', club.name, venue.name].some((s) => s.toLowerCase().includes(q))
  ), [allClubs, q]);

  const liveConflicts = useMemo(() =>
    modal?.kind === 'session' ? findClientSessionConflicts(modal.venue.sessions || [], { daysOfWeek: form.daysOfWeek || [], startTime: form.startTime || '', endTime: form.endTime || '', subCourts: form.subCourts || [] }, modal.item?.id) : [],
  [modal, form.daysOfWeek, form.startTime, form.endTime, form.subCourts]);

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
      const c = next.item;
      const isFree = next.venue.venueType === 'FREE_PUBLIC';
      setForm({
        name: c?.name || '', slug: c?.slug || '', logoUrl: c?.logoUrl || '', coverUrl: c?.coverUrl || '',
        galleryUrls: [...(c?.galleryUrls || [])], captainName: c?.captainName || '', captainPhone: c?.captainPhone || '',
        captainZalo: c?.captainZalo || '', captainEmail: c?.captainEmail || '', captainUserId: c?.captainUserId || '',
        createCaptainAccount: false, newCaptainEmail: c?.captainEmail || '', newCaptainPassword: '',
        playStyle: c?.playStyle || 'FUN_GAME',
        tagsInput: c ? (c.tags || []).join(', ') : 'Giao lưu, Tuyển vãng lai', description: c?.description || '',
        feeType: c?.feeType || (isFree ? 'FREE' : 'PAID'), feeAmount: c?.feeAmount ?? (isFree ? 'Miễn phí' : '70k/buổi'), isActive: c ? c.isActive !== false : true,
      });
    } else if (next.kind === 'session') {
      if (!next.venue.clubs?.length) return notify('Hãy tạo ít nhất 1 CLB tại sân này trước.');
      const s = next.item;
      const cid = s?.clubId || presetClubId || next.venue.clubs[0].id;
      const clubStyle = next.venue.clubs.find((c) => c.id === cid)?.playStyle;
      setForm({
        clubId: cid, daysOfWeek: s ? [...s.daysOfWeek] : [1, 3, 5],
        startTime: s?.startTime || '19:00', endTime: s?.endTime || '21:30', subCourts: s ? [...s.subCourts] : [getSubCourtNames(next.venue.subCourtsCount)[0]],
        recruitmentStatus: s?.recruitmentStatus || 'CHECK_CAPTAIN',
        isCancelled: Boolean(s?.isCancelled), cancelledDates: [...(s?.cancelledDates || [])], cancelDatePick: '', cancelReason: s?.cancelReason || '',
        capacityMode: s?.capacityMode || 'UNLIMITED', currentPlayers: s?.currentPlayers ?? 0, maxPlayers: s?.maxPlayers ?? 14,
        neededPositions: [...(s?.neededPositions || [])], genderRule: s?.genderRule || suggestGenderRule(clubStyle), forceOverride: false,
      });
    } else if (next.kind === 'captain') {
      const targetClub = next.club || allClubs[0]?.club;
      const targetVenue = next.venue || allClubs[0]?.venue;
      if (!targetClub || !targetVenue) return notify('Hãy tạo ít nhất 1 CLB trước.');
      setForm({
        clubKey: `${targetVenue.id}::${targetClub.id}`, captainName: targetClub.captainName, captainPhone: targetClub.captainPhone,
        captainZalo: targetClub.captainZalo || '', captainEmail: targetClub.captainEmail || '',
        captainUserId: targetClub.captainUserId || '', createCaptainAccount: false, newCaptainEmail: targetClub.captainEmail || '', newCaptainPassword: '',
      });
    }
    setModal(next);
  };

  const handleUpload = async (files: FileList | null, field: string, subModule: string, multiple = false) => {
    if (!files?.length) return;
    setUploading(field);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, multiple ? 6 : 1)) urls.push((await uploadToCloudinary(f, 'courts', subModule)).url);
      setForm((p) => multiple ? { ...p, galleryUrls: [...(p.galleryUrls || []), ...urls].slice(0, 20) } : { ...p, [field]: urls[0] });
      notify('Đã tải ảnh lên Cloudinary!');
    } catch (e: any) { notify(e?.message || 'Lỗi tải ảnh Cloudinary.'); }
    finally { setUploading(null); }
  };

  const saveClosure = async (v: VolleyballVenue, nextClosed: boolean) => {
    const d = closureDrafts[v.id] ?? { reason: v.closureReason || '', until: v.closedUntil ? v.closedUntil.slice(0, 10) : '' };
    setSaving(true);
    try {
      await venueService.updateVenue(v.id, { isClosed: nextClosed, closureReason: nextClosed ? (d.reason.trim() || 'Sân tạm nghỉ lễ / bảo trì') : null, closedUntil: nextClosed && d.until ? d.until : null });
      await reload();
      notify(nextClosed ? `Đã bật TẠM NGHỈ "${v.name}".` : `Đã mở cửa "${v.name}".`);
    } catch (e: any) { notify(e?.message || 'Lỗi cập nhật trạng thái sân.'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      const resolveCaptainUserId = async (): Promise<string | null | undefined> => {
        if (!isSuperAdmin) return undefined;
        if (form.createCaptainAccount) {
          const email = String(form.newCaptainEmail || '').trim().toLowerCase();
          const password = String(form.newCaptainPassword || '');
          if (!email || password.length < 8) throw new Error('Nhập email hợp lệ và mật khẩu ≥ 8 ký tự để tạo tài khoản CAPTAIN.');
          const created = await userService.createUser({ email, password, name: form.captainName.trim() || email, role: 'CAPTAIN' });
          await loadCaptainUsers();
          return created.id;
        }
        return form.captainUserId ? String(form.captainUserId) : null;
      };

      if (modal.kind === 'venue') {
        const p = {
          name: form.name.trim(), ...(form.slug?.trim() ? { slug: form.slug.trim() } : {}), address: form.address.trim(), city: (form.city || 'Hà Nội').trim(), district: form.district.trim(),
          latitude: Number(form.latitude), longitude: Number(form.longitude), surfaceType: form.surfaceType, subCourtsCount: Number(form.subCourtsCount) || 1,
          venueType: form.venueType as VenueType, rentalPriceInfo: form.rentalPriceInfo?.trim() || null, entryNote: form.entryNote?.trim() || null,
          coverUrl: form.coverUrl?.trim() || null, isDvaOfficial: Boolean(form.isDvaOfficial), isFeatured: Boolean(form.isFeatured),
          isClosed: Boolean(form.isClosed), closureReason: form.isClosed ? (form.closureReason?.trim() || null) : null, closedUntil: form.isClosed && form.closedUntil ? form.closedUntil : null,
        };
        if (modal.item) await venueService.updateVenue(modal.item.id, p); else await venueService.createVenue(p);
      } else if (modal.kind === 'club') {
        const captainUserId = await resolveCaptainUserId();
        const p = {
          name: form.name.trim(), ...(!isCaptain && form.slug?.trim() ? { slug: form.slug.trim() } : {}), logoUrl: form.logoUrl?.trim() || null, coverUrl: form.coverUrl?.trim() || null,
          galleryUrls: form.galleryUrls || [], captainName: form.captainName.trim(), captainPhone: form.captainPhone.trim(),
          captainZalo: form.captainZalo?.trim() || null, captainEmail: form.captainEmail?.trim() || null,
          ...(isSuperAdmin ? { captainUserId } : {}),
          playStyle: form.playStyle as VenuePlayStyle,
          tags: String(form.tagsInput || '').split(',').map((s) => s.trim()).filter(Boolean), description: form.description?.trim() || null,
          feeType: form.feeType as VenueFeeType, feeAmount: form.feeType === 'FREE' ? (form.feeAmount?.trim() || 'Miễn phí') : (form.feeAmount?.trim() || null),
          ...(isSuperAdmin ? { isActive: Boolean(form.isActive) } : {}),
        };
        if (modal.item) await venueService.updateClub(modal.venue.id, modal.item.id, p); else await venueService.createClub(modal.venue.id, { ...p, isActive: Boolean(form.isActive) });
      } else if (modal.kind === 'session') {
        const p = {
          clubId: form.clubId, daysOfWeek: form.daysOfWeek, startTime: form.startTime, endTime: form.endTime, subCourts: form.subCourts,
          recruitmentStatus: form.recruitmentStatus as VenueRecruitmentStatus,
          isCancelled: Boolean(form.isCancelled), cancelledDates: (form.cancelledDates || []) as string[],
          cancelReason: (form.isCancelled || (form.cancelledDates || []).length > 0) ? (form.cancelReason?.trim() || null) : null,
          capacityMode: (form.capacityMode || 'UNLIMITED') as VenueCapacityMode,
          currentPlayers: Number(form.currentPlayers) || 0, maxPlayers: Math.max(1, Number(form.maxPlayers) || 14),
          neededPositions: (form.neededPositions || []) as VolleyballPosition[],
          genderRule: (form.genderRule || 'MIXED') as VenueGenderRule,
          forceOverride: Boolean(form.forceOverride),
        };
        if (modal.item) await venueService.updateSession(modal.venue.id, modal.item.id, p); else await venueService.createSession(modal.venue.id, p);
      } else {
        const [vId, cId] = String(form.clubKey || '').split('::');
        if (!vId || !cId) throw new Error('Vui lòng chọn CLB gắn với Đội trưởng.');
        const captainUserId = await resolveCaptainUserId();
        await venueService.updateClub(vId, cId, { captainName: form.captainName.trim(), captainPhone: form.captainPhone.trim(), captainZalo: form.captainZalo?.trim() || null, captainEmail: form.captainEmail?.trim() || null, captainUserId });
      }
      await reload();
      notify('Đã lưu thành công!');
      setModal(null);
    } catch (err: any) { notify(err?.message || 'Thao tác thất bại.', 4500); }
    finally { setSaving(false); }
  };

  const renderCaptainAccountSection = (currentClubId?: string) => {
    if (!isSuperAdmin) return null;
    const assignedByUser = new Map(allClubs.filter((r) => r.club.captainUserId && r.club.id !== currentClubId).map((r) => [r.club.captainUserId!, r.club.name]));
    return (
      <div className="sm:col-span-2 p-3 rounded-2xl bg-cyan-950/25 border border-cyan-500/35 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-cyan-300 inline-flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" />Tài khoản Đội trưởng tự quản lý (CAPTAIN · Tùy chọn)</span>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 cursor-pointer">
            <input type="checkbox" checked={Boolean(form.createCaptainAccount)} onChange={(e) => set({ createCaptainAccount: e.target.checked, ...(e.target.checked ? { newCaptainEmail: form.newCaptainEmail || form.captainEmail || '' } : {}) })} />
            + Tạo mới nhanh
          </label>
        </div>
        {!form.createCaptainAccount ? (
          <select className={INP} value={form.captainUserId || ''} onChange={(e) => set({ captainUserId: e.target.value })}>
            <option value="">— Không cấp tài khoản (Chỉ hiển thị liên hệ) —</option>
            {captainUsers.map((u) => {
              const other = assignedByUser.get(u.id);
              return <option key={u.id} value={u.id} disabled={Boolean(other)}>{u.fullName} ({u.email}){other ? ` — đã gán cho ${other}` : ''}</option>;
            })}
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

  const renderCaptainSelfService = () => {
    const entry = allClubs[0];
    if (!entry) {
      return (
        <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-8 text-center space-y-2">
          <Users className="w-10 h-10 text-cyan-400 mx-auto" />
          <h2 className="font-heading font-black text-lg text-white">Chưa có Đội / CLB được liên kết</h2>
          <p className="text-xs text-slate-400">Vui lòng liên hệ Superadmin để gắn tài khoản CAPTAIN của bạn với CLB trên Bản đồ sân.</p>
        </div>
      );
    }
    const { venue, club, sessions } = entry;
    const venueClosed = isVenueClosedNow(venue);
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {venueClosed && (
          <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/60 text-xs text-red-100 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div><strong className="uppercase">Sân {venue.name} đang tạm nghỉ:</strong> {venue.closureReason || 'Tạm đóng cửa'}</div>
          </div>
        )}
        <div className="bg-[#161F30] border border-cyan-500/35 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">
              {club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 120)} alt={club.name} className="w-full h-full object-cover" /> : <span className="font-heading font-black text-lg text-orange-400">{getClubInitials(club.name)}</span>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-full font-black uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">CAPTAIN · Tự Quản Lý</span>
                <a href={`/services/court-map/teams/${club.slug}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 font-bold hover:underline inline-flex items-center gap-0.5">Trang công khai <ExternalLink className="w-3 h-3" /></a>
              </div>
              <h2 className="font-heading font-black text-lg text-white truncate mt-0.5">{club.name}</h2>
              <p className="text-xs text-slate-400 truncate"><MapPin className="w-3 h-3 inline text-orange-400 mr-1" />{venue.name} · {venue.district}</p>
            </div>
          </div>
          <button type="button" onClick={() => openModal({ kind: 'club', venue, item: club })} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0">
            <Pencil className="w-3.5 h-3.5" />Sửa thông tin & ảnh đội
          </button>
        </div>

        <div className="space-y-3">
          {sessions.map((s) => {
            const busy = busySlotId === s.id;
            const cancelledToday = isSessionCancelledOnDate(s, todayVn);
            const dates = s.cancelledDates || [];
            const limited = s.capacityMode === 'LIMITED_SLOTS';
            const cur = s.currentPlayers ?? 0;
            const max = Math.max(1, s.maxPlayers ?? 14);
            const posList = s.neededPositions || [];
            const reasonDraft = cancelReasonDrafts[s.id] ?? (s.cancelReason || '');
            const datePick = cancelDateDrafts[s.id] || '';
            return (
              <div key={s.id} className={`rounded-3xl p-4 sm:p-5 border space-y-3.5 shadow-lg ${cancelledToday ? 'bg-[#131722] border-amber-500/50' : 'bg-[#161F30] border-slate-800'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 text-xs">{formatDaysOfWeek(s.daysOfWeek)}</span>
                      <span className="font-mono"><Clock className="w-3.5 h-3.5 inline mr-1 text-orange-400" />{s.startTime} – {s.endTime}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">{s.subCourts.map((sc) => <span key={sc} className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/35 text-[10px] font-bold">{sc}</span>)}</div>
                  </div>
                  <button type="button" disabled={busy} onClick={() => void toggleSessionDateOff(venue.id, s, todayVn, reasonDraft.trim() || 'Đội nghỉ buổi hôm nay')} className={`px-3.5 py-2 rounded-xl text-xs font-black border inline-flex items-center gap-1.5 cursor-pointer ${cancelledToday ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/45'}`}>
                    <Power className="w-3.5 h-3.5" />{cancelledToday ? `⚠️ Nghỉ hôm nay ${formatShortVnDate(todayVn)} (Mở lại)` : `Hoạt động · Báo nghỉ hôm nay`}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400">Báo nghỉ ngày khác:</span>
                  <input type="date" min={todayVn} value={datePick} onChange={(e) => setCancelDateDrafts((p) => ({ ...p, [s.id]: e.target.value }))} className="px-2.5 py-1 rounded-xl bg-[#0B0F19] border border-slate-700 text-white text-xs" />
                  <button type="button" disabled={busy || !datePick} onClick={() => { if (!datePick) return; void toggleSessionDateOff(venue.id, s, datePick, reasonDraft.trim() || undefined); setCancelDateDrafts((p) => ({ ...p, [s.id]: '' })); }} className="px-2.5 py-1 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-bold cursor-pointer disabled:opacity-40">+ Thêm</button>
                  {dates.map((d) => (
                    <button key={d} type="button" disabled={busy} onClick={() => void toggleSessionDateOff(venue.id, s, d)} className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer" title="Bấm để gỡ ngày nghỉ">
                      {formatShortVnDate(d)} <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>

                {(cancelledToday || dates.length > 0) && (
                  <div className="flex gap-2">
                    <input value={reasonDraft} onChange={(e) => setCancelReasonDrafts((p) => ({ ...p, [s.id]: e.target.value }))} placeholder="Lý do nghỉ (VD: Thiếu quân / mưa bão...)" className={INP} />
                    <button type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { cancelReason: reasonDraft.trim() || null }, 'Đã lưu lý do nghỉ.')} className="px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shrink-0 cursor-pointer">Lưu</button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400">Đối tượng:</span>
                  <div className="inline-flex bg-[#0B0F19] border border-slate-800 rounded-xl p-0.5 text-xs">
                    {(['MALE_ONLY', 'MIXED', 'FEMALE_ONLY'] as const).map((g) => (
                      <button key={g} type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { genderRule: g }, `Đã đổi: ${GENDER_RULE_META[g].label}`)} className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${(s.genderRule || 'MIXED') === g ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>{GENDER_RULE_META[g].shortLabel}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400">Chế độ quân số:</span>
                  <div className="inline-flex bg-[#0B0F19] border border-slate-800 rounded-xl p-0.5 text-xs">
                    {([['UNLIMITED', '∞ Không giới hạn'], ['LIMITED_SLOTS', 'Giới hạn slot']] as const).map(([m, lbl]) => (
                      <button key={m} type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { capacityMode: m }, `Đã chuyển sang ${lbl}.`)} className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${((s.capacityMode || 'UNLIMITED') === m) ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>{lbl}</button>
                    ))}
                  </div>
                </div>

                {limited && (
                  <div className="p-3 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">Số người hiện tại:</span>
                        <button type="button" disabled={busy || cur <= 0} onClick={() => void quickPatchSession(venue.id, s, { currentPlayers: Math.max(0, cur - 1) })} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer disabled:opacity-40"><Minus className="w-4 h-4" /></button>
                        <span className="min-w-10 text-center font-heading font-black text-base text-white tabular-nums">{cur}</span>
                        <button type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { currentPlayers: cur + 1 })} className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center cursor-pointer"><Plus className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-bold">Tối đa:</span>
                        <input type="number" min={1} max={100} defaultValue={max} onBlur={(e) => { const v = Math.max(1, Number(e.target.value) || 14); if (v !== max) void quickPatchSession(venue.id, s, { maxPlayers: v }, 'Đã cập nhật tối đa.'); }} className="w-16 px-2 py-1.5 rounded-lg bg-[#161F30] border border-slate-700 text-center font-bold text-white" />
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((cur / max) * 100))}%` }} /></div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400">Vị trí bóng chuyền đang thiếu (chạm để bật/tắt):</span>
                  <div className="flex flex-wrap gap-2">
                    {SESSION_POSITION_OPTIONS.map((p) => {
                      const on = posList.includes(p.code);
                      const nextPos = on ? posList.filter((x) => x !== p.code) : [...posList, p.code];
                      return (
                        <button key={p.code} type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { neededPositions: nextPos })} className={`px-3.5 py-2 rounded-xl text-xs font-black border cursor-pointer ${on ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-orange-400 shadow' : 'bg-[#0B0F19] text-slate-300 border-slate-700 hover:border-slate-500'}`}>
                          {p.code} <span className="font-normal opacity-75 text-[10px]">· {p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {isCaptain ? renderCaptainSelfService() : (
      <>
      {/* Header & Sub-tab Switcher */}
      <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded-full font-black uppercase bg-orange-500/15 text-orange-400 border border-orange-500/35">SUPERADMIN · Court Map</span>
              <a href="/services/court-map" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-sky-400 hover:underline inline-flex items-center gap-1">Bản Đồ Công Khai <ExternalLink className="w-3 h-3" /></a>
            </div>
            <h2 className="font-heading font-black text-xl text-white mt-1">Court Map, Hồ Sơ CLB & Danh Bạ Đội Trưởng</h2>
          </div>
          <button type="button" onClick={() => openModal(subTab === 'VENUES' ? { kind: 'venue' } : { kind: 'captain' })} className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow cursor-pointer self-start md:self-auto">
            {subTab === 'VENUES' ? <><Plus className="w-4 h-4" />Thêm Sân Mới</> : <><Users className="w-4 h-4" />Cập Nhật Đội Trưởng</>}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex bg-[#0F172A] border border-slate-800 rounded-xl p-1 self-start">
            {([['VENUES', `Danh sách Sân & Đội (${venuesList.length})`], ['CAPTAINS', `Danh bạ Đội trưởng (${allClubs.length})`]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSubTab(id)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${subTab === id ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{label}</button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm sân, CLB, đội trưởng, SĐT, Gmail..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-slate-700 text-xs text-white" />
          </div>
        </div>
      </div>

      {subTab === 'VENUES' ? (
        <div className="space-y-5">
          {filteredVenues.map((venue) => {
            const closed = isVenueClosedNow(venue);
            const draft = closureDrafts[venue.id] ?? { reason: venue.closureReason || '', until: venue.closedUntil ? venue.closedUntil.slice(0, 10) : '' };
            const vt = VENUE_TYPE_META[venue.venueType] || VENUE_TYPE_META.COMMERCIAL;
            return (
              <div key={venue.id} className={`bg-[#161F30] border rounded-3xl overflow-hidden shadow-xl ${closed ? 'border-red-500/50' : venue.isDvaOfficial ? 'border-orange-500/40' : 'border-slate-800'}`}>
                <div className="p-5 border-b border-slate-800 bg-[#111827]/75 space-y-3.5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">
                        {(venue.coverUrl || venue.imageUrl) ? <img src={optimizeCloudinaryUrl(venue.coverUrl || venue.imageUrl, 'thumb')} alt="" className="w-full h-full object-cover" /> : <MapPin className="w-6 h-6 text-orange-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1 text-[10px]">
                          {closed && <span className="px-2 py-0.5 rounded-full font-black bg-red-900 text-red-200 border border-red-500">TẠM NGHỈ</span>}
                          {venue.isDvaOfficial && <span className="px-2 py-0.5 rounded-full font-black bg-gradient-to-r from-red-600 to-orange-500 text-white">DVA Official</span>}
                          <span className={`px-2 py-0.5 rounded-full font-bold border ${vt.badgeClass}`}>{vt.label}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-semibold"><Layers className="w-3 h-3" />{venue.surfaceType} · {venue.subCourtsCount} sân</span>
                        </div>
                        <h3 className="font-heading font-black text-base text-white">{venue.name}</h3>
                        <p className="text-xs text-slate-300">{venue.address} · <a href={buildGoogleMapsUrl(venue)} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Maps ↗</a></p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <button type="button" onClick={() => openModal({ kind: 'club', venue })} className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />CLB</button>
                      <button type="button" onClick={() => openModal({ kind: 'session', venue })} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"><CalendarClock className="w-3.5 h-3.5" />Ca</button>
                      <button type="button" onClick={() => openModal({ kind: 'venue', item: venue })} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"><Pencil className="w-3.5 h-3.5" />Sửa</button>
                      <button type="button" onClick={async () => { if (!confirm(`Xóa sân "${venue.name}"?`)) return; await venueService.deleteVenue(venue.id); await reload(); notify('Đã xóa sân.'); }} className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {/* Quick Holiday Closure Control */}
                  <div className={`p-2.5 rounded-2xl border flex flex-col xl:flex-row xl:items-center gap-2 text-xs ${closed ? 'bg-red-950/35 border-red-500/45' : 'bg-[#0B0F19]/75 border-slate-800'}`}>
                    <button type="button" disabled={saving} onClick={() => void saveClosure(venue, !closed)} className={`px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer border ${closed ? 'bg-red-600 text-white border-red-400' : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'}`}>
                      <Power className="w-3.5 h-3.5" />{closed ? 'Tạm nghỉ sân (Mở lại)' : 'Đang mở cửa (Tạm nghỉ)'}
                    </button>
                    <input value={draft.reason} onChange={(e) => setClosureDrafts((p) => ({ ...p, [venue.id]: { ...draft, reason: e.target.value } }))} placeholder="Lý do tạm nghỉ (VD: Nghỉ lễ 30/4 - 1/5, Nghỉ Tết...)" className="flex-1 px-3 py-1.5 rounded-xl bg-[#111827] border border-slate-700 text-white" />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">Mở lại:</span>
                      <input type="date" value={draft.until} onChange={(e) => setClosureDrafts((p) => ({ ...p, [venue.id]: { ...draft, until: e.target.value } }))} className="px-2.5 py-1.5 rounded-xl bg-[#111827] border border-slate-700 text-white" />
                      <button type="button" disabled={saving} onClick={() => void saveClosure(venue, true)} className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer">Lưu nghỉ</button>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {(venue.clubs || []).map((club) => {
                      const st = PLAY_STYLE_META[club.playStyle] || PLAY_STYLE_META.FUN_GAME;
                      return (
                        <div key={club.id} className={`p-3 rounded-2xl border border-slate-800 bg-[#0F172A] flex items-center justify-between gap-2 ${club.isActive === false ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                              {club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 80)} alt="" className="w-full h-full object-cover" /> : <span className="font-heading font-black text-xs text-orange-400">{getClubInitials(club.name)}</span>}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1"><span className="font-bold text-xs text-white truncate">{club.name}</span><span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${st.badgeClass}`}>{st.emoji}</span>{club.captainUser && <span title={`CAPTAIN: ${club.captainUser.email}`} className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">🔑</span>}</div>
                              <p className="text-[10px] text-slate-400 truncate">{club.captainName} · {club.captainPhone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => openModal({ kind: 'session', venue }, club.id)} className="p-1 rounded-lg bg-emerald-950 text-emerald-300 cursor-pointer" title="Thêm ca"><Plus className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={async () => { await venueService.updateClub(venue.id, club.id, { isActive: !club.isActive }); await reload(); }} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">{club.isActive ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}</button>
                            <button type="button" onClick={() => openModal({ kind: 'club', venue, item: club })} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={async () => { if (!confirm(`Xóa CLB "${club.name}"?`)) return; await venueService.deleteClub(venue.id, club.id); await reload(); notify('Đã xóa CLB.'); }} className="p-1 rounded-lg bg-red-950/60 text-red-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0F172A]">
                    <table className="w-full text-left text-xs min-w-[780px]">
                      <thead><tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 bg-[#111827]"><th className="py-2 px-4">CLB & Lịch</th><th className="py-2 px-3">Trạng thái ca</th><th className="py-2 px-3">Quân số</th><th className="py-2 px-3">Vị trí thiếu</th><th className="py-2 px-4 text-right">Sửa/Xóa</th></tr></thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {(venue.sessions || []).map((s) => {
                          const club = s.club || venue.clubs.find((c) => c.id === s.clubId);
                          const rec = RECRUITMENT_META[s.recruitmentStatus] || RECRUITMENT_META.CHECK_CAPTAIN;
                          const busy = busySlotId === s.id;
                          const cancelled = isSessionCancelledOnDate(s, todayVn);
                          const offDates = s.cancelledDates || [];
                          const limited = s.capacityMode === 'LIMITED_SLOTS';
                          const cur = s.currentPlayers ?? 0;
                          const max = Math.max(1, s.maxPlayers ?? 14);
                          const posList = s.neededPositions || [];
                          return (
                            <tr key={s.id} className={`hover:bg-slate-800/30 ${cancelled ? 'opacity-65' : ''}`}>
                              <td className="py-2.5 px-4 space-y-0.5">
                                <div className="font-bold text-white flex items-center gap-1.5"><span>{club?.name}</span><span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${rec.badgeClass}`}>{rec.label}</span><span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${GENDER_RULE_META[s.genderRule || 'MIXED'].badgeClass}`}>{GENDER_RULE_META[s.genderRule || 'MIXED'].shortLabel}</span></div>
                                <div className="text-[11px] text-orange-300 font-semibold">{formatDaysOfWeek(s.daysOfWeek)} · <span className="font-mono text-slate-200">{s.startTime}–{s.endTime}</span> · <span className="text-sky-300">{s.subCourts.join(', ')}</span></div>
                              </td>
                              <td className="py-2.5 px-3 space-y-1">
                                <button type="button" disabled={busy} onClick={() => void toggleSessionDateOff(venue.id, s, todayVn, s.cancelReason || 'Đội nghỉ buổi hôm nay')} className={`px-2.5 py-1 rounded-lg text-[10px] font-black border cursor-pointer whitespace-nowrap ${cancelled ? 'bg-amber-500/20 text-amber-200 border-amber-400/60' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'}`}>
                                  {cancelled ? `⚠️ Nghỉ ${formatShortVnDate(todayVn)}` : '● Hoạt động'}
                                </button>
                                {offDates.filter((d) => d > todayVn).length > 0 && <div className="text-[10px] text-amber-300">Nghỉ trước: {offDates.filter((d) => d > todayVn).map(formatShortVnDate).join(', ')}</div>}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { capacityMode: limited ? 'UNLIMITED' : 'LIMITED_SLOTS' })} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer" title="Đổi chế độ quân số">
                                    {limited ? `${cur}/${max}` : '∞ Tự do'}
                                  </button>
                                  {limited && (
                                    <>
                                      <button type="button" disabled={busy || cur <= 0} onClick={() => void quickPatchSession(venue.id, s, { currentPlayers: Math.max(0, cur - 1) })} className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center justify-center cursor-pointer"><Minus className="w-3 h-3" /></button>
                                      <button type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { currentPlayers: cur + 1 })} className="w-5 h-5 rounded bg-sky-600 hover:bg-sky-500 text-white inline-flex items-center justify-center cursor-pointer"><Plus className="w-3 h-3" /></button>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {SESSION_POSITION_OPTIONS.map((p) => {
                                    const on = posList.includes(p.code);
                                    return (
                                      <button key={p.code} type="button" disabled={busy} onClick={() => void quickPatchSession(venue.id, s, { neededPositions: on ? posList.filter((x) => x !== p.code) : [...posList, p.code] })} className={`px-1.5 py-0.5 rounded text-[10px] font-black border cursor-pointer ${on ? 'bg-orange-500 text-white border-orange-300' : 'bg-[#0B0F19] text-slate-500 border-slate-700 hover:text-slate-200'}`}>
                                        {p.code}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <button type="button" onClick={() => openModal({ kind: 'session', venue, item: s })} className="p-1 rounded-lg bg-slate-800 text-slate-300 mr-1 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={async () => { if (!confirm('Xóa ca này?')) return; await venueService.deleteSession(venue.id, s.id); await reload(); notify('Đã xóa ca.'); }} className="p-1 rounded-lg bg-red-950/60 text-red-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SUB-TAB 2: DANH BẠ ĐỘI TRƯỞNG */
        <div className="bg-[#161F30] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Danh bạ Đội trưởng gắn theo từng Đội/CLB (Gmail ẩn khỏi Public API)</span>
            <span className="text-slate-400">{filteredCaptains.length} đội trưởng</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead><tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 bg-[#111827]"><th className="py-2.5 px-4">Đội trưởng</th><th className="py-2.5 px-3">Đội / CLB</th><th className="py-2.5 px-3">Sân & Lịch hoạt động</th><th className="py-2.5 px-3">Liên hệ (SĐT · Zalo · Gmail)</th><th className="py-2.5 px-4 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredCaptains.map(({ venue, club, sessions }) => (
                  <tr key={club.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                        {club.logoUrl ? <img src={optimizeCloudinaryLogoUrl(club.logoUrl, 80)} alt="" className="w-full h-full object-cover" /> : <span className="font-heading font-black text-[11px] text-orange-400">{getClubInitials(club.name)}</span>}
                      </div>
                      <span className="font-bold text-white">{club.captainName}</span>
                    </td>
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

      {/* SINGLE SHARED DRY MODAL (CREATE & EDIT) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#111827] border border-slate-700 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[#111827]/95 backdrop-blur border-b border-slate-800">
              <h3 className="font-heading font-black text-base text-white">
                {modal.kind === 'venue' ? (modal.item ? 'Sửa Địa Điểm Sân' : 'Thêm Sân Mới')
                  : modal.kind === 'club' ? `${modal.item ? 'Sửa' : 'Tạo'} Hồ Sơ CLB · ${modal.venue.name}`
                    : modal.kind === 'session' ? `${modal.item ? 'Sửa' : 'Thêm'} Ca · ${modal.venue.name}`
                      : 'Cập Nhật Đội Trưởng (Theo CLB)'}
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
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input className={INP} placeholder="Ảnh bìa URL..." value={form.coverUrl || ''} onChange={(e) => set({ coverUrl: e.target.value })} />
                    <label className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0">{uploading === 'coverUrl' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => void handleUpload(e.target.files, 'coverUrl', 'venues')} /></label>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-1.5 font-bold text-orange-300 cursor-pointer"><input type="checkbox" checked={Boolean(form.isDvaOfficial)} onChange={(e) => set({ isDvaOfficial: e.target.checked })} />DVA Official</label>
                    <label className="inline-flex items-center gap-1.5 font-bold text-amber-300 cursor-pointer"><input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(e) => set({ isFeatured: e.target.checked })} />Featured</label>
                    <label className="inline-flex items-center gap-1.5 font-bold text-red-300 cursor-pointer"><input type="checkbox" checked={Boolean(form.isClosed)} onChange={(e) => set({ isClosed: e.target.checked })} />Tạm nghỉ sân</label>
                  </div>
                  {form.isClosed && (<><F label="Lý do tạm nghỉ" tone="text-red-300"><input className={INP} value={form.closureReason || ''} onChange={(e) => set({ closureReason: e.target.value })} /></F><F label="Mở lại dự kiến" tone="text-red-300"><input type="date" className={INP} value={form.closedUntil || ''} onChange={(e) => set({ closedUntil: e.target.value })} /></F></>)}
                </div>
              )}

              {modal.kind === 'club' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <F label="Tên CLB *" full={isCaptain}><input required className={INP} value={form.name || ''} onChange={(e) => set({ name: e.target.value })} /></F>
                  {!isCaptain && <F label="Slug URL"><input className={INP} placeholder="tu-dong-tao" value={form.slug || ''} onChange={(e) => set({ slug: e.target.value })} /></F>}
                  <F label="Tên Đội trưởng *"><input required className={INP} value={form.captainName || ''} onChange={(e) => set({ captainName: e.target.value })} /></F>
                  <F label="SĐT Đội trưởng *"><input required className={INP} value={form.captainPhone || ''} onChange={(e) => set({ captainPhone: e.target.value })} /></F>
                  <F label="Zalo"><input className={INP} value={form.captainZalo || ''} onChange={(e) => set({ captainZalo: e.target.value })} /></F>
                  <F label="Gmail (Nội bộ Admin)" tone="text-amber-300"><input type="email" className={INP} value={form.captainEmail || ''} onChange={(e) => set({ captainEmail: e.target.value })} /></F>
                  {renderCaptainAccountSection(modal.item?.id)}
                  <F label="Mục đích chơi" full><select className={INP} value={form.playStyle} onChange={(e) => set({ playStyle: e.target.value })}><option value="COMPETITIVE">🔥 Đấu căng</option><option value="FUN_GAME">😊 Chơi vui</option><option value="TRAINING">🎯 Tập luyện</option></select></F>
                  <F label="Hình thức phí"><select className={INP} value={form.feeType} onChange={(e) => set({ feeType: e.target.value })}><option value="PAID">Thu phí</option><option value="FREE">Miễn phí (FREE)</option></select></F>
                  <F label="Mức phí"><input className={INP} value={form.feeAmount || ''} onChange={(e) => set({ feeAmount: e.target.value })} /></F>
                  <F label="Tags (dấu phẩy)" full><input className={INP} value={form.tagsInput || ''} onChange={(e) => set({ tagsInput: e.target.value })} /></F>
                  <F label="Mô tả CLB" full><textarea rows={2} className={INP} value={form.description || ''} onChange={(e) => set({ description: e.target.value })} /></F>
                  {(['logoUrl', 'coverUrl'] as const).map((k) => (
                    <div key={k} className="sm:col-span-2 flex items-center gap-2">
                      <input className={INP} placeholder={k === 'logoUrl' ? 'Logo URL...' : 'Cover URL...'} value={form[k] || ''} onChange={(e) => set({ [k]: e.target.value })} />
                      <label className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0">{uploading === k ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}{k === 'logoUrl' ? 'Logo' : 'Cover'}<input type="file" accept="image/*" className="hidden" onChange={(e) => void handleUpload(e.target.files, k, 'clubs')} /></label>
                    </div>
                  ))}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex justify-between"><span className="font-bold text-slate-300">Gallery ({(form.galleryUrls || []).length})</span><label className="px-2.5 py-1 rounded-lg bg-orange-600/20 border border-orange-500/40 text-orange-300 font-bold cursor-pointer">{uploading === 'gallery' ? 'Đang tải...' : '+ Thêm ảnh'}<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleUpload(e.target.files, 'gallery', 'clubs/gallery', true)} /></label></div>
                    {form.galleryUrls?.length > 0 && <div className="grid grid-cols-5 gap-2">{form.galleryUrls.map((u: string, i: number) => <div key={`${u}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700"><img src={optimizeCloudinaryUrl(u, 'thumb')} alt="" className="w-full h-full object-cover" /><button type="button" onClick={() => set({ galleryUrls: form.galleryUrls.filter((_: string, idx: number) => idx !== i) })} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/75 text-red-300 cursor-pointer"><X className="w-3 h-3" /></button></div>)}</div>}
                  </div>
                </div>
              )}

              {modal.kind === 'session' && (
                <div className="space-y-3">
                  <F label="CLB *"><select required className={INP} value={form.clubId} onChange={(e) => { const cid = e.target.value; const cs = (modal.venue.clubs || []).find((c) => c.id === cid)?.playStyle; set({ clubId: cid, ...(!modal.item ? { genderRule: suggestGenderRule(cs) } : {}) }); }}>{(modal.venue.clubs || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
                  <F label="Thứ trong tuần *"><div className="grid grid-cols-7 gap-1.5">{VN_DAY_OPTIONS.map((d) => <button key={d.value} type="button" onClick={() => toggleArr('daysOfWeek', d.value)} className={`py-2 rounded-xl border font-bold cursor-pointer ${(form.daysOfWeek || []).includes(d.value) ? 'bg-gradient-to-r from-red-600 to-orange-500 border-orange-400 text-white' : 'bg-[#0B0F19] border-slate-700 text-slate-400'}`}>{d.short}</button>)}</div></F>
                  <div className="grid grid-cols-2 gap-3"><F label="Bắt đầu *"><input required type="time" className={INP} value={form.startTime || ''} onChange={(e) => set({ startTime: e.target.value })} /></F><F label="Kết thúc *"><input required type="time" className={INP} value={form.endTime || ''} onChange={(e) => set({ endTime: e.target.value })} /></F></div>
                  <F label="Sân con *"><div className="flex flex-wrap gap-2">{getSubCourtNames(modal.venue.subCourtsCount).map((sc) => <button key={sc} type="button" onClick={() => toggleArr('subCourts', sc)} className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer ${(form.subCourts || []).includes(sc) ? 'bg-sky-600 border-sky-400 text-white' : 'bg-[#0B0F19] border-slate-700 text-slate-300'}`}>{sc}</button>)}</div></F>
                  {liveConflicts.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 space-y-1">
                      <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-400" />Trùng sân con: {liveConflicts.map((c) => `${c.clubName} (${formatDaysOfWeek(c.days)} ${c.startTime}–${c.endTime} · ${c.subCourts.join(', ')})`).join('; ')}</p>
                      <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer"><input type="checkbox" checked={Boolean(form.forceOverride)} onChange={(e) => set({ forceOverride: e.target.checked })} />Vẫn lưu đè cảnh báo</label>
                    </div>
                  )}
                  <F label="Trạng thái tuyển"><select className={INP} value={form.recruitmentStatus} onChange={(e) => set({ recruitmentStatus: e.target.value })}><option value="OPEN_RECRUIT">Đang tuyển slot</option><option value="CHECK_CAPTAIN">Hỏi đội trưởng</option><option value="FULL">Đã đủ người</option></select></F>
                  <F label="Đối tượng tham gia">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['MALE_ONLY', 'MIXED', 'FEMALE_ONLY'] as const).map((g) => (
                        <button key={g} type="button" onClick={() => set({ genderRule: g })} className={`py-2 px-2 rounded-xl border font-bold cursor-pointer ${(form.genderRule || 'MIXED') === g ? 'bg-purple-600 border-purple-400 text-white' : 'bg-[#0B0F19] border-slate-700 text-slate-300'}`}>{GENDER_RULE_META[g].label}</button>
                      ))}
                    </div>
                  </F>
                  <div className="p-3 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-2.5">
                    <label className="inline-flex items-center gap-2 font-bold text-amber-300 cursor-pointer">
                      <input type="checkbox" checked={(form.cancelledDates || []).includes(todayVn) || Boolean(form.isCancelled)} onChange={(e) => { const cur: string[] = form.cancelledDates || []; set({ isCancelled: false, cancelledDates: e.target.checked ? Array.from(new Set([...cur, todayVn])).sort() : cur.filter((d) => d !== todayVn) }); }} />
                      ⚠️ Báo nghỉ riêng buổi hôm nay ({formatShortVnDate(todayVn)})
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input type="date" min={todayVn} className="px-2.5 py-1.5 rounded-xl bg-[#111827] border border-slate-700 text-white text-xs" value={form.cancelDatePick || ''} onChange={(e) => set({ cancelDatePick: e.target.value })} />
                      <button type="button" disabled={!form.cancelDatePick} onClick={() => { if (!form.cancelDatePick) return; set({ isCancelled: false, cancelledDates: Array.from(new Set([...(form.cancelledDates || []), form.cancelDatePick])).sort(), cancelDatePick: '' }); }} className="px-2.5 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-bold cursor-pointer disabled:opacity-40">+ Báo nghỉ ngày khác</button>
                      {(form.cancelledDates || []).map((d: string) => (
                        <button key={d} type="button" onClick={() => set({ cancelledDates: (form.cancelledDates || []).filter((x: string) => x !== d) })} className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold inline-flex items-center gap-1 cursor-pointer">{formatShortVnDate(d)}<X className="w-3 h-3" /></button>
                      ))}
                    </div>
                    {((form.cancelledDates || []).length > 0 || form.isCancelled) && <input className={INP} placeholder="Lý do nghỉ (VD: Đội nghỉ buổi hôm nay do thiếu quân)" value={form.cancelReason || ''} onChange={(e) => set({ cancelReason: e.target.value })} />}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <F label="Chế độ quân số"><select className={INP} value={form.capacityMode || 'UNLIMITED'} onChange={(e) => set({ capacityMode: e.target.value })}><option value="UNLIMITED">∞ Không giới hạn</option><option value="LIMITED_SLOTS">Giới hạn slot</option></select></F>
                      {form.capacityMode === 'LIMITED_SLOTS' && (
                        <>
                          <F label="Hiện tại"><input type="number" min={0} max={100} className={INP} value={form.currentPlayers ?? 0} onChange={(e) => set({ currentPlayers: Number(e.target.value) })} /></F>
                          <F label="Tối đa"><input type="number" min={1} max={100} className={INP} value={form.maxPlayers ?? 14} onChange={(e) => set({ maxPlayers: Number(e.target.value) })} /></F>
                        </>
                      )}
                    </div>
                    <F label="Vị trí đang thiếu">
                      <div className="flex flex-wrap gap-1.5">
                        {SESSION_POSITION_OPTIONS.map((p) => (
                          <button key={p.code} type="button" onClick={() => toggleArr('neededPositions', p.code)} className={`px-3 py-1.5 rounded-xl border font-black cursor-pointer ${(form.neededPositions || []).includes(p.code) ? 'bg-gradient-to-r from-red-600 to-orange-500 border-orange-400 text-white' : 'bg-[#111827] border-slate-700 text-slate-300'}`}>{p.code}</button>
                        ))}
                      </div>
                    </F>
                  </div>
                </div>
              )}

              {modal.kind === 'captain' && (
                <div className="space-y-3">
                  <F label="Đội / CLB quản lý (Bắt buộc) *" tone="text-orange-300">
                    <select required className={INP} value={form.clubKey || ''} onChange={(e) => { const [vId, cId] = e.target.value.split('::'); const hit = allClubs.find((r) => r.venue.id === vId && r.club.id === cId); set({ clubKey: e.target.value, captainName: hit?.club.captainName || '', captainPhone: hit?.club.captainPhone || '', captainZalo: hit?.club.captainZalo || '', captainEmail: hit?.club.captainEmail || '', captainUserId: hit?.club.captainUserId || '', createCaptainAccount: false }); }}>
                      {allClubs.map(({ venue, club }) => <option key={club.id} value={`${venue.id}::${club.id}`}>{club.name} — {venue.name}</option>)}
                    </select>
                  </F>
                  <F label="Tên Đội trưởng *"><input required className={INP} value={form.captainName || ''} onChange={(e) => set({ captainName: e.target.value })} /></F>
                  <F label="Số điện thoại *"><input required className={INP} value={form.captainPhone || ''} onChange={(e) => set({ captainPhone: e.target.value })} /></F>
                  <F label="Zalo"><input className={INP} value={form.captainZalo || ''} onChange={(e) => set({ captainZalo: e.target.value })} /></F>
                  <F label="Gmail (Ẩn ở Public API)" tone="text-amber-300"><input type="email" className={INP} value={form.captainEmail || ''} onChange={(e) => set({ captainEmail: e.target.value })} /></F>
                  {renderCaptainAccountSection(String(form.clubKey || '').split('::')[1])}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer">Hủy</button>
                <button type="submit" disabled={saving || (modal.kind === 'session' && liveConflicts.length > 0 && !form.forceOverride)} className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenuesTab;
