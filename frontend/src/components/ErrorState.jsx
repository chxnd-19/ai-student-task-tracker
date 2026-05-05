import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorState — friendly error message with optional retry button.
 *
 * Props:
 *   message  — error description (default: "Something went wrong")
 *   onRetry  — optional callback; shows Retry button when provided
 *   compact  — smaller variant for inline use
 */
function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  compact = false,
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
        <AlertTriangle size={16} className="shrink-0" />
        <span className="flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <AlertTriangle size={28} className="text-rose-400" />
      </div>
      <div>
        <p className="text-white/70 font-medium">{message}</p>
        <p className="text-white/30 text-sm mt-1">Check your connection and try again.</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;
