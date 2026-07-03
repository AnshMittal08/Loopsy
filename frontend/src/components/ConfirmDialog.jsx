import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../lib/useFocusTrap';

/**
 * In-app replacement for window.confirm: accessible alert dialog with a
 * danger-styled confirm for destructive actions. Render it conditionally:
 *
 *   {confirming && (
 *     <ConfirmDialog title="Delete project?" body="…" confirmLabel="Delete"
 *       onConfirm={...} onCancel={() => setConfirming(null)} />
 *   )}
 */
export default function ConfirmDialog({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, onConfirm, onCancel }) {
  const trapRef = useFocusTrap(true);
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 99999 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-body"
          className="pointer-events-auto w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm-xl p-6 animate-[toastIn_0.2s_ease-out]"
        >
          <h2 id="confirm-dialog-title" className="font-display text-lg font-bold text-on-surface">{title}</h2>
          {body && <p id="confirm-dialog-body" className="mt-2 text-sm text-on-surface-variant leading-relaxed">{body}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors shadow-warm ${
                danger ? 'bg-error text-on-error hover:opacity-90' : 'bg-primary text-on-primary hover:bg-primary-dim'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
