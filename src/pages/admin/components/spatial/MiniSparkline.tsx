import React, { useId } from 'react';

export interface MiniSparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  values, width = 108, height = 34, stroke = '#F97316', className = '',
}) => {
  const gradId = useId();
  const data = values.length >= 2 ? values : [0, ...(values.length ? values : [0])];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = Math.max(max - min, 1);
  const pts = data.map((v, i) => `${(3 + (i / (data.length - 1)) * (width - 6)).toFixed(1)},${(height - 4 - ((v - min) / span) * (height - 8)).toFixed(1)}`);
  const [lastX, lastY] = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={`overflow-visible shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`3,${height - 2} ${pts.join(' ')} ${width - 3},${height - 2}`} fill={`url(#${gradId})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.8" fill={stroke} stroke="#0B0D12" strokeWidth="1.2" />
    </svg>
  );
};
