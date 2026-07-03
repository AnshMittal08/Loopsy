import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useToast } from './Toast';

/**
 * Owner edit of a pattern's title + steps (PATCH /api/patterns/:id). If the AI
 * got one row wrong the maker fixes it here instead of burning a generation.
 * The server re-validates the edited steps — the verified badge is honestly
 * re-earned or cleared, and we tell the maker which happened.
 */
export default function PatternEditor({ pattern, onSaved, onClose }) {
  const trapRef = useFocusTrap(true);
  const { showToast } = useToast();
  const [title, setTitle] = useState(pattern.title || '');
  const [steps, setSteps] = useState(() =>
    (pattern.steps || []).map((s) => s.instruction || s.text || (typeof s === 'string' ? s : ''))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const save = async () => {
    const cleaned = steps.map((t) => t.trim()).filter(Boolean);
    if (!title.trim() || cleaned.length === 0) {
      showToast('A title and at least one step are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/patterns/${pattern.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), steps: cleaned.map((instruction) => ({ instruction })) }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Could not save your edits.');
      const badgeMsg = updated.verified
        ? 'Edits saved — the math still verifies ✓'
        : 'Edits saved. The verified badge was cleared because the edited counts could not be re-verified.';
      showToast(badgeMsg, updated.verified ? 'success' : 'info');
      onSaved(updated);
      onClose();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 99999 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Edit pattern"
          className="pointer-events-auto flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm-xl animate-[toastIn_0.2s_ease-out]"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4">
            <h2 className="font-display text-lg font-bold text-on-surface">Edit pattern</h2>
            <button onClick={onClose} aria-label="Close" className="p-1 text-on-surface-variant hover:text-on-surface transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Title</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Steps</p>
              <p className="mb-3 text-xs text-on-surface-variant">
                Careful with the numbers — the engine re-checks every count when you save, and the
                Verified badge is kept only if the math still holds.
              </p>
              <ol className="space-y-2">
                {steps.map((text, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 w-6 shrink-0 text-right text-xs font-bold text-on-surface-variant">{i + 1}.</span>
                    <textarea
                      value={text}
                      onChange={(e) => setSteps((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                      rows={Math.min(4, Math.max(1, Math.ceil(text.length / 90)))}
                      className="min-w-0 flex-1 resize-y rounded-xl bg-surface-container-low px-3 py-2 text-sm leading-relaxed text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
            <button onClick={onClose} className="rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save edits'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
