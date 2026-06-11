import React from 'react';
import { motion as Motion } from 'motion/react';

/**
 * The Loopsy signature motif: a yarn thread that draws itself.
 * ThreadDivider — a wavy section divider that loops mid-way.
 * ThreadSpinner — an endless thread tying itself, used as a loader.
 */

export function ThreadDivider({ className = '' }) {
  return (
    <div className={`flex justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 480 48" fill="none" className="w-full max-w-md h-10 text-primary/50">
        <Motion.path
          d="M4 30 C 80 10, 140 44, 200 26 C 224 18, 228 6, 244 10 C 260 14, 256 32, 240 34 C 226 36, 222 22, 238 16 C 290 -2, 380 40, 476 22"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

export function ThreadSpinner({ size = 48, className = '' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={`text-primary ${className}`}
      role="status"
      aria-label="Loading"
    >
      <Motion.path
        d="M6 24 C 6 12, 16 6, 24 6 C 34 6, 42 14, 42 24 C 42 34, 34 42, 24 42 C 16 42, 10 36, 10 28 C 10 20, 17 15, 24 16 C 31 17, 34 23, 32 28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.9 }}
        animate={{ pathLength: [0, 1, 1], opacity: [0.9, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.7, 1] }}
      />
    </svg>
  );
}
