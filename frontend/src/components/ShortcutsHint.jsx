import React, { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { Keyboard, X } from 'lucide-react';

// A tasteful, dismissible keyboard-shortcuts popover for the Design Canvas,
// toggled by a keyboard-icon button in the toolbar. Out of the way by default.
const SHORTCUTS = [
  { keys: ['⌘', 'Z'], label: 'Undo' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
  { keys: ['⌘', 'D'], label: 'Duplicate' },
  { keys: ['Del'], label: 'Delete selected' },
  { keys: ['←', '↑', '→', '↓'], label: 'Nudge (Shift = 10px)' },
  { keys: ['Right-click'], label: 'Part options' },
  { keys: ['Scroll'], label: 'Zoom canvas' },
  { keys: ['Esc'], label: 'Deselect' },
];

export default function ShortcutsHint({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -6 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-warm-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              <Keyboard size={13} /> Shortcuts
            </p>
            <button onClick={onClose} aria-label="Close shortcuts" className="text-on-surface-variant hover:text-on-surface transition-colors"><X size={15} /></button>
          </div>
          <ul className="space-y-2">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-on-surface-variant">{s.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="rounded border border-outline-variant/30 bg-surface-container-low px-1.5 py-0.5 text-[10px] font-semibold text-on-surface">{k}</kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
