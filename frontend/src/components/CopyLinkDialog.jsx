import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';

/**
 * In-app replacement for the window.prompt copy-link fallback: shows the URL
 * in an auto-selected readonly input with a Copy button. Used when the
 * Clipboard API is unavailable (or as an explicit share surface).
 */
export default function CopyLinkDialog({ url, title = 'Share this link', onClose }) {
  const trapRef = useFocusTrap(true);
  const inputRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    inputRef.current?.select();
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        inputRef.current?.select();
        document.execCommand('copy');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      inputRef.current?.select(); // last resort: leave it selected for manual copy
    }
  };

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 99999 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="pointer-events-auto w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm-xl p-6 animate-[toastIn_0.2s_ease-out]"
        >
          <h2 className="font-display text-lg font-bold text-on-surface">{title}</h2>
          <div className="mt-4 flex gap-2">
            <input
              ref={inputRef}
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-xl bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
            />
            <button
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
