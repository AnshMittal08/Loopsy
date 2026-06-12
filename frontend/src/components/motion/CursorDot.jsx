// Custom cursor follower — a coral dot with a lagging ring that swells over
// anything interactive. Complements the native cursor rather than replacing
// it. Fine pointers only; gone entirely under reduced motion.
import { useEffect, useState } from 'react';
import { motion as Motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, summary';

export default function CursorDot() {
  const reducedMotion = useReducedMotion();
  const [finePointer] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
  );
  const [hoveringInteractive, setHoveringInteractive] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 320, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 320, damping: 28, mass: 0.6 });

  useEffect(() => {
    if (!finePointer || reducedMotion) return;
    const onMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      setHoveringInteractive(Boolean(e.target.closest?.(INTERACTIVE)));
    };
    const onLeave = () => setVisible(false);
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [finePointer, reducedMotion, x, y]);

  if (!finePointer || reducedMotion) return null;

  return (
    <>
      <Motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
        style={{ x, y, opacity: visible ? 1 : 0 }}
      />
      <Motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50"
        style={{ x: ringX, y: ringY }}
        animate={{
          scale: hoveringInteractive ? 1.7 : 1,
          opacity: visible ? (hoveringInteractive ? 0.9 : 0.45) : 0,
          backgroundColor: hoveringInteractive ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      />
    </>
  );
}
