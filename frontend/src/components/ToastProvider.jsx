// Toast notifications: a context that exposes show(message, tone) and a stack that auto-dismisses each toast.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// How long each toast stays on screen, in milliseconds.
const TOAST_DURATION_MS = 3500;

// Context carrying the show() function to descendants.
const ToastContext = createContext(null);

// Provides toast state and renders the toast stack above the children.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Add a toast and schedule its removal after TOAST_DURATION_MS.
  const show = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((previous) => [...previous, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  // Memoise the context value so consumers do not re-render needlessly.
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook returning { show(message, tone) } for triggering toasts from any component.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return ctx;
}
