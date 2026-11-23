import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { User as UserType } from '../../types';
import { authService } from '../../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowPassword(false);
      return undefined;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const res = await authService.login(email.trim(), password);
      authService.setCurrentUser(res.user);
      onSuccess(res.user);
      onClose();

      // If user is Admin, SuperAdmin, or Captain, route immediately to dedicated workspace
      if (res.user.role === 'ADMIN' || res.user.role === 'SUPERADMIN' || res.user.role === 'CAPTAIN') {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md">
        {/* Ambient Brand Glow behind Frosted Glass Card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -left-10 w-52 h-52 rounded-full bg-rose-600/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -right-10 w-52 h-52 rounded-full bg-orange-500/20 blur-3xl"
        />

        {/* Main Frosted Glass Card */}
        <div className="relative w-full bg-[#0D1424]/70 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.18)] overflow-hidden text-white max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
          {/* Subtle top specular glass highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />

          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/10 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-600/25 via-red-600/20 to-orange-500/20 border border-white/15 ring-1 ring-orange-500/25 p-1.5 flex items-center justify-center shadow-lg shadow-rose-950/40 shrink-0 overflow-hidden">
                {!logoFailed ? (
                  <img
                    src="/logo.png"
                    alt="DVA Volleyball Club"
                    onError={() => setLogoFailed(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="font-heading font-black text-xs tracking-tight text-white">DVA</span>
                )}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-[0.14em] uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 mb-1">
                  OFFICIAL CLUB PORTAL
                </span>
                <h3 id="auth-modal-title" className="font-heading font-bold text-base sm:text-[17px] text-white leading-tight truncate">
                  DVA Account Portal
                </h3>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Secure Member &amp; Staff Sign In
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close"
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition shrink-0 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message notification */}
          {message && (
            <div className="mx-5 sm:mx-6 mt-4 rounded-xl bg-amber-500/10 border border-amber-400/30 px-3.5 py-2.5 text-xs text-amber-200 font-medium flex items-start gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{message}</span>
            </div>
          )}

          {/* Form */}
          <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar">
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label htmlFor="auth-email" className="block font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-orange-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    id="auth-email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email address"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-[13px] placeholder:text-slate-500 outline-none transition-all focus:bg-white/[0.07] focus:border-orange-500/70 focus:ring-4 focus:ring-orange-500/15"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-orange-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="auth-password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-[13px] placeholder:text-slate-500 outline-none transition-all focus:bg-white/[0.07] focus:border-orange-500/70 focus:ring-4 focus:ring-orange-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Helper row under Password */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 mt-2.5 text-[11px]">
                  <label className="inline-flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-white/20 bg-white/5 accent-orange-500 cursor-pointer"
                    />
                    <span>Remember session</span>
                  </label>
                  <span className="text-slate-400">
                    Forgot password? <span className="text-slate-300 font-medium">Contact Superadmin</span>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-[13px] text-white bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 shadow-lg shadow-orange-600/30 hover:shadow-orange-500/45 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
