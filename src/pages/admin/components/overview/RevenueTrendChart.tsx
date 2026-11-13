import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAdminMetrics } from '../../hooks/useAdminMetrics';

const SERIES = [
  { key: 'court', label: 'Court Bookings', color: '#F97316' },
  { key: 'store', label: 'DVA Store', color: '#FACC15' },
  { key: 'guest', label: 'Guest Sessions', color: '#A855F7' },
  { key: 'tryout', label: 'Tryout Fees', color: '#10B981' },
  { key: 'training', label: 'Training (est.)', color: '#38BDF8' },
] as const;

const VIEW_W = 600;
const VIEW_H = 290;
const PAD_L = 48;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;

const compactVnd = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
};

/** 6-month stacked revenue chart — native SVG + CSS entrance animation, zero external chart deps (Spec 005, R-01). */
export const RevenueTrendChart: React.FC = () => {
  const { monthlyRevenue } = useAdminMetrics();
  const [hover, setHover] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const totals = monthlyRevenue.map(
    (p) => p.court + p.store + p.guest + p.tryout + p.training
  );
  const max = Math.max(...totals, 0);
  const isEmpty = max === 0;
  const niceMax = isEmpty ? 1 : max * 1.1;

  const sixMonthTotal = totals.reduce((sum, val) => sum + val, 0);
  const monthlyAvg = monthlyRevenue.length > 0 ? Math.round(sixMonthTotal / monthlyRevenue.length) : 0;
  let peakIndex = 0;
  for (let i = 1; i < totals.length; i++) {
    if (totals[i] > totals[peakIndex]) peakIndex = i;
  }
  const peakPoint = monthlyRevenue[peakIndex];
  const peakAmount = totals[peakIndex] ?? 0;

  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;
  const slot = plotW / Math.max(monthlyRevenue.length, 1);
  const barW = Math.min(44, slot * 0.55);
  const y = (v: number) => (v / niceMax) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const hovered = hover !== null ? monthlyRevenue[hover] : null;

  return (
    <div className="rounded-3xl bg-[#111827] border border-[#1E293B] p-6 flex flex-col justify-between h-full gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#F97316]" />
            Revenue Trend — Last 6 Months
          </h3>
          <p className="text-[11px] text-slate-500">
            Verified cashflow (Bookings, Shop, Guest Sessions, Tryout Fees) &amp; Est. Training Tuition
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex-1 min-h-[260px] flex flex-col justify-end">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto max-h-full"
          role="img"
          aria-label="Stacked bar chart of monthly club revenue"
          onMouseLeave={() => setHover(null)}
        >
          {/* Grid + Y axis labels */}
          {ticks.map((t) => {
            const gy = PAD_T + plotH - t * plotH;
            return (
              <g key={t}>
                <line x1={PAD_L} x2={VIEW_W - PAD_R} y1={gy} y2={gy} stroke="#1E293B" strokeDasharray={t === 0 ? '' : '3 4'} />
                {!isEmpty && (
                  <text x={PAD_L - 8} y={gy + 3} textAnchor="end" fontSize="10" fill="#64748B" fontFamily="ui-monospace, monospace">
                    {compactVnd(Math.round(niceMax * t))}
                  </text>
                )}
              </g>
            );
          })}

          {monthlyRevenue.map((p, i) => {
            const cx = PAD_L + slot * i + slot / 2;
            let stackTop = PAD_T + plotH;
            return (
              <g key={p.monthKey} onMouseEnter={() => setHover(i)}>
                {/* Hover hit area */}
                <rect x={cx - slot / 2} y={PAD_T} width={slot} height={plotH} fill={hover === i ? '#1E293B' : 'transparent'} opacity={0.5} rx={8} />
                {SERIES.map((s, si) => {
                  const h = y(p[s.key]);
                  if (h <= 0) return null;
                  stackTop -= h;
                  const isTop = SERIES.slice(si + 1).every((n) => p[n.key] <= 0);
                  const currentY = mounted ? stackTop : PAD_T + plotH;
                  const currentH = mounted ? h : 0;
                  return (
                    <rect
                      key={s.key}
                      x={cx - barW / 2}
                      y={currentY}
                      width={barW}
                      height={currentH}
                      rx={isTop ? 6 : 0}
                      fill={s.color}
                      style={{
                        transition: `y 550ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 45}ms, height 550ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 45}ms`,
                      }}
                    />
                  );
                })}
                <text x={cx} y={VIEW_H - 8} textAnchor="middle" fontSize="11" fill={hover === i ? '#FFFFFF' : '#94A3B8'} fontWeight={600}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-500 bg-[#111827]/90 px-3 py-1.5 rounded-lg border border-[#1E293B]">
              No verified revenue in the last 6 months
            </p>
          </div>
        )}

        {hovered && !isEmpty && (
          <div
            className="absolute top-2 pointer-events-none rounded-xl bg-[#0B0F19] border border-[#1E293B] shadow-xl px-3 py-2 text-[11px] min-w-[170px]"
            style={{
              left: `${((PAD_L + slot * hover! + slot / 2) / VIEW_W) * 100}%`,
              transform: hover! > monthlyRevenue.length / 2 ? 'translateX(-105%)' : 'translateX(5%)',
            }}
          >
            <p className="font-bold text-white mb-1">
              {hovered.label} {hovered.monthKey.slice(0, 4)}
            </p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-3 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono text-white tabular-nums">{hovered[s.key].toLocaleString('vi-VN')} đ</span>
              </p>
            ))}
            <p className="flex justify-between gap-3 mt-1 pt-1 border-t border-[#1E293B] font-bold text-white">
              <span>Total</span>
              <span className="font-mono tabular-nums">{totals[hover!].toLocaleString('vi-VN')} đ</span>
            </p>
          </div>
        )}
      </div>

      {/* Chart Footer: 6-Month Peak & Monthly Average */}
      <div className="pt-3 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>6-Month Peak Month:</span>
            <span className="font-mono font-bold text-white whitespace-nowrap">
              {peakPoint && peakAmount > 0
                ? `${peakPoint.label} ${peakPoint.monthKey.slice(0, 4)} · ${peakAmount.toLocaleString('vi-VN')} đ`
                : '—'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Monthly Average:</span>
            <span className="font-mono font-bold text-[#F97316] whitespace-nowrap tabular-nums">
              {monthlyAvg.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>6-Month Total:</span>
            <span className="font-mono font-bold text-emerald-400 whitespace-nowrap tabular-nums">
              {sixMonthTotal.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
