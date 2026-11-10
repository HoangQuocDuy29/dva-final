import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, LayoutGrid, User, CalendarCheck, ShoppingBag, Receipt } from 'lucide-react';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { getVisibleNavGroups } from '../constants';
import { AdminTabId } from '../types';

interface QuickSearchResult {
  kind: 'MODULE' | 'PLAYER' | 'BOOKING' | 'STORE_ORDER' | 'STORE_PRODUCT';
  id: string;
  title: string;
  subtitle?: string;
  target: AdminTabId;
  subView?: string;
}

const MAX_PER_KIND = 5;
const KIND_LABEL: Record<QuickSearchResult['kind'], string> = {
  MODULE: 'Modules',
  PLAYER: 'Athletes',
  BOOKING: 'Court Bookings',
  STORE_ORDER: 'Store Orders',
  STORE_PRODUCT: 'Store Products',
};
const KIND_ICON: Record<QuickSearchResult['kind'], React.ComponentType<{ className?: string }>> = {
  MODULE: LayoutGrid,
  PLAYER: User,
  BOOKING: CalendarCheck,
  STORE_ORDER: Receipt,
  STORE_PRODUCT: ShoppingBag,
};

const STORE_SUBVIEW_SHORTCUTS: {
  id: string;
  title: string;
  subtitle: string;
  subView: string;
  keywords: string[];
}[] = [
  {
    id: 'module-STORE-PRODUCTS',
    title: 'DVA Store · Products & Inventory',
    subtitle: 'Commerce & Competition · Catalog & SKUs',
    subView: 'products',
    keywords: ['store', 'shop', 'products', 'inventory', 'sku', 'jersey', 'merch'],
  },
  {
    id: 'module-STORE-ORDERS',
    title: 'DVA Store · Orders & VietQR',
    subtitle: 'Commerce & Competition · Order approvals',
    subView: 'orders',
    keywords: ['store', 'shop', 'orders', 'vietqr', 'dva-ord', 'checkout'],
  },
];

/**
 * Hybrid Hub Navigator (Spec 005, Q3 = navigate only).
 * Pure client-side filtering over modules, athletes, court bookings, and DVA Store orders/products.
 */
export const AdminQuickSearch: React.FC<{ autoFocus?: boolean; enableHotkey?: boolean; onDone?: () => void }> = ({
  autoFocus,
  enableHotkey = true,
  onDone,
}) => {
  const {
    isSuperAdmin,
    setActiveModule,
    data: { players, bookings, storeOrders, storeProducts },
  } = useAdminDashboard();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K focuses the search box
  useEffect(() => {
    if (!enableHotkey) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enableHotkey]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Close when clicking outside
  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const results = useMemo<QuickSearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const groups = getVisibleNavGroups(isSuperAdmin);
    const baseModules: QuickSearchResult[] = groups
      .flatMap((g) => g.items.map((item) => ({ item, group: g.label })))
      .filter(
        ({ item }) =>
          !q || item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q))
      )
      .map(({ item, group }) => ({
        kind: 'MODULE' as const,
        id: `module-${item.id}`,
        title: item.label,
        subtitle: group,
        target: item.id,
      }));

    const storeSubShortcuts: QuickSearchResult[] = q
      ? STORE_SUBVIEW_SHORTCUTS.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.keywords.some((k) => k.includes(q))
        ).map((s) => ({
          kind: 'MODULE' as const,
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          target: 'STORE' as const,
          subView: s.subView,
        }))
      : [];

    const modules = [...baseModules, ...storeSubShortcuts].slice(0, q ? MAX_PER_KIND : 12);

    if (!q) return modules;

    const athletes: QuickSearchResult[] = players
      .filter(
        (p) =>
          (p.fullName || '').toLowerCase().includes(q) || String(p.jerseyNumber ?? '') === q.replace('#', '')
      )
      .slice(0, MAX_PER_KIND)
      .map((p) => ({
        kind: 'PLAYER' as const,
        id: `player-${p.id}`,
        title: p.fullName,
        subtitle: `#${p.jerseyNumber}${p.isActive === false ? ' · Hidden' : ''}`,
        target: 'PLAYERS' as const,
      }));

    const reservations: QuickSearchResult[] = bookings
      .filter(
        (b) =>
          (b.bookingCode || '').toLowerCase().includes(q) ||
          (b.customerName || '').toLowerCase().includes(q) ||
          (b.customerPhone || '').toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_KIND)
      .map((b) => ({
        kind: 'BOOKING' as const,
        id: `booking-${b.id}`,
        title: b.customerName,
        subtitle: `${b.bookingCode} · ${b.bookingDate} · ${b.paymentStatus}`,
        target: 'BOOKINGS' as const,
      }));

    const matchedStoreOrders: QuickSearchResult[] = storeOrders
      .filter(
        (o) =>
          (o.orderCode || '').toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.customerPhone || '').toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_KIND)
      .map((o) => ({
        kind: 'STORE_ORDER' as const,
        id: `store-order-${o.id}`,
        title: `${o.orderCode} · ${o.customerName}`,
        subtitle: `${o.totalAmount.toLocaleString('vi-VN')} đ · ${o.paymentStatus}`,
        target: 'STORE' as const,
        subView: 'orders',
      }));

    const matchedStoreProducts: QuickSearchResult[] = storeProducts
      .filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_KIND)
      .map((p) => ({
        kind: 'STORE_PRODUCT' as const,
        id: `store-product-${p.id}`,
        title: p.name,
        subtitle: `${p.sku} · ${p.price.toLocaleString('vi-VN')} đ · Stock: ${p.stock}`,
        target: 'STORE' as const,
        subView: 'products',
      }));

    return [
      ...modules,
      ...athletes,
      ...reservations,
      ...matchedStoreOrders,
      ...matchedStoreProducts,
    ];
  }, [query, isSuperAdmin, players, bookings, storeOrders, storeProducts]);

  useEffect(() => setHighlight(0), [query]);

  const select = (r: QuickSearchResult) => {
    setActiveModule(r.target, r.subView);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
    onDone?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      onDone?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      select(results[highlight]);
    }
  };

  let lastKind: QuickSearchResult['kind'] | null = null;

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search modules, athletes, bookings…"
        aria-label="Quick search"
        role="combobox"
        aria-expanded={open}
        aria-controls="admin-quick-search-results"
        className="w-full h-10 pl-9 pr-14 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/60 focus:ring-1 focus:ring-[#38BDF8]/40"
      />
      <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#1E293B] text-[10px] font-mono text-slate-500 pointer-events-none">
        ⌘K
      </kbd>

      {open && (
        <div
          id="admin-quick-search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto scrollbar-none no-scrollbar rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl z-50 py-2"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">No matches for “{query}”</p>
          ) : (
            results.map((r, idx) => {
              const header = r.kind !== lastKind ? KIND_LABEL[r.kind] : null;
              lastKind = r.kind;
              const Icon = KIND_ICON[r.kind];
              return (
                <React.Fragment key={r.id}>
                  {header && (
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {header}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === highlight}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => select(r)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer ${
                      idx === highlight ? 'bg-[#1E293B]' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-white truncate">{r.title}</span>
                      {r.subtitle && (
                        <span className="block text-[11px] text-slate-500 truncate">{r.subtitle}</span>
                      )}
                    </span>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
