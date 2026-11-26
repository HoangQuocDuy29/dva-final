import React from 'react';
import { Phone, MessageCircle, Send, Instagram } from 'lucide-react';

interface ContactBannerProps {
  className?: string;
  compact?: boolean;
}

export const ContactBanner: React.FC<ContactBannerProps> = ({ className = '', compact = false }) => {
  return (
    <div
      className={`dva-glass-panel rounded-3xl border-amber-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-5 sm:p-6 lg:p-7 relative overflow-hidden ${className}`}
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-60 h-30 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5 sm:gap-6">
        {/* Left Side: Callout text with amber phone icon */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 border border-amber-500/35 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <Phone className="w-5 h-5 text-amber-400 stroke-[2.2]" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading font-black text-sm sm:text-base lg:text-lg text-amber-300 tracking-wide uppercase">
                NEED IMMEDIATE COURT RESERVATION OR PREFER INSTANT CONFIRMATION?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Contact DVA Management directly via Hotline, Zalo, or WhatsApp for instant court lock without waiting for email review!
            </p>
          </div>
        </div>

        {/* Right Side: 4 Spatial Glassmorphism Interactive Social / Contact Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {/* 1. Hotline */}
          <a
            href="tel:0768299329"
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/50 text-amber-200 hover:text-white backdrop-blur-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Phone className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-sans tabular-nums">0768 299 329</span>
          </a>

          {/* 2. Zalo */}
          <a
            href="https://zalo.me/0768299329"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-sky-400/50 text-sky-200 hover:text-white backdrop-blur-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Chat Zalo</span>
          </a>

          {/* 3. WhatsApp */}
          <a
            href="https://wa.me/84768299329"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-400/50 text-emerald-200 hover:text-white backdrop-blur-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>WhatsApp</span>
          </a>

          {/* 4. Instagram */}
          <a
            href="https://www.instagram.com/_nathan.hq_/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-orange-500/40 text-pink-200 hover:text-white backdrop-blur-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
            <span>Instagram</span>
          </a>
        </div>
      </div>
    </div>
  );
};
