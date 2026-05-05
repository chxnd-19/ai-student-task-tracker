import React, { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination — reusable page controls.
 *
 * Props:
 *   page        — current page (1-based)
 *   totalPages  — total number of pages
 *   onPageChange — (newPage: number) => void
 *   total       — optional total record count for display
 *   limit       — optional records per page for display
 */
function Pagination({ page, totalPages, onPageChange, total, limit }) {
  if (!totalPages || totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Build page number array with ellipsis
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const btnBase = 'w-8 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center';
  const btnActive = 'bg-purple-500 text-white shadow-lg shadow-purple-500/20';
  const btnInactive = 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white';
  const btnDisabled = 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed';

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/5">
      {/* Record count */}
      {total !== undefined && limit !== undefined && (
        <p className="text-xs text-white/30">
          Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
        </p>
      )}

      {/* Page controls */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className={`${btnBase} ${canPrev ? btnInactive : btnDisabled}`}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-white/20">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className={`${btnBase} ${canNext ? btnInactive : btnDisabled}`}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default memo(Pagination);
