import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X, Loader2, AlertCircle, LogIn, Eye } from 'lucide-react';
import { venueService } from '../../services/api';
import type { RevealedSessionContact } from '../../types';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export interface ContactRevealTarget {
  sessionId: string;
  clubName: string;
  captainName: string;
}

interface ContactRevealModalProps {
  target: ContactRevealTarget | null;
  onClose: () => void;
  onRevealed: (contact: RevealedSessionContact) => void;
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không tải được Cloudflare Turnstile.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được Cloudflare Turnstile.'));
    document.head.appendChild(script);
  });
}

export const ContactRevealModal: React.FC<ContactRevealModalProps> = ({ target, onClose, onRevealed }) => {
  const siteKey = ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '').trim();
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(false);

  const submitReveal = async (payload: { turnstileToken?: string; humanVerified?: boolean }) => {
    if (!target || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const revealed = await venueService.revealSessionContact(target.sessionId, payload);
      onRevealed(revealed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể mở SĐT đội trưởng lúc này. Vui lòng thử lại.');
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.reset(widgetIdRef.current); } catch { /* ignore */ }
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!target) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [target, submitting, onClose]);

  useEffect(() => {
    if (!target || !siteKey) return;
    let cancelled = false;
    setWidgetLoading(true);
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !widgetRef.current || !window.turnstile) return;
        setWidgetLoading(false);
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          language: 'vi',
          callback: (token: string) => {
            void submitReveal({ turnstileToken: token });
          },
          'error-callback': () => {
            if (!cancelled) setError('Xác thực Cloudflare Turnstile gặp lỗi. Vui lòng thử lại.');
          },
          'expired-callback': () => {
            if (!cancelled) setError('Phiên xác thực đã hết hạn. Vui lòng tích lại.');
          },
        });
      })
      .catch((e: any) => {
        if (!cancelled) {
          setWidgetLoading(false);
          setError(e?.message || 'Không tải được tiện ích chống bot.');
        }
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.sessionId, siteKey]);

  if (!target) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      className="fixed inset-0 z-[980] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0B0D12]/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.75)] text-white overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h3 id="reveal-modal-title" className="font-heading font-black text-sm leading-tight text-white">
                Xác thực xem SĐT / Zalo
              </h3>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {target.clubName} · ĐT {target.captainName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Để bảo vệ thông tin Đội trưởng khỏi bot quét số tự động, vui lòng xác thực nhanh để xem SĐT &amp; Zalo thật.
          </p>

          {siteKey ? (
            <div className="min-h-[72px] rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex flex-col items-center justify-center">
              {widgetLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Đang tải Cloudflare Turnstile...</span>
                </div>
              )}
              <div ref={widgetRef} />
            </div>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitReveal({ humanVerified: true })}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Xác nhận người thật &amp; Hiện SĐT</span>
                </>
              )}
            </button>
          )}

          {submitting && siteKey && (
            <div className="flex items-center justify-center gap-2 text-orange-300 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang mở thông tin liên hệ...</span>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 space-y-2">
            <Link
              to="/login"
              onClick={onClose}
              className="w-full py-2.5 px-3.5 rounded-full dva-glass-pill hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-100 hover:text-orange-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5 text-orange-400" />
              <span>Đăng nhập để mở nhanh không cần Captcha</span>
            </Link>
            <p className="text-[10px] text-center text-slate-400">
              Khách: tối đa 5 lượt/ngày · Tài khoản DVA: 15 lượt/ngày
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
