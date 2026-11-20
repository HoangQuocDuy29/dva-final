import React, { useState, useEffect } from 'react';
import { X, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';

export const ChangePasswordModal: React.FC = () => {
  const {
    currentUser,
    isChangePasswordModalOpen,
    closeChangePasswordModal,
    onUserChange,
    notify,
  } = useAdminDashboard();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset sensitive form state every time the modal opens or closes
  useEffect(() => {
    if (!isChangePasswordModalOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setIsSaving(false);
      return undefined;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        closeChangePasswordModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChangePasswordModalOpen, isSaving, closeChangePasswordModal]);

  if (!isChangePasswordModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.trim().length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword.trim() === currentPassword.trim()) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (res.user && onUserChange) {
        onUserChange(res.user);
      }
      closeChangePasswordModal();
      notify('Đã đổi mật khẩu thành công! Các thiết bị đăng nhập cũ đã bị đăng xuất.', 4500);
    } catch (err: any) {
      setError(err?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) closeChangePasswordModal();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-[95%] sm:w-full max-w-md bg-[#0F1727] border border-slate-700 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600/25 to-orange-500/25 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id="change-password-modal-title" className="text-base font-black text-white leading-tight">
                Đổi Mật Khẩu Của Tôi
              </h3>
              <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeChangePasswordModal}
            disabled={isSaving}
            aria-label="Đóng"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Phiên làm việc hiện tại sẽ được giữ nguyên, toàn bộ thiết bị đăng nhập cũ sẽ tự động đăng xuất ngay lập tức.
          </span>
        </div>

        {error && (
          <div className="bg-red-950/70 border border-red-500/60 text-red-200 text-xs px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        {/* Current password */}
        <div className="space-y-1">
          <label htmlFor="self-current-password" className="block text-[11px] font-bold text-slate-400">
            Mật khẩu hiện tại
          </label>
          <div className="relative">
            <input
              id="self-current-password"
              name="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              className="w-full bg-[#0B1220] border border-slate-700 focus:border-orange-500 focus:outline-none rounded-xl pl-3 pr-10 py-2.5 text-xs text-white transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-1">
          <label htmlFor="self-new-password" className="block text-[11px] font-bold text-slate-400">
            Mật khẩu mới (tối thiểu 8 ký tự)
          </label>
          <div className="relative">
            <input
              id="self-new-password"
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ít nhất 8 ký tự"
              className="w-full bg-[#0B1220] border border-slate-700 focus:border-orange-500 focus:outline-none rounded-xl pl-3 pr-10 py-2.5 text-xs text-white transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm new password */}
        <div className="space-y-1">
          <label htmlFor="self-confirm-password" className="block text-[11px] font-bold text-slate-400">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <input
              id="self-confirm-password"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full bg-[#0B1220] border border-slate-700 focus:border-orange-500 focus:outline-none rounded-xl pl-3 pr-10 py-2.5 text-xs text-white transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu mới' : 'Hiện xác nhận mật khẩu mới'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={closeChangePasswordModal}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white text-xs font-bold disabled:opacity-60 cursor-pointer transition-all"
          >
            {isSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  );
};
