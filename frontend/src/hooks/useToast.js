import { useState, useCallback } from 'react';

/**
 * useToast — centralized toast state management.
 *
 * Returns:
 *   toast        — { message, type } state for <Toast />
 *   showToast    — (message, type?) => void
 *   clearToast   — () => void
 *
 * Usage:
 *   const { toast, showToast, clearToast } = useToast();
 *   <Toast message={toast.message} type={toast.type} onClose={clearToast} />
 *   showToast('Saved!');
 *   showToast('Failed to save.', 'error');
 */
export function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const clearToast = useCallback(() => {
    setToast({ message: '', type: 'success' });
  }, []);

  return { toast, showToast, clearToast };
}
