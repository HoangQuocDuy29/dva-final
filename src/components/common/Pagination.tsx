import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'items',
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);
  const pageNumbers = buildPageNumbers(safePage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#1E293B]">
      <p className="text-xs text-slate-400">
        Showing{' '}
        <strong className="font-mono text-white tabular-nums">
          {startItem}–{endItem}
        </strong>{' '}
        of <strong className="font-mono text-white tabular-nums">{totalItems}</strong> {itemLabel}
      </p>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Previous page"
            className="h-9 px-3 rounded-xl text-xs font-semibold bg-[#0E1524] border border-[#1E293B] text-slate-300 hover:text-white hover:bg-[#1E293B] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          {pageNumbers.map((item, idx) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 h-9 flex items-center justify-center text-xs text-slate-500 select-none"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === safePage ? 'page' : undefined}
                className={`min-w-9 h-9 px-2.5 rounded-xl text-xs font-mono font-bold tabular-nums transition-all cursor-pointer ${
                  item === safePage
                    ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white shadow'
                    : 'bg-[#0E1524] border border-[#1E293B] text-slate-400 hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Next page"
            className="h-9 px-3 rounded-xl text-xs font-semibold bg-[#0E1524] border border-[#1E293B] text-slate-300 hover:text-white hover:bg-[#1E293B] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
};
