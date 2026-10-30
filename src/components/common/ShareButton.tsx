import React, { useState, useRef, useEffect } from 'react';
import { Share2, Check } from 'lucide-react';

export interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title,
  text,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerCopiedFeedback = () => {
    setCopied(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 2000);
  };

  const copyFallback = async () => {
    try {
      await navigator.clipboard.writeText(url);
      triggerCopiedFeedback();
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      triggerCopiedFeedback();
    }
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

    if (isMobile && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: text || title, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    await copyFallback();
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      title={copied ? 'Đã chép link' : 'Chia sẻ đường dẫn'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
        copied
          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400'
          : className || 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200 hover:text-white'
      }`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Đã chép link</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 shrink-0" />
          <span>Chia sẻ</span>
        </>
      )}
    </button>
  );
};
