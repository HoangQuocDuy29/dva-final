import React, { useState, useEffect } from 'react';
import { X, KeyRound, Eye, EyeOff, Shuffle, Copy, Check, CheckCircle2 } from 'lucide-react';
import { User as UserType } from '../../../../types';
import { USER_ROLE_BADGE } from '../../constants';

export interface ResetPasswordModalProps {
  targetUser: UserType | null;
  onClose: () => void;
  onSubmit: (targetUser: UserType, newPassword: string) => Promise<boolean>;
  isResetting: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/** Cryptographically strong 10-char password avoiding ambiguous glyphs (0/O/1/l/I) for easy Zalo sharing. */
function generateStrongPassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!?';
  const all = upper + lower + digits + symbols;

  const randomIndex = (max: number): number => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  };

  const chars = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];

  while (chars.length < length) {
    chars.push(all[randomIndex(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  targetUser,
  onClose,
  onSubmit,
  isResetting,
  error,
  setError,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [completedPassword, setCompletedPassword] = useState<string | null>(null);

  const targetUserId = targetUser?.id ?? null;

  useEffect(() => {
    setNewPassword('');
    setShowPassword(false);
    setCopied(false);
    setCompletedPassword(null);
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResetting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetUserId, isResetting, onClose]);

  if (!targetUser) return null;

  const handleGenerate = () => {
    const generated = generateStrongPassword(10);
    setNewPassword(generated);
    setShowPassword(true);
    setCopied(false);
    setError(null);
  };

  const handleCopy = async (value: string) => {
    if (!value) return;
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = newPassword.trim();
    if (trimmed.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    const ok = await onSubmit(targetUser, trimmed);
    if (ok) {
      setCompletedPassword(trimmed);
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResetting) onClose();
      }}
    >
      <div className="w-[95%] sm:w-full max-w-md dva-glass-modal shadow-[0_24px_64px_rgba(0,0,0,0.8)] p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id="reset-password-modal-title" className="text-base font-black text-white leading-tight">
                Đặt Lại Mật Khẩu
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-300 font-semibold truncate">{targetUser.fullName}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black border shrink-0 ${
                    USER_ROLE_BADGE[targetUser.role] || USER_ROLE_BADGE.GUEST
                  }`}
                >
                  {targetUser.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{targetUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            aria-label="Đóng"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors duration-150 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {completedPassword ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-500/12 border border-emerald-500/35 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Đã đặt lại mật khẩu & đăng xuất phiên cũ!</span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-400">Mật khẩu mới (copy gửi qua Zalo cho nhân sự):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white/[0.04] border border-white/12 rounded-2xl px-3.5 py-2 text-sm font-mono font-bold text-amber-300 tracking-wider select-all">
                    {completedPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(completedPassword)}
                    className="h-9 px-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Đã Copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-5 rounded-full bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer transition-colors duration-150"
              >
                Xong
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <p className="text-[11px] text-slate-400 bg-white/[0.03] border border-white/10 rounded-2xl px-3.5 py-2.5">
              Mật khẩu mới sẽ ghi đè ngay lập tức và đăng xuất tài khoản này trên mọi thiết bị đang đăng nhập.
            </p>

            {error && (
              <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs px-3.5 py-2 rounded-2xl">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="reset-staff-password" className="block text-[11px] font-bold text-slate-300">
                Mật khẩu mới (tối thiểu 8 ký tự)
              </label>
              <div className="relative">
                <input
                  id="reset-staff-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setCopied(false);
                  }}
                  placeholder="Nhập mật khẩu mới hoặc bấm Tạo ngẫu nhiên"
                  className="w-full dva-glass-input pl-3.5 pr-10 py-2.5 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex-1 h-9 px-3.5 rounded-full bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/35 text-amber-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Tạo ngẫu nhiên (10 ký tự)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(newPassword)}
                  disabled={!newPassword}
                  className="h-9 px-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Đã Copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isResetting}
                className="h-9 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="h-9 px-5 rounded-full bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] disabled:opacity-60 cursor-pointer transition-colors duration-150"
              >
                {isResetting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
