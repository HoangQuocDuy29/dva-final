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

const INP = 'w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500';

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
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-orange-400" />
              <h3 className="font-heading font-black text-base sm:text-lg text-white">
                Club Leadership, Technical &amp; Media Team
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
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
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
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
                  className={`rounded-3xl border p-5 bg-[#0E1524] flex flex-col justify-between gap-4 transition-all ${m.isActive ? `border-slate-800 ${theme.hoverBorder}` : 'border-slate-800/70 opacity-60'}`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 font-mono font-bold">
                        Thứ tự #{idx + 1} (order: {m.displayOrder})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${m.isActive ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {m.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-2.5">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${theme.avatarGradient} overflow-hidden relative flex items-center justify-center font-athletic font-black text-xl text-white shadow-lg`}>
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
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border inline-block ${theme.badgeColor}`}>
                          {m.badgeRole}
                        </span>
                        <h4 className="font-heading font-black text-base text-white">{m.name}</h4>
                        <p className={`text-[11px] font-semibold ${theme.subtitleColor}`}>{m.subtitle}</p>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{m.bio}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <p className="text-[11px] text-center text-slate-500 font-mono truncate">{m.footerRole}</p>

                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isBusy || idx === 0}
                          onClick={() => void handleMove(idx, -1)}
                          title="Đưa lên trước"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || idx === members.length - 1}
                          onClick={() => void handleMove(idx, 1)}
                          title="Đưa xuống sau"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggleActive(m)}
                          title={m.isActive ? 'Ẩn khỏi trang chủ' : 'Hiển thị trên trang chủ'}
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 border cursor-pointer ${m.isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
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
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(m)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-full sm:max-w-2xl bg-[#0B0D12]/90 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-2xl text-white max-h-[90dvh] overflow-y-auto no-scrollbar">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#161F30]/95 backdrop-blur border-b border-slate-800">
              <div>
                <h3 className="font-heading font-black text-base text-white">
                  {editing ? `Sửa Thành Viên: ${editing.name}` : 'Thêm Thành Viên Leadership'}
                </h3>
                <p className="text-[11px] text-slate-400">Hiển thị trực tiếp tại khối Leadership &amp; Operations ngoài trang Home.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Avatar Upload + Live Preview */}
              <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${previewTheme.avatarGradient} overflow-hidden relative flex items-center justify-center font-athletic font-black text-xl text-white shadow-lg shrink-0`}>
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
                    <label className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow">
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
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 font-semibold cursor-pointer"
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
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${active ? 'bg-slate-800 border-orange-400 text-white shadow' : 'bg-[#0B0F19] border-slate-700 text-slate-400 hover:text-slate-200'}`}
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
                    className={INP}
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 font-bold text-emerald-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <span>Hiển thị thẻ này ngoài trang chủ (Home)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold inline-flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
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
