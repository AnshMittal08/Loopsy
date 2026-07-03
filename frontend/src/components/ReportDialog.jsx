import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useToast } from './Toast';

const REASONS = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'copyright', label: 'Copyright violation' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'harassment', label: 'Harassment or hate' },
  { id: 'other', label: 'Something else' },
];

/** Flag a pattern or comment for review → POST /api/reports. */
export default function ReportDialog({ resourceType, resourceId, onClose }) {
  const trapRef = useFocusTrap(true);
  const { showToast } = useToast();
  const [reason, setReason] = useState('spam');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const submit = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType, resourceId, reason, detail: detail.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { showToast('Sign in to report content.', 'info'); onClose(); return; }
      if (!res.ok) throw new Error(data.error || 'Could not send the report.');
      showToast('Thanks — our team will review this.', 'success');
      onClose();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSending(false);
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
          aria-label="Report content"
          className="pointer-events-auto w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm-xl p-6 animate-[toastIn_0.2s_ease-out]"
        >
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-error" />
            <h2 className="font-display text-lg font-bold text-on-surface">Report this {resourceType}</h2>
          </div>
          <div className="mt-4 space-y-2">
            {REASONS.map((r) => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${reason === r.id ? 'border-primary/40 bg-primary/5 text-on-surface font-semibold' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>
                <input
                  type="radio"
                  name="report-reason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="accent-[var(--primary)]"
                />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Anything else we should know? (optional)"
            className="mt-3 w-full resize-y rounded-xl bg-surface-container-low px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/25"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={sending}
              className="rounded-full bg-error px-4 py-2 text-sm font-semibold text-on-error hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
