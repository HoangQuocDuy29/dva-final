import React, { useState } from 'react';
import { Plus, Trash2, Upload, UserCheck, Loader2 } from 'lucide-react';
import { OFFICIAL_ROLE_LABELS, Tournament, TournamentOfficial, TournamentOfficialRole } from '../../../../types';
import { tournamentService } from '../../../../services/api';
import { buildCloudinaryFolder, optimizeCloudinaryUrl, uploadToCloudinary } from '../../../../utils/cloudinary';

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
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<TournamentOfficialRole>('MAIN_REFEREE');
  const [certification, setCertification] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUploadAvatar = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, buildCloudinaryFolder('tournaments', 'officials'));
      setAvatarUrl(res.secure_url || res.url);
    } catch {
      notify('Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
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

  const handleDelete = async (official: TournamentOfficial) => {
    if (!window.confirm(`Remove official ${official.fullName}?`)) return;
    try {
      await tournamentService.deleteOfficial(tournament.id, official.id);
      await onRefresh();
      notify(`Removed ${official.fullName}.`);
    } catch (err: any) {
      notify(err?.message || 'Unable to remove official.');
    }
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
          <div className="flex items-center gap-2">
            <label className="flex-1 px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] hover:border-[#38BDF8]/50 text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer truncate">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />}
              <span>{avatarUrl ? 'Photo Ready' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadAvatar(e.target.files?.[0])}
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-sky-400 text-slate-950 font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </form>

      {/* Officials Grid */}
      {tournament.officials.length === 0 ? (
        <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-8 text-center text-xs text-slate-500">
          No officials assigned yet. Add referees, line judges, or match scorers above so they can be assigned to matches.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournament.officials.map((off) => (
            <div
              key={off.id}
              className="rounded-2xl bg-[#111827] border border-[#1E293B] p-4 flex items-center gap-3.5"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#0B0F19] border border-[#1E293B] overflow-hidden shrink-0 flex items-center justify-center font-black text-sky-400">
                {off.avatarUrl ? (
                  <img
                    src={optimizeCloudinaryUrl(off.avatarUrl, 'thumb')}
                    alt={off.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  off.fullName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm truncate">{off.fullName}</div>
                <div className="text-[11px] font-semibold text-[#38BDF8]">
                  {OFFICIAL_ROLE_LABELS[off.role] || off.role}
                </div>
                {off.certification && (
                  <div className="text-[10px] text-slate-400 truncate">{off.certification}</div>
                )}
                {off.phone && (
                  <div className="text-[10px] font-mono text-slate-500">{off.phone}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(off)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-300 cursor-pointer"
                title="Remove official"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
