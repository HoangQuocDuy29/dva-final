import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown, ArrowUp, Crown, Edit3, Eye, EyeOff, Loader2, Plus, Trash2, Upload, X, Check,
} from 'lucide-react';
import type { LeadershipAccentColor, LeadershipMember, LeadershipMemberPayload } from '../../../types';
import { leadershipService } from '../../../services/api';
import { optimizeCloudinaryUrl, uploadToCloudinary } from '../../../utils/cloudinary';
import {
  LEADERSHIP_ACCENT_OPTIONS, getLeadershipInitials, getLeadershipTheme,
} from '../../../utils/leadership';
import { useAdminDashboard } from '../context/AdminDashboardContext';

const INP = 'w-full px-3.5 py-2 text-xs dva-glass-input';

const emptyForm = (nextOrder: number): LeadershipMemberPayload => ({
  name: '',
  badgeRole: '',
  subtitle: '',
  bio: '',
  footerRole: 'Role : ',
  avatarUrl: '',
  accentColor: 'orange',
  displayOrder: nextOrder,
  isActive: true,
});

export const LeadershipTab: React.FC = () => {
  const { notify } = useAdminDashboard();
  const [members, setMembers] = useState<LeadershipMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadershipMember | null>(null);
  const [form, setForm] = useState<LeadershipMemberPayload>(() => emptyForm(0));

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await leadershipService.getAdminList();
      setMembers(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      notify(e?.message || 'Không thể tải danh sách Leadership.', 4000);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const openCreate = () => {
    const nextOrder = members.length ? Math.max(...members.map((m) => m.displayOrder)) + 1 : 0;
    setEditing(null);
    setForm(emptyForm(nextOrder));
    setModalOpen(true);
  };

  const openEdit = (m: LeadershipMember) => {
    setEditing(m);
    setForm({
      name: m.name,
      badgeRole: m.badgeRole,
      subtitle: m.subtitle,
      bio: m.bio,
      footerRole: m.footerRole,
      avatarUrl: m.avatarUrl || '',
      accentColor: (m.accentColor || 'orange') as LeadershipAccentColor,
      displayOrder: m.displayOrder,
      isActive: m.isActive,
    });
    setModalOpen(true);
  };

  const handleUploadAvatar = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, 'staff', 'leadership');
      setForm((p) => ({ ...p, avatarUrl: res.url }));
      notify('Đã tải ảnh đại diện lên Cloudinary!', 2500);
    } catch (e: any) {
      notify(e?.message || 'Lỗi tải ảnh lên Cloudinary.', 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: LeadershipMemberPayload = {
        name: form.name.trim(),
        badgeRole: form.badgeRole.trim(),
        subtitle: form.subtitle.trim(),
        bio: form.bio.trim(),
        footerRole: form.footerRole.trim(),
        avatarUrl: form.avatarUrl?.trim() || null,
        accentColor: form.accentColor || 'orange',
        displayOrder: Number.isFinite(Number(form.displayOrder)) ? Number(form.displayOrder) : 0,
        isActive: form.isActive !== false,
      };
      if (editing) {
        await leadershipService.update(editing.id, payload);
        notify(`Đã cập nhật "${payload.name}"!`, 2800);
      } else {
        await leadershipService.create(payload);
        notify(`Đã thêm "${payload.name}" vào Leadership Team!`, 2800);
      }
      setModalOpen(false);
      setEditing(null);
      await loadMembers();
    } catch (err: any) {
      notify(err?.message || 'Lưu thông tin thất bại.', 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: LeadershipMember) => {
    setBusyId(m.id);
    try {
      await leadershipService.update(m.id, { isActive: !m.isActive });
      notify(m.isActive ? `Đã ẩn "${m.name}" khỏi trang chủ.` : `Đã hiển thị "${m.name}" trên trang chủ.`, 2500);
      await loadMembers();
    } catch (e: any) {
      notify(e?.message || 'Cập nhật trạng thái thất bại.', 3500);
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= members.length) return;
    const a = members[idx];
    const b = members[targetIdx];
    const orderA = a.displayOrder === b.displayOrder ? targetIdx : b.displayOrder;
    const orderB = a.displayOrder === b.displayOrder ? idx : a.displayOrder;
    setBusyId(a.id);
    try {
      await Promise.all([
        leadershipService.update(a.id, { displayOrder: orderA }),
        leadershipService.update(b.id, { displayOrder: orderB }),
      ]);
      await loadMembers();
    } catch (e: any) {
      notify(e?.message || 'Đổi thứ tự thất bại.', 3500);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (m: LeadershipMember) => {
    if (!window.confirm(`Xóa "${m.name}" khỏi danh sách Leadership & Operations?`)) return;
    setBusyId(m.id);
    try {
      await leadershipService.remove(m.id);
      notify(`Đã xóa "${m.name}".`, 2800);
      await loadMembers();
    } catch (e: any) {
      notify(e?.message || 'Xóa thành viên thất bại.', 3500);
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = members.filter((m) => m.isActive).length;
  const previewTheme = getLeadershipTheme(form.accentColor);

  return (
    <>
      <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-5 dva-content-reveal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Crown className="w-5 h-5 text-orange-400 shrink-0" />
              <h3 className="font-heading font-black text-base sm:text-lg text-white">
                Club Leadership, Technical &amp; Media Team
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 tabular-nums">
                {activeCount}/{members.length} hiển thị
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Quản lý toàn bộ thành viên, chức danh, ảnh đại diện Cloudinary, màu nhấn &amp; thứ tự hiển thị ngoài trang chủ (Home).
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="h-9 px-4 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold text-xs rounded-full inline-flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer shrink-0 transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Thành Viên</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-400 space-y-2">
            <Crown className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Chưa có thành viên Leadership nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m, idx) => {
              const theme = getLeadershipTheme(m.accentColor);
              const isBusy = busyId === m.id;
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-5 bg-white/[0.03] hover:bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between gap-4 transition-colors duration-150 ${m.isActive ? `border-white/10 ${theme.hoverBorder}` : 'border-white/[0.06] opacity-60'}`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 font-mono font-bold tabular-nums">
                        Thứ tự #{idx + 1} (order: {m.displayOrder})
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold border ${m.isActive ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' : 'bg-white/[0.04] text-slate-400 border-white/10'}`}>
                        {m.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-2.5">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${theme.avatarGradient} overflow-hidden relative flex items-center justify-center font-athletic font-black text-xl text-white shadow-lg border border-white/15`}>
                        {m.avatarUrl && (
                          <img
                            src={optimizeCloudinaryUrl(m.avatarUrl, 'thumb')}
                            alt={m.name}
                            className="w-full h-full object-cover relative z-10"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center">
                          {getLeadershipInitials(m.name)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border inline-block ${theme.badgeColor}`}>
                          {m.badgeRole}
                        </span>
                        <h4 className="font-heading font-black text-base text-white">{m.name}</h4>
                        <p className={`text-[11px] font-semibold ${theme.subtitleColor}`}>{m.subtitle}</p>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{m.bio}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                    <p className="text-[11px] text-center text-slate-400 font-mono truncate">{m.footerRole}</p>

                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy || idx === 0}
                          onClick={() => void handleMove(idx, -1)}
                          title="Đưa lên trước"
                          className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/12 text-slate-200 disabled:opacity-35 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || idx === members.length - 1}
                          onClick={() => void handleMove(idx, 1)}
                          title="Đưa xuống sau"
                          className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/12 text-slate-200 disabled:opacity-35 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggleActive(m)}
                          title={m.isActive ? 'Ẩn khỏi trang chủ' : 'Hiển thị trên trang chủ'}
                          className={`h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border cursor-pointer transition-colors duration-150 ${m.isActive ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/20' : 'bg-white/[0.05] text-slate-300 border-white/12 hover:bg-white/[0.12]'}`}
                        >
                          {m.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{m.isActive ? 'Hiện' : 'Ẩn'}</span>
                        </button>
                      </div>

                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => openEdit(m)}
                          className="h-8 px-3 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/12 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors duration-150"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(m)}
                          className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 text-slate-300 hover:text-rose-300 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
                          title="Xóa thành viên"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="w-full max-w-full sm:max-w-2xl dva-glass-modal shadow-[0_24px_64px_rgba(0,0,0,0.8)] text-white max-h-[90dvh] overflow-y-auto no-scrollbar">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-[#0B0D12]/95 border-b border-white/10">
              <div className="min-w-0">
                <h3 className="font-heading font-black text-base text-white truncate">
                  {editing ? `Sửa Thành Viên: ${editing.name}` : 'Thêm Thành Viên Leadership'}
                </h3>
                <p className="text-[11px] text-slate-400">Hiển thị trực tiếp tại khối Leadership &amp; Operations ngoài trang Home.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors duration-150 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Avatar Upload + Live Preview */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${previewTheme.avatarGradient} overflow-hidden relative flex items-center justify-center font-athletic font-black text-xl text-white shadow-lg border border-white/15 shrink-0`}>
                  {form.avatarUrl && (
                    <img
                      src={optimizeCloudinaryUrl(form.avatarUrl, 'thumb')}
                      alt={form.name || 'Preview'}
                      className="w-full h-full object-cover relative z-10"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    {getLeadershipInitials(form.name || 'DVA')}
                  </span>
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="h-8 px-3.5 rounded-full bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] transition-colors duration-150">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploading ? 'Đang tải Cloudinary...' : 'Tải ảnh đại diện'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        className="hidden"
                        onChange={(e) => void handleUploadAvatar(e.target.files)}
                      />
                    </label>
                    {form.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, avatarUrl: '' }))}
                        className="h-8 px-3 rounded-full bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 text-slate-300 hover:text-rose-300 font-semibold cursor-pointer transition-colors duration-150"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={form.avatarUrl || ''}
                    onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                    placeholder="Hoặc dán trực tiếp URL ảnh Cloudinary..."
                    className={INP}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Họ tên *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="VD: Hoang Quoc Duy"
                    className={INP}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Badge Role (Nhãn trên) *</label>
                  <input
                    required
                    value={form.badgeRole}
                    onChange={(e) => setForm((p) => ({ ...p, badgeRole: e.target.value }))}
                    placeholder="VD: FOUNDER & CLUB MANAGER"
                    className={INP}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Chức danh phụ (Subtitle) *</label>
                  <input
                    required
                    value={form.subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="VD: Operations & Community Lead"
                    className={INP}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Footer Role (Dòng Role cuối thẻ) *</label>
                  <input
                    required
                    value={form.footerRole}
                    onChange={(e) => setForm((p) => ({ ...p, footerRole: e.target.value }))}
                    placeholder="VD: Role : Senior Squad Captain"
                    className={INP}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Mô tả nhiệm vụ (Bio) *</label>
                <textarea
                  required
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Mô tả vai trò, đóng góp và nhiệm vụ tại DVA Volleyball Club..."
                  className={INP}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1.5">Màu chủ đạo thẻ</label>
                  <div className="flex flex-wrap gap-2">
                    {LEADERSHIP_ACCENT_OPTIONS.map((opt) => {
                      const active = form.accentColor === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, accentColor: opt.id }))}
                          className={`h-8 px-3 rounded-full border text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors duration-150 ${active ? 'bg-orange-500/20 border-orange-500/50 text-orange-200' : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.08]'}`}
                        >
                          <span className={`w-3 h-3 rounded-full ${opt.swatch}`} />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={form.displayOrder ?? 0}
                    onChange={(e) => setForm((p) => ({ ...p, displayOrder: Number(e.target.value) }))}
                    className={`${INP} tabular-nums`}
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 font-bold text-emerald-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="accent-emerald-500"
                />
                <span>Hiển thị thẻ này ngoài trang chủ (Home)</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white font-semibold cursor-pointer transition-colors duration-150"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="h-9 px-5 rounded-full bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold inline-flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer disabled:opacity-50 transition-colors duration-150"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editing ? 'Lưu Thay Đổi' : 'Thêm Thành Viên'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
