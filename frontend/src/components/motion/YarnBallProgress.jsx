import React from 'react';
import { motion as Motion } from 'motion/react';

/**
 * Progress indicator as a yarn ball winding itself up.
 * Strands appear across the ball as progress grows, and a primary-colored
 * thread wraps the outside; the percentage sits in the middle.
 */
export default function YarnBallProgress({ percent = 0, size = 120 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - 18) / 2;
  const circumference = 2 * Math.PI * radius;
  const c = size / 2;
  const ballR = radius - 8;

  // Inner strands — each one "winds on" as progress passes its threshold
  const strands = [
    { d: `M ${c - ballR} ${c} Q ${c} ${c - ballR * 1.1} ${c + ballR} ${c}`, at: 5 },
    { d: `M ${c - ballR} ${c} Q ${c} ${c + ballR * 1.1} ${c + ballR} ${c}`, at: 20 },
    { d: `M ${c - ballR * 0.7} ${c - ballR * 0.7} Q ${c + ballR * 0.5} ${c} ${c - ballR * 0.1} ${c + ballR * 0.95}`, at: 40 },
    { d: `M ${c + ballR * 0.7} ${c - ballR * 0.7} Q ${c - ballR * 0.5} ${c} ${c + ballR * 0.1} ${c + ballR * 0.95}`, at: 60 },
    { d: `M ${c} ${c - ballR} Q ${c - ballR * 0.9} ${c} ${c} ${c + ballR}`, at: 80 },
  ];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Ball body */}
        <circle cx={c} cy={c} r={ballR} className="fill-surface-container-high" />

        {/* Winding strands */}
        {strands.map((s, i) => (
          <Motion.path
            key={i}
            d={s.d}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            className="stroke-primary/45"
            initial={false}
            animate={{ pathLength: clamped >= s.at ? 1 : 0, opacity: clamped >= s.at ? 1 : 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        ))}

        {/* Outer thread track */}
        <circle
          cx={c} cy={c} r={radius}
          fill="none"
          strokeWidth={6}
          className="stroke-surface-container-high"
        />
        {/* Outer thread — wraps as you crochet */}
        <Motion.circle
          cx={c} cy={c} r={radius}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="stroke-primary"
          style={{ rotate: -90, transformOrigin: '50% 50%' }}
          initial={false}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-primary leading-none">{clamped}%</span>
        <span className="text-[10px] text-on-surface-variant mt-1">wound up</span>
      </div>
    </div>
  );
}
