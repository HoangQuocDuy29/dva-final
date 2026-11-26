import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Lock, Mail, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { User as UserType } from '../../types';
import { authService } from '../../services/api';
import { RippleOrigin } from '../WaterRippleReveal';

const HUB_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'CAPTAIN', 'COACH', 'STAFF']);
export const getPostLoginPath = (role?: string) => (HUB_ROLES.has(role || '') ? '/admin/dashboard' : '/');

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType, origin?: RippleOrigin) => void;
  mode?: 'modal' | 'page';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, mode = 'modal' }) => {
  const isPage = mode === 'page';
  const navigate = useNavigate();
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const clickOriginRef = useRef<RippleOrigin | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const triggerShake = () => {
    setShakeKey(0);
    requestAnimationFrame(() => setShakeKey((k) => k + 1));
  };

  useEffect(() => {
    if (!isOpen || isPage) {
      if (!isOpen) setShowPassword(false);
      return undefined;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPage, isLoading, onClose]);

  if (!isPage && !isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage('Please enter your email address.');
      triggerShake();
      return;
    }
    if (!password) {
      setMessage('Please enter your password.');
      triggerShake();
      return;
    }

    const rect = submitBtnRef.current?.getBoundingClientRect();
    const origin: RippleOrigin = clickOriginRef.current || (rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    clickOriginRef.current = null;

    setIsLoading(true);
    setMessage(null);
    try {
      const res = await authService.login(email.trim(), password);
      authService.setCurrentUser(res.user);
      onSuccess(res.user, origin);
      const target = getPostLoginPath(res.user.role);
      if (isPage) navigate(target, { replace: true });
      else { onClose(); if (target !== '/') navigate(target); }
    } catch (err: any) {
      const msg = err?.message || '';
      setMessage(!msg || /invalid email or password/i.test(msg) ? 'You have entered an incorrect username or password.' : msg);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role={isPage ? undefined : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="auth-modal-title"
      onClick={isPage ? undefined : (e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      className={isPage
        ? 'min-h-screen -mt-20 flex flex-col items-center justify-center px-4 py-10 bg-transparent'
        : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-hidden animate-in fade-in duration-200'}
    >
      {isPage && (
        <div className="flex flex-col items-center gap-2.5 mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-white/15 bg-white/[0.05] p-0.5 shadow-[0_8px_28px_rgba(249,115,22,0.28)] mx-auto">
            <img src="/logo.png" alt="DVA Volleyball Club" className="w-full h-full object-cover rounded-full" />
          </div>
          <span className="font-heading font-black text-sm tracking-[0.2em] uppercase text-white/90">DVA VOLLEYBALL</span>
        </div>
      )}
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
        <div
          onAnimationEnd={(e) => { if (e.animationName === 'dva-shake-glow') setShakeKey(0); }}
          className={`dva-glass-panel relative w-full rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden text-white max-h-[90vh] flex flex-col ${shakeKey > 0 ? 'animate-dva-shake' : ''}`}
        >
          {/* Subtle top specular glass highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />

          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/10 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/15 p-0.5 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                {!logoFailed ? (
                  <img
                    src="/logo.png"
                    alt="DVA Volleyball Club"
                    onError={() => setLogoFailed(true)}
                    className="w-full h-full object-cover rounded-full"
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
            {!isPage && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                aria-label="Close"
                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Form */}
          <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar">
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label htmlFor="auth-email" className="block font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className={`relative group rounded-2xl bg-white/[0.05] border ${message ? 'border-rose-500/50' : 'border-white/10'} focus-within:border-orange-500/60 focus-within:bg-white/[0.08] transition-all`}>
                  <Mail className="w-4 h-4 text-white/40 group-focus-within:text-orange-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    id="auth-email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (message) setMessage(null); }}
                    placeholder="Enter your registered email address"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent rounded-2xl text-white text-base sm:text-[13px] placeholder:text-white/40 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className={`relative group rounded-2xl bg-white/[0.05] border ${message ? 'border-rose-500/50' : 'border-white/10'} focus-within:border-orange-500/60 focus-within:bg-white/[0.08] transition-all`}>
                  <Lock className="w-4 h-4 text-white/40 group-focus-within:text-orange-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="auth-password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (message) setMessage(null); }}
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-10 py-2.5 bg-transparent rounded-2xl text-white text-base sm:text-[13px] placeholder:text-white/40 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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

              {message && (
                <div role="alert" className="rounded-2xl bg-rose-500/10 border border-rose-500/35 backdrop-blur-md px-3.5 py-2.5 text-xs text-rose-200 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{message}</span>
                </div>
              )}

              <button
                ref={submitBtnRef}
                type="submit"
                disabled={isLoading}
                onClick={(e) => {
                  if (e.clientX || e.clientY) clickOriginRef.current = { x: e.clientX, y: e.clientY };
                }}
                className="group w-full py-3 px-4 rounded-full font-bold text-xs sm:text-[13px] text-white bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 shadow-[0_8px_24px_rgba(249,115,22,0.35)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-55 disabled:cursor-not-allowed"
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
      {isPage && (
        <Link to="/" className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all">← Về trang chủ</Link>
      )}
    </div>
  );
};
