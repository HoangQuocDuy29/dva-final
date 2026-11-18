import React, { useState } from 'react';
import { Pencil, Plus, Trash2, Upload, UserCheck, Loader2, X, Check, Link2 } from 'lucide-react';
import { OFFICIAL_ROLE_LABELS, Tournament, TournamentOfficial, TournamentOfficialRole } from '../../../../types';
import { tournamentService } from '../../../../services/api';
import { buildCloudinaryFolder, uploadToCloudinary } from '../../../../utils/cloudinary';
import { OfficialAvatar } from '../../../../components/tournaments/OfficialAvatar';

interface OfficialAvatarFieldProps {
  value: string;
  onChange: (nextUrl: string) => void;
  previewName: string;
  uploading: boolean;
  onUploadFile: (file?: File) => void;
  previewSizeClass?: string;
  label?: string;
  containerClass?: string;
}

/**
 * Shared dual-mode avatar field supporting both direct image URL paste and Cloudinary file upload,
 * paired with a live fallback-safe avatar preview.
 */
const OfficialAvatarField: React.FC<OfficialAvatarFieldProps> = ({
  value,
  onChange,
  previewName,
  uploading,
  onUploadFile,
  previewSizeClass = 'w-12 h-12',
  label,
  containerClass = 'bg-[#0B0F19] border-[#1E293B]',
}) => (
  <div className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl border ${containerClass}`}>
    <OfficialAvatar
      avatarUrl={value}
      fullName={previewName}
      sizeClass={previewSizeClass}
      bgClass="bg-[#111827] border-slate-700"
      textClass="font-heading font-black text-base text-[#38BDF8]"
      preset="thumb"
    />
    <div className="flex-1 min-w-[200px] space-y-1.5">
      {label && <label className="block text-[11px] font-bold text-slate-300">{label}</label>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Link2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste image URL (https://...) or upload ->"
            title="Image URL (Cloudinary or any public HTTPS image)"
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#111827] border border-[#1E293B] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/60"
          />
          {value.trim() && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Clear image URL"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/60 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <label
          className={`px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold inline-flex items-center gap-1.5 shrink-0 ${
            uploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{uploading ? 'Uploading...' : value.trim() ? 'Replace File' : 'Upload File'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onUploadFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {value.trim() && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2.5 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/50 text-red-300 font-bold cursor-pointer shrink-0"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  </div>
);

interface OfficialsPanelProps {
  tournament: Tournament;
  onRefresh: () => Promise<void>;
  notify: (msg: string, durationMs?: number) => void;
}

export const OfficialsPanel: React.FC<OfficialsPanelProps> = ({
  tournament,
  onRefresh,
  notify,
}) => {
  // Quick Add state
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<TournamentOfficialRole>('MAIN_REFEREE');
  const [certification, setCertification] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit Modal state
  const [editingOfficial, setEditingOfficial] = useState<TournamentOfficial | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<TournamentOfficialRole>('MAIN_REFEREE');
  const [editCertification, setEditCertification] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSortOrder, setEditSortOrder] = useState('1');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  /** Shared Cloudinary upload helper targeting `dva_club/tournaments/officials`. */
  const uploadOfficialPhoto = async (
    file: File | undefined,
    setBusy: (busy: boolean) => void,
    onDone: (url: string) => void
  ) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'officials'));
      onDone(res.secure_url || res.url);
    } catch {
      notify('Avatar upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const countAssignedMatches = (officialId: string) =>
    tournament.matches.filter(
      (m) =>
        m.officialId === officialId ||
        (Array.isArray(m.assistantOfficialIds) && m.assistantOfficialIds.includes(officialId))
    ).length;

  const openEditModal = (off: TournamentOfficial) => {
    setEditingOfficial(off);
    setEditFullName(off.fullName);
    setEditRole(off.role);
    setEditCertification(off.certification || '');
    setEditPhone(off.phone || '');
    setEditSortOrder(String(off.sortOrder ?? 0));
    setEditAvatarUrl(off.avatarUrl || '');
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditingOfficial(null);
  };

  const handleAddOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      notify('Official full name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      await tournamentService.addOfficial(tournament.id, {
        fullName: fullName.trim(),
        role,
        certification: certification.trim() || undefined,
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        sortOrder: tournament.officials.length + 1,
      });
      setFullName('');
      setCertification('');
      setPhone('');
      setAvatarUrl('');
      await onRefresh();
      notify('Tournament official added.');
    } catch (err: any) {
      notify(err?.message || 'Unable to add official.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfficial) return;
    const trimmedName = editFullName.trim();
    if (trimmedName.length < 2) {
      notify('Official full name must be at least 2 characters.');
      return;
    }
    const rawOrder = Number(editSortOrder);
    const normalizedOrder = Number.isFinite(rawOrder)
      ? Math.max(0, Math.min(200, Math.round(rawOrder)))
      : 0;

    setEditSaving(true);
    try {
      const assignedCount = countAssignedMatches(editingOfficial.id);
      const updated = await tournamentService.updateOfficial(editingOfficial.id, {
        fullName: trimmedName,
        role: editRole,
        certification: editCertification.trim() || null,
        phone: editPhone.trim() || null,
        avatarUrl: editAvatarUrl.trim() || null,
        sortOrder: normalizedOrder,
      });
      setEditingOfficial(null);
      await onRefresh();
      notify(
        assignedCount > 0
          ? `Updated "${updated.fullName}" and synced ${assignedCount} assigned match(es).`
          : `Updated official "${updated.fullName}".`
      );
    } catch (err: any) {
      notify(err?.message || 'Unable to update official.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (official: TournamentOfficial) => {
    if (!window.confirm(`Remove official ${official.fullName}?`)) return;
    try {
      await tournamentService.deleteOfficial(tournament.id, official.id);
      if (editingOfficial?.id === official.id) {
        setEditingOfficial(null);
      }
      await onRefresh();
      notify(`Removed ${official.fullName}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to remove official.');
    }
  };

  const editingAssignedCount = editingOfficial ? countAssignedMatches(editingOfficial.id) : 0;

  return (
    <div className="space-y-5">
      {/* Quick Add Official Form */}
      <form
        onSubmit={handleAddOfficial}
        className="rounded-3xl bg-[#111827] border border-[#1E293B] p-5 space-y-3 text-xs"
      >
        <h4 className="font-bold text-sm text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#38BDF8]" />
          Add Referee / Match Official
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Full Name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TournamentOfficialRole)}
            className="px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
          >
            {Object.entries(OFFICIAL_ROLE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Certification (e.g. National Level 1)"
            value={certification}
            onChange={(e) => setCertification(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
          />
          <input
            type="text"
            placeholder="Phone (Admin only)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-300"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-stretch gap-3">
          <div className="flex-1 min-w-0">
            <OfficialAvatarField
              value={avatarUrl}
              onChange={setAvatarUrl}
              previewName={fullName || 'OF'}
              uploading={uploading}
              onUploadFile={(file) => void uploadOfficialPhoto(file, setUploading, setAvatarUrl)}
              previewSizeClass="w-12 h-12"
              label="Avatar Photo (Optional · Paste Image URL or Upload to Cloudinary)"
            />
          </div>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-5 py-3 rounded-2xl bg-[#38BDF8] hover:bg-sky-400 text-slate-950 font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Adding...' : 'Add Official'}</span>
          </button>
        </div>
      </form>

      {/* Officials Grid */}
      {tournament.officials.length === 0 ? (
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-8 text-center text-xs text-slate-500">
          No officials assigned yet. Add referees, line judges, or match scorers above so they can be assigned to matches.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournament.officials.map((off) => {
            const assignedCount = countAssignedMatches(off.id);
            return (
              <div
                key={off.id}
                className="rounded-2xl bg-[#111827] border border-[#1E293B] p-4 flex items-center gap-3.5 hover:border-slate-700 transition-colors"
              >
                <OfficialAvatar
                  avatarUrl={off.avatarUrl}
                  fullName={off.fullName}
                  sizeClass="w-12 h-12"
                  preset="thumb"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm truncate">{off.fullName}</div>
                  <div className="text-[11px] font-semibold text-[#38BDF8] flex items-center gap-1.5 flex-wrap">
                    <span>{OFFICIAL_ROLE_LABELS[off.role] || off.role}</span>
                    {assignedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-950/70 border border-sky-800/60 text-[9px] font-mono text-sky-300">
                        {assignedCount} match{assignedCount > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                  {off.certification && (
                    <div className="text-[10px] text-slate-400 truncate">{off.certification}</div>
                  )}
                  {off.phone && (
                    <div className="text-[10px] font-mono text-slate-500">{off.phone}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(off)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-sky-950 text-slate-300 hover:text-sky-300 cursor-pointer"
                    title="Edit official"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(off)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
                    title="Remove official"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Official Modal */}
      {editingOfficial && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-[#111827] border border-[#1E293B] shadow-2xl overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#38BDF8]" />
                <h4 className="font-heading font-black text-base text-white">
                  Edit Official / Referee
                </h4>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editSaving}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editingAssignedCount > 0 && (
                <div className="px-3 py-2 rounded-xl bg-sky-950/40 border border-sky-700/50 text-sky-200 text-[11px]">
                  Assigned to <strong>{editingAssignedCount}</strong> match(es). Saving will automatically sync name &amp; role across Schedule and Live Matches.
                </div>
              )}

              {/* Live Avatar Preview + Image URL Input + Upload File */}
              <OfficialAvatarField
                value={editAvatarUrl}
                onChange={setEditAvatarUrl}
                previewName={editFullName.trim() || editingOfficial.fullName}
                uploading={editUploading}
                onUploadFile={(file) => void uploadOfficialPhoto(file, setEditUploading, setEditAvatarUrl)}
                previewSizeClass="w-16 h-16"
                label="Official Avatar (Paste Image URL or Upload to dva_club/tournaments/officials)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. Nguyễn Văn Trọng Tài"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Role *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as TournamentOfficialRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
                  >
                    {Object.entries(OFFICIAL_ROLE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Certification / Rank</label>
                  <input
                    type="text"
                    value={editCertification}
                    onChange={(e) => setEditCertification(e.target.value)}
                    placeholder="e.g. Trọng tài cấp Quốc gia"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone (Admin Only · Private)</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSaving}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || editUploading || editFullName.trim().length < 2}
                  className="px-5 py-2 rounded-xl bg-[#38BDF8] hover:bg-sky-400 text-slate-950 font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
