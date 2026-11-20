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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResetting) onClose();
      }}
    >
      <div className="w-[95%] sm:w-full max-w-md bg-[#0F1727] border border-slate-700 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
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
                  className={`px-1.5 py-0.25 rounded text-[9px] font-black border shrink-0 ${
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
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedPassword ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Đã đặt lại mật khẩu & đăng xuất phiên cũ!</span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-400">Mật khẩu mới (copy gửi qua Zalo cho nhân sự):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#0B1220] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-300 tracking-wider select-all">
                    {completedPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(completedPassword)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <p className="text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
              Mật khẩu mới sẽ ghi đè ngay lập tức và đăng xuất tài khoản này trên mọi thiết bị đang đăng nhập.
            </p>

            {error && (
              <div className="bg-red-950/70 border border-red-500/60 text-red-200 text-xs px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="reset-staff-password" className="block text-[11px] font-bold text-slate-400">
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
                  className="w-full bg-[#0B1220] border border-slate-700 focus:border-amber-500 focus:outline-none rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-white transition-colors"
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
                  className="flex-1 px-3 py-2 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Tạo ngẫu nhiên (10 ký tự)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(newPassword)}
                  disabled={!newPassword}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white text-xs font-bold disabled:opacity-60 cursor-pointer transition-all"
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
