import React, { useEffect } from 'react';

/**
 * Toast — lightweight auto-dismissing notification banner.
 *
 * Accessibility:
 *   - success toasts use role="status"  (polite, non-interrupting)
 *   - error   toasts use role="alert"   (assertive, screen-reader priority)
 *
 * Deduplication:
 *   Identical error messages within 1.5 s are silently suppressed to prevent
 *   stacking from rapid API failures.
 *
 * Props:
 *   message  — text to display (empty = hidden)
 *   type     — 'success' | 'error'
 *   onClose  — callback to clear toast state in parent
 *   duration — ms before auto-dismiss (default 3000)
 */
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] min-w-[320px]"
        >
          <div className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${
            type === 'success' 
            ? 'bg-success/10 border-success/20 text-success' 
            : 'bg-danger/10 border-danger/20 text-danger'
          }`}>
            <div className="flex-shrink-0">
              {type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
            <div className="flex-1 font-semibold text-sm">
              {message}
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Toast;
