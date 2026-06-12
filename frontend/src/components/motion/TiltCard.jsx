import React, { useRef, useCallback } from 'react';
import { motion as Motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

/**
 * Gentle 3D tilt on hover — rotateX/rotateY follow the pointer (max ~4deg)
 * and spring back on leave. Renders a plain div for reduced-motion users
 * and ignores touch pointers.
 */
export default function TiltCard({ children, className = '', max = 4, ...rest }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 });
  const sry = useSpring(ry, { stiffness: 180, damping: 18 });

  const onPointerMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el || e.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      ry.set(px * 2 * max);
      rx.set(-py * 2 * max);
    },
    [max, rx, ry]
  );

  const onPointerLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
  }, [rx, ry]);

  if (reduceMotion) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <Motion.div
      ref={ref}
      className={className}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      {...rest}
    >
      {children}
    </Motion.div>
  );
}
