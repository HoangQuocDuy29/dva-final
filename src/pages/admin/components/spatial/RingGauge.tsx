import React from 'react';

export interface RingGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

export const RingGauge: React.FC<RingGaugeProps> = ({
  value, size = 104, strokeWidth = 8, strokeColor = '#F97316', label, sublabel, className = '',
}) => {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label || `${Math.round(pct)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-mono font-black text-white leading-none tabular-nums" style={{ fontSize: Math.max(13, Math.round(size * 0.21)) }}>{label ?? `${Math.round(pct)}%`}</span>
        {sublabel && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300/80 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
};
