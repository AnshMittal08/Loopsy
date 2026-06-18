import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import StitchStep from './StitchTooltip';
import { SPRING } from '../lib/motionTokens';
import { stitchCountOf } from '../lib/stitchCount';

/* Crochet Mode — full-screen focus view: huge type, dimmed chrome, tap/space to
   advance, screen wake-lock so the screen stays on while your hands are busy. */
export default function CrochetMode({ pattern, progress, onToggleStep, onClose }) {
  const steps = pattern.steps || [];
  const firstOpen = steps.findIndex((_, i) => !(progress?.steps?.[i]?.completed ?? false));
  const [idx, setIdx] = useState(firstOpen >= 0 ? firstOpen : steps.length - 1);
  const wakeLockRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const isDone = progress?.steps?.[idx]?.completed ?? false;
  const pct = progress?.progressPercentage ?? 0;

  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch { /* unsupported or denied — fine */ }
    }
    acquire();
    const onVisible = () => { if (!cancelled && document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, []);

  const advance = useCallback(() => {
    onToggleStep(idx);
    if (idx < steps.length - 1) setIdx(idx + 1);
  }, [idx, steps.length, onToggleStep]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, onClose, steps.length]);

  return createPortal(
    <Motion.div
      className="fixed inset-0 z-[9500] bg-surface flex flex-col"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15 shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Crochet Mode</p>
          <p className="font-display text-base font-bold text-on-surface truncate">{pattern.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-on-surface-variant">{pct}% done</span>
          <button onClick={onClose} aria-label="Exit crochet mode"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="h-1 bg-surface-container-low shrink-0">
        <Motion.div className="h-1 bg-gradient-to-r from-yarn-coral via-yarn-marigold to-yarn-periwinkle"
          initial={false} animate={{ width: `${pct}%` }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 16 }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Motion.div key={idx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }} className="w-full max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary mb-6">
              Step {idx + 1} <span className="text-on-surface-variant font-medium normal-case tracking-normal">of {steps.length}</span>
              {isDone && <span className="ml-2 rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] text-on-secondary-container normal-case tracking-normal">done</span>}
            </p>
            <p className={`font-display text-[1.7rem] md:text-[2.2rem] leading-snug text-on-surface ${isDone ? 'opacity-50 line-through' : ''}`}>
              <StitchStep instruction={steps[idx]?.instruction || ''} />
            </p>
            {stitchCountOf(steps[idx]?.instruction) != null && (
              <p className="mt-5">
                <span className="rounded-full bg-secondary-container px-4 py-1.5 text-sm font-semibold text-on-secondary-container">
                  {stitchCountOf(steps[idx]?.instruction)} stitches this round
                </span>
              </p>
            )}
          </Motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 px-6 pb-10 shrink-0">
        <button onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0} aria-label="Previous step"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <Motion.button onClick={advance} whileTap={{ scale: 0.95 }} transition={SPRING.snappy}
          className="flex items-center gap-2.5 rounded-full bg-primary px-9 py-4 text-base font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md">
          <Check size={19} />
          {isDone ? 'Mark not done' : 'Done — next row'}
        </Motion.button>
        <button onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))} disabled={idx >= steps.length - 1} aria-label="Next step"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>
      <p className="text-center text-[11px] text-on-surface-variant pb-4 shrink-0 hidden md:block">
        Space to complete · arrow keys to navigate · Esc to exit
      </p>
    </Motion.div>,
    document.body
  );
}
