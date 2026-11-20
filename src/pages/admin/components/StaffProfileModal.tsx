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
  onSave: (payload: { fullName: string; avatarUrl: string }) => Promise<void>;
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetId = targetUser?.id ?? null;

  useEffect(() => {
    if (!isOpen || !targetUser) return;
    setFullName(targetUser.fullName || '');
    setAvatarUrl(targetUser.avatarUrl || '');
    setError(null);
    setIsUploading(false);
    setIsSaving(false);
  }, [isOpen, targetId, targetUser?.fullName, targetUser?.avatarUrl]);

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
    setIsSaving(true);
    try {
      await onSave({ fullName: trimmedName, avatarUrl: avatarUrl.trim() });
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isUploading) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-[95%] sm:w-full max-w-md bg-[#0F1727] border border-slate-700 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
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
                  className={`px-1.5 py-0.25 rounded text-[9px] font-black border shrink-0 ${
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
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/70 border border-red-500/60 text-red-200 text-xs px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        {/* Avatar uploader (reuses Cloudinary utility) */}
        <div className="bg-[#0B1220] border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300">Ảnh đại diện (Cloudinary)</span>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                disabled={isUploading || isSaving}
                className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 cursor-pointer disabled:opacity-50"
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
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isUploading
                    ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
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
            className="w-full bg-[#0F1727] border border-slate-700 focus:border-orange-500 focus:outline-none rounded-xl px-3 py-2 text-[11px] font-mono text-white transition-colors"
          />
        </div>

        {/* Display Name */}
        <div className="space-y-1">
          <label htmlFor="staff-profile-name" className="block text-[11px] font-bold text-slate-400">
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
            className="w-full bg-[#0B1220] border border-slate-700 focus:border-orange-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUploading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white text-xs font-bold disabled:opacity-60 cursor-pointer transition-all"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </div>
      </form>
    </div>
  );
};
