import React, { useEffect, useState } from 'react';
import { subscribeApiLoading } from '../../services/api';

/**
 * Ultra-thin 2px Cherry-to-Orange Spatial top progress bar.
 * Automatically activates whenever any background API request is in flight.
 */
export const GlobalTopLoader: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeApiLoading((count) => {
      if (count > 0) {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        if (!showTimer) {
          showTimer = setTimeout(() => {
            setVisible(true);
            showTimer = null;
          }, 120);
        }
      } else {
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = null;
        }
        hideTimer = setTimeout(() => {
          setVisible(false);
          hideTimer = null;
        }, 180);
      }
    });

    return () => {
      unsubscribe();
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="dva-top-loader" role="progressbar" aria-label="Đang tải dữ liệu">
      <div className="dva-top-loader-bar" />
    </div>
  );
};

interface SlowServerPillProps {
  active: boolean;
  delayMs?: number;
  label?: string;
  className?: string;
}

/**
 * Subtle frosted-glass reassurance pill that appears only when initial loading exceeds 2.5s
 * (e.g., cold serverless startup or slow mobile network).
 */
export const SlowServerPill: React.FC<SlowServerPillProps> = ({
  active,
  delayMs = 2500,
  label = 'Đang kết nối máy chủ DVA Arena...',
  className = '',
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  if (!show) return null;

  return (
    <div className={`flex justify-center pt-3 dva-content-reveal ${className}`}>
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/12 shadow-[0_12px_30px_rgba(0,0,0,0.45)] text-xs font-medium text-slate-300">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
        </span>
        <span>{label}</span>
      </div>
    </div>
  );
};
