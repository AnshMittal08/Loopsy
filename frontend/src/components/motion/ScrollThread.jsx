// A thin yarn-gradient thread along the top of the viewport that "spools out"
// as you scroll — the page's reading progress, in the brand's thread motif.
import { motion as Motion, useScroll, useSpring } from 'motion/react';

export default function ScrollThread() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  return (
    <Motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[95] h-[3px] origin-left bg-gradient-to-r from-yarn-coral via-yarn-marigold to-yarn-periwinkle"
      style={{ scaleX }}
    />
  );
}
