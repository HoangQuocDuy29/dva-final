import React from 'react';
import { Phone, MessageCircle, Send, Instagram } from 'lucide-react';

interface ContactBannerProps {
  className?: string;
  compact?: boolean;
}

export const ContactBanner: React.FC<ContactBannerProps> = ({ className = '', compact = false }) => {
  return (
    <div
      className={`rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#0C121E] via-[#101827] to-[#15132B] shadow-2xl p-5 sm:p-6 lg:p-7 relative overflow-hidden ${className}`}
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-60 h-30 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left Side: Callout text with yellow phone icon */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <Phone className="w-5 h-5 text-amber-400 stroke-[2.4]" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading font-black text-sm sm:text-base lg:text-lg text-amber-400 tracking-wide uppercase">
                NEED IMMEDIATE COURT RESERVATION OR PREFER INSTANT CONFIRMATION?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Contact DVA Management directly via Hotline, Zalo, or WhatsApp for instant court lock without waiting for email review!
            </p>
          </div>
        </div>

        {/* Right Side: Exact 4 colored buttons from design */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* 1. Hotline: Golden Yellow */}
          <a
            href="tel:0768299329"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-[#FFA000] to-[#FF8F00] text-black hover:brightness-110 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Phone className="w-4 h-4 fill-black stroke-black" />
            <span>Call 0768 299 329</span>
          </a>

          {/* 2. Zalo: Royal Blue */}
          <a
            href="https://zalo.me/0768299329"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[#1E6FFF] hover:bg-[#155de0] text-white shadow-lg shadow-blue-600/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 fill-white stroke-none" />
            <span>Chat Zalo</span>
          </a>

          {/* 3. WhatsApp: Emerald Green */}
          <a
            href="https://wa.me/84768299329"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[#10A361] hover:bg-[#0c8a50] text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          {/* 4. Instagram: Gradient Magenta/Pink */}
          <a
            href="https://www.instagram.com/_nathan.hq_/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#9333EA] via-[#E11D48] to-[#F59E0B] text-white hover:opacity-90 shadow-lg shadow-pink-600/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Instagram className="w-4 h-4" />
            <span>Instagram</span>
          </a>

        </div>

      </div>
    </div>
  );
};
