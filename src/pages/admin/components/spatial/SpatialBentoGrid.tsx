import React, { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { RingGauge } from './RingGauge';

export type BentoFilterKey = 'ALL' | 'ACTIVE' | 'OPEN_SLOTS' | 'PAUSED';
export type BentoGradientTone = 'orange' | 'rose' | 'emerald' | 'indigo';

export interface SpatialBentoItem {
  id: string;
  category: string;
  title: string;
  description: string;
  percent: number;
  gaugeLabel?: string;
  gaugeSublabel?: string;
  statusTag: string;
  filterTags: BentoFilterKey[];
  tone?: BentoGradientTone;
  metaRight?: string;
  onAction?: () => void;
  actionLabel?: string;
}

const FILTER_PILLS: { key: BentoFilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang hoạt động' },
  { key: 'OPEN_SLOTS', label: 'Còn nhiều slot' },
  { key: 'PAUSED', label: 'Tạm nghỉ' },
];

const GRADIENT_THEMES: Record<BentoGradientTone, { card: string; stroke: string; badge: string }> = {
  orange: {
    card: 'from-orange-500/25 via-orange-500/10 to-white/[0.03]',
    stroke: '#FB923C',
    badge: 'bg-orange-500/15 text-orange-200 border-orange-400/35',
  },
  rose: {
    card: 'from-rose-600/25 via-rose-600/10 to-white/[0.03]',
    stroke: '#FB7185',
    badge: 'bg-rose-500/15 text-rose-200 border-rose-400/35',
  },
  emerald: {
    card: 'from-emerald-500/25 via-emerald-500/10 to-white/[0.03]',
    stroke: '#34D399',
    badge: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35',
  },
  indigo: {
    card: 'from-indigo-500/25 via-indigo-500/10 to-white/[0.03]',
    stroke: '#818CF8',
    badge: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/35',
  },
};

const TONE_CYCLE: BentoGradientTone[] = ['orange', 'rose', 'emerald', 'indigo'];

interface SpatialBentoGridProps {
  title: string;
  subtitle?: string;
  items: SpatialBentoItem[];
  emptyMessage?: string;
  rightSlot?: React.ReactNode;
}

export const SpatialBentoGrid: React.FC<SpatialBentoGridProps> = ({
  title,
  subtitle,
  items,
  emptyMessage = 'Không có mục phù hợp với bộ lọc hiện tại.',
  rightSlot,
}) => {
  const [filter, setFilter] = useState<BentoFilterKey>('ALL');

  const counts = useMemo(() => {
    const map: Record<BentoFilterKey, number> = {
      ALL: items.length,
      ACTIVE: 0,
      OPEN_SLOTS: 0,
      PAUSED: 0,
    };
    for (const item of items) {
      if (item.filterTags.includes('ACTIVE')) map.ACTIVE += 1;
      if (item.filterTags.includes('OPEN_SLOTS')) map.OPEN_SLOTS += 1;
      if (item.filterTags.includes('PAUSED')) map.PAUSED += 1;
    }
    return map;
  }, [items]);

  const visibleItems = useMemo(
    () => (filter === 'ALL' ? items : items.filter((item) => item.filterTags.includes(filter))),
    [items, filter]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading font-black text-base text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-2xl sm:rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 max-w-full">
            {FILTER_PILLS.map((pill) => {
              const active = filter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setFilter(pill.key)}
                  aria-pressed={active}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      active ? 'text-slate-600' : 'text-slate-500'
                    }`}
                  >
                    {counts[pill.key]}
                  </span>
                </button>
              );
            })}
          </div>
          {rightSlot}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-10 text-center text-xs text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-5">
          {visibleItems.map((item, idx) => {
            const tone = item.tone ?? TONE_CYCLE[idx % TONE_CYCLE.length];
            const theme = GRADIENT_THEMES[tone];
            return (
              <article
                key={item.id}
                className={`group relative overflow-hidden rounded-3xl bg-gradient-to-b ${theme.card} backdrop-blur-xl border border-white/15 p-4 sm:p-5 flex flex-col justify-between min-h-[252px] sm:min-h-[268px] shadow-xl shadow-black/30 hover:border-white/25 hover:-translate-y-0.5 transition-all duration-300`}
              >
                {/* Top meta strip */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate ${theme.badge}`}>
                    {item.statusTag}
                  </span>
                  {item.metaRight && (
                    <span className="text-[10px] font-mono font-bold text-slate-300/90 tabular-nums shrink-0">
                      {item.metaRight}
                    </span>
                  )}
                </div>

                {/* Centered Pure SVG RingGauge */}
                <div className="my-4 flex items-center justify-center">
                  <RingGauge
                    value={item.percent}
                    size={104}
                    strokeWidth={8}
                    strokeColor={theme.stroke}
                    label={item.gaugeLabel}
                    sublabel={item.gaugeSublabel}
                  />
                </div>

                {/* Bottom info + white circular action button */}
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-300/80">
                      {item.category}
                    </span>
                    <h3 className="font-heading font-black text-sm text-white truncate">{item.title}</h3>
                    <p className="text-[11px] text-slate-300/80 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  {item.onAction && (
                    <button
                      type="button"
                      onClick={item.onAction}
                      aria-label={item.actionLabel || `Mở chi tiết ${item.title}`}
                      title={item.actionLabel || `Xem chi tiết ${item.title}`}
                      className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-orange-400 hover:text-white flex items-center justify-center shrink-0 shadow-lg shadow-black/40 transition-all duration-200 group-hover:scale-105 cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
