import React, { useRef, useCallback } from 'react';
import { motion as Motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

const MAX_PULL = 8; // px — keep it subtle

/**
 * Magnetic hover for primary CTAs: the wrapped element drifts gently toward
 * the cursor and springs back on leave. No-op for reduced-motion users.
 */
export default function Magnetic({ children, strength = 0.22, className = '', ...rest }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.5 });

  const onPointerMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el || e.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
      x.set(Math.max(-MAX_PULL, Math.min(MAX_PULL, dx)));
      y.set(Math.max(-MAX_PULL, Math.min(MAX_PULL, dy)));
    },
    [strength, x, y]
  );

  const onPointerLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  if (reduceMotion) {
    return (
      <span className={`inline-flex ${className}`} {...rest}>
        {children}
      </span>
    );
  }

  return (
    <Motion.span
      ref={ref}
      className={`inline-flex ${className}`}
      style={{ x: sx, y: sy }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      whileTap={{ scale: 0.97 }}
      {...rest}
    >
      {children}
    </Motion.span>
  );
}
