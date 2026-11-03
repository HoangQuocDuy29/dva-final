import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { DVA_LANG_STORAGE_KEY, SupportedLanguage } from '../../lib/i18n';

interface LanguageSwitcherProps {
  className?: string;
}

/** Crisp inline SVG of the United Kingdom (Union Jack) Flag */
const UkFlagIcon: React.FC<{ className?: string }> = ({
  className = 'w-3.5 h-2.5 rounded-[2px] shrink-0 pointer-events-none overflow-hidden',
}) => {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `uk-clip-${uid}`;
  const diagClipId = `uk-diag-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 60 30"
      width="14"
      height="10"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M0,0 v30 h60 v-30 z" />
        </clipPath>
        <clipPath id={diagClipId}>
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${diagClipId})`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
};

/** Crisp inline SVG of the Vietnam Flag */
const VnFlagIcon: React.FC<{ className?: string }> = ({
  className = 'w-3.5 h-2.5 rounded-[2px] shrink-0 pointer-events-none overflow-hidden',
}) => (
  <svg
    viewBox="0 0 30 20"
    width="14"
    height="10"
    aria-hidden="true"
    className={className}
  >
    <rect width="30" height="20" fill="#DA251D" />
    <polygon
      points="15,4 16.47,8.52 21.22,8.52 17.38,11.31 18.85,15.83 15,13.04 11.15,15.83 12.62,11.31 8.78,8.52 13.53,8.52"
      fill="#FFFF00"
    />
  </svg>
);

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const rawLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase();
  const currentLang: SupportedLanguage = rawLang.startsWith('vi') ? 'vi' : 'en';

  const handleLanguageChange = (
    e: React.MouseEvent<HTMLButtonElement>,
    lang: SupportedLanguage
  ) => {
    e.stopPropagation();
    void i18n.changeLanguage(lang);
    try {
      window.localStorage.setItem(DVA_LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage quota / private mode errors
    }
  };

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={`relative z-30 pointer-events-auto inline-flex items-center h-8 sm:h-7.5 p-0.5 sm:p-1 rounded-full bg-slate-900/90 border border-slate-800 select-none touch-manipulation shrink-0 ${className}`}
    >
      {/* EN Segment */}
      <button
        type="button"
        onClick={(e) => handleLanguageChange(e, 'en')}
        aria-pressed={currentLang === 'en'}
        title="Switch to English"
        className={`relative z-10 pointer-events-auto inline-flex items-center justify-center gap-1 h-full min-w-[36px] sm:min-w-[38px] px-2.5 rounded-full text-[11px] leading-none transition-all duration-200 ease-out cursor-pointer select-none touch-manipulation ${
          currentLang === 'en'
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold shadow-sm'
            : 'text-slate-400 hover:text-slate-200 active:text-white text-xs font-semibold'
        }`}
      >
        {currentLang === 'en' && (
          <UkFlagIcon className="w-3.5 h-2.5 rounded-[2px] shrink-0 shadow-[0_0_2px_rgba(0,0,0,0.35)] pointer-events-none" />
        )}
        <span className="pointer-events-none select-none">EN</span>
      </button>

      {/* VI Segment */}
      <button
        type="button"
        onClick={(e) => handleLanguageChange(e, 'vi')}
        aria-pressed={currentLang === 'vi'}
        title="Switch to Vietnamese"
        className={`relative z-10 pointer-events-auto inline-flex items-center justify-center gap-1 h-full min-w-[36px] sm:min-w-[38px] px-2.5 rounded-full text-[11px] leading-none transition-all duration-200 ease-out cursor-pointer select-none touch-manipulation ${
          currentLang === 'vi'
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold shadow-sm'
            : 'text-slate-400 hover:text-slate-200 active:text-white text-xs font-semibold'
        }`}
      >
        {currentLang === 'vi' && (
          <VnFlagIcon className="w-3.5 h-2.5 rounded-[2px] shrink-0 shadow-[0_0_2px_rgba(0,0,0,0.35)] pointer-events-none" />
        )}
        <span className="pointer-events-none select-none">VI</span>
      </button>
    </div>
  );
};
