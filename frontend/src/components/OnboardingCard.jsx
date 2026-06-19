import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';

// A one-time, dismissible first-run guide. Stores its dismissal in
// localStorage so it never nags a returning maker.
export default function OnboardingCard({ storageKey, title, steps }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(storageKey) !== 'done'; } catch { return true; }
  });
  const close = () => {
    try { localStorage.setItem(storageKey, 'done'); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-surface-dim/60 backdrop-blur-sm p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm-xl p-6 sm:p-7"
          >
            <button onClick={close} aria-label="Dismiss" className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface transition-colors"><X size={18} /></button>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary mb-1.5">Welcome</p>
            <h2 className="font-display display-wonk text-2xl font-bold text-on-surface mb-5">{title}</h2>
            <ol className="space-y-3 mb-7">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <p className="text-sm leading-relaxed text-on-surface-variant pt-0.5"><span className="font-semibold text-on-surface">{s.title}</span> — {s.body}</p>
                </li>
              ))}
            </ol>
            <button onClick={close} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md">
              Start designing <ArrowRight size={16} />
            </button>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
