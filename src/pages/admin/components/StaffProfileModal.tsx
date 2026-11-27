import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Trash2, UserCog } from 'lucide-react';
import { User as UserType } from '../../../types';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { USER_ROLE_BADGE } from '../constants';
import { RoleAvatarRing } from './RoleAvatarRing';

export interface StaffProfileModalProps {
  isOpen: boolean;
  mode: 'self' | 'staff';
  targetUser: UserType | null;
  onClose: () => void;
  onSave: (payload: { fullName: string; avatarUrl: string; email?: string }) => Promise<void>;
  notify: (message: string, durationMs?: number) => void;
}

export const StaffProfileModal: React.FC<StaffProfileModalProps> = ({
  isOpen,
  mode,
  targetUser,
  onClose,
  onSave,
  notify,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetId = targetUser?.id ?? null;

  useEffect(() => {
    if (!isOpen || !targetUser) return;
    setFullName(targetUser.fullName || '');
    setEmail(targetUser.email || '');
    setAvatarUrl(targetUser.avatarUrl || '');
    setError(null);
    setIsUploading(false);
    setIsSaving(false);
  }, [isOpen, targetId, targetUser?.fullName, targetUser?.email, targetUser?.avatarUrl]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isUploading, onClose]);

  if (!isOpen || !targetUser) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP...).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh vượt quá giới hạn 10MB.');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const res = await uploadToCloudinary(file, 'staff');
      setAvatarUrl(res.url);
      notify(`Đã tải ảnh đại diện lên Cloud (${res.folder}).`, 3000);
    } catch {
      setError('Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setError('Tên hiển thị phải có ít nhất 2 ký tự.');
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (mode === 'staff' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError('Email đăng nhập không hợp lệ.');
    setIsSaving(true);
    try {
      await onSave({ fullName: trimmedName, avatarUrl: avatarUrl.trim(), ...(mode === 'staff' ? { email: trimmedEmail } : {}) });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu thông tin hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  const title = mode === 'self' ? 'Hồ Sơ & Ảnh Đại Diện' : 'Sửa Hồ Sơ & Avatar Nhân Sự';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isUploading) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-[95%] sm:w-full max-w-md dva-glass-modal shadow-[0_24px_64px_rgba(0,0,0,0.8)] p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600/25 to-orange-500/25 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <UserCog className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id="staff-profile-modal-title" className="text-base font-black text-white leading-tight">
                {title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-400 truncate">{targetUser.email}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black border shrink-0 ${
                    USER_ROLE_BADGE[targetUser.role] || USER_ROLE_BADGE.GUEST
                  }`}
                >
                  {targetUser.role}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUploading}
            aria-label="Đóng"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors duration-150 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs px-3.5 py-2 rounded-2xl">
            {error}
          </div>
        )}

        {/* Avatar uploader (reuses Cloudinary utility) */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300">Ảnh đại diện (Cloudinary)</span>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                disabled={isUploading || isSaving}
                className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa ảnh</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <RoleAvatarRing
              name={fullName || targetUser.fullName}
              avatarUrl={avatarUrl}
              role={targetUser.role}
              email={targetUser.email}
              size="xl"
            />
            <div className="flex-1 space-y-2 min-w-0">
              <label
                className={`h-8 px-3.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 transition-colors duration-150 ${
                  isUploading
                    ? 'bg-white/[0.04] text-slate-400 border-white/10 cursor-wait'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border-white/12 cursor-pointer'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    <span>Đang tải lên Cloud...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tải ảnh lên (Cloudinary)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploading || isSaving}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-[10px] text-slate-500">
                Nếu bỏ trống ảnh, hệ thống tự động hiển thị chữ cái đầu tên.
              </p>
            </div>
          </div>

          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Hoặc dán trực tiếp URL ảnh Cloudinary / CDN..."
            className="w-full dva-glass-input px-3 py-2 text-[11px] font-mono"
          />
        </div>

        {mode === 'staff' && (
          <div className="space-y-1">
            <label htmlFor="staff-profile-email" className="block text-[11px] font-bold text-slate-300">Email đăng nhập</label>
            <input id="staff-profile-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="captain@gmail.com" className="w-full dva-glass-input px-3.5 py-2.5 text-xs" />
          </div>
        )}

        {/* Display Name */}
        <div className="space-y-1">
          <label htmlFor="staff-profile-name" className="block text-[11px] font-bold text-slate-300">
            Tên hiển thị
          </label>
          <input
            id="staff-profile-name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="VD: Hoàng Quốc Duy"
            className="w-full dva-glass-input px-3.5 py-2.5 text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUploading}
            className="h-9 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="h-9 px-5 rounded-full bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] disabled:opacity-60 cursor-pointer transition-colors duration-150"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </div>
      </form>
    </div>
  );
};
