import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS = {
  error: 'error',
  success: 'check_circle',
  info: 'info',
};

const STYLES = {
  error: 'bg-error-container text-on-error-container',
  success: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-surface-container-highest text-on-surface',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg text-sm font-medium max-w-sm animate-[toastIn_0.3s_ease-out] ${STYLES[toast.type] || STYLES.info}`}
          >
            <span className="material-symbols-outlined text-base shrink-0">{ICONS[toast.type] || 'info'}</span>
            <p className="flex-1 min-w-0">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
