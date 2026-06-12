import React from 'react';
import { motion as Motion, useReducedMotion } from 'motion/react';

/**
 * The Loopsy signature motif: a yarn thread that draws itself.
 * ThreadHero — a wide flourish that draws across the hero and ends in a yarn ball.
 * ThreadDivider — a wavy section divider that loops mid-way.
 * ThreadSpinner — an endless thread tying itself, used as a loader.
 * All render statically for reduced-motion users.
 */

const HERO_PATH =
  'M2 40 C 90 14, 160 52, 250 34 C 320 20, 330 6, 352 12 C 374 18, 368 40, 348 42 C 330 44, 326 26, 346 20 C 420 -2, 520 54, 600 36 C 650 25, 678 30, 704 34';

export function ThreadHero({ className = '', delay = 0.3 }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      <svg viewBox="0 0 760 64" fill="none" className="w-full h-auto text-primary/40">
        {reduceMotion ? (
          <path d={HERO_PATH} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <Motion.path
            d={HERO_PATH}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: 'easeInOut', delay }}
          />
        )}
        {/* The thread winds into a yarn ball */}
        <Motion.g
          initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16, delay: reduceMotion ? 0 : delay + 1.6 }}
          style={{ transformOrigin: '722px 34px' }}
        >
          <circle cx="722" cy="34" r="14" className="fill-primary/15" stroke="currentColor" strokeWidth="2" />
          <path d="M711 29 C 717 23, 728 23, 733 29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M710 39 C 717 45, 728 45, 734 39" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </Motion.g>
      </svg>
    </div>
  );
}

const DIVIDER_PATH =
  'M4 30 C 80 10, 140 44, 200 26 C 224 18, 228 6, 244 10 C 260 14, 256 32, 240 34 C 226 36, 222 22, 238 16 C 290 -2, 380 40, 476 22';

export function ThreadDivider({ className = '' }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={`flex justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 480 48" fill="none" className="w-full max-w-md h-10 text-primary/50">
        {reduceMotion ? (
          <path d={DIVIDER_PATH} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <Motion.path
            d={DIVIDER_PATH}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />
        )}
      </svg>
    </div>
  );
}

const SPINNER_PATH =
  'M6 24 C 6 12, 16 6, 24 6 C 34 6, 42 14, 42 24 C 42 34, 34 42, 24 42 C 16 42, 10 36, 10 28 C 10 20, 17 15, 24 16 C 31 17, 34 23, 32 28';

export function ThreadSpinner({ size = 48, className = '' }) {
  const reduceMotion = useReducedMotion();
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
      {reduceMotion ? (
        <path d={SPINNER_PATH} stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      ) : (
        <Motion.path
          d={SPINNER_PATH}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.9 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0.9, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.7, 1] }}
        />
      )}
    </svg>
  );
}
