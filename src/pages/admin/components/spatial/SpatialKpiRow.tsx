import React from 'react';
import {
  Users,
  Wallet,
  Activity,
  CalendarClock,
  DoorOpen,
  Award,
  Dumbbell,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { RingGauge } from './RingGauge';
import { MiniSparkline } from './MiniSparkline';

export interface SpatialKpiItem {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'orange' | 'emerald' | 'rose' | 'sky' | 'amber';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  sparkline?: number[];
  gaugePct?: number;
  gaugeLabel?: string;
  gaugeSublabel?: string;
  onClick?: () => void;
}

const BADGE_TONE: Record<NonNullable<SpatialKpiItem['badgeTone']>, string> = {
  orange: 'bg-orange-500/15 text-orange-300 border-orange-400/35',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-400/35',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-400/35',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-400/35',
};

export const SpatialKpiRow: React.FC<{ items: SpatialKpiItem[] }> = ({ items }) => (
  <section aria-label="Key Performance Indicators" className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {items.slice(0, 3).map((item) => {
      const Icon = item.icon;
      const interactive = Boolean(item.onClick);
      return (
        <div
          key={item.id}
          onClick={item.onClick}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.onClick?.();
                  }
                }
              : undefined
          }
          className={`relative overflow-hidden rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 flex items-center justify-between gap-4 shadow-xl shadow-black/25 transition-all duration-200 ${
            interactive ? 'hover:bg-white/[0.07] hover:border-white/20 cursor-pointer' : ''
          }`}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white/90" />
              </span>
              <span className="text-xs font-semibold text-slate-300 truncate">{item.label}</span>
            </div>
            <div className="font-mono font-black text-2xl text-white tracking-tight tabular-nums truncate pt-0.5">
              {item.value}
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    BADGE_TONE[item.badgeTone || 'orange']
                  }`}
                >
                  {item.badge}
                </span>
              )}
              <span className="text-[11px] text-slate-400 truncate">{item.subtitle}</span>
            </div>
          </div>

          {item.gaugePct !== undefined ? (
            <RingGauge
              value={item.gaugePct}
              size={72}
              strokeWidth={7}
              strokeColor={item.accentColor}
              label={item.gaugeLabel}
              sublabel={item.gaugeSublabel}
            />
          ) : item.sparkline ? (
            <div className="shrink-0 self-end pb-1">
              <MiniSparkline values={item.sparkline} width={96} height={36} stroke={item.accentColor} />
            </div>
          ) : null}
        </div>
      );
    })}
  </section>
);

export const KPI_ICONS = {
  Users,
  Wallet,
  Activity,
  CalendarClock,
  DoorOpen,
  Award,
  Dumbbell,
  Trophy,
  Sparkles,
};
