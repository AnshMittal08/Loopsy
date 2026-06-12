import React from 'react';
import { AnimatePresence, motion as Motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { DURATION, EASE } from '../../lib/motionTokens';

/**
 * Route transition wrapper — fade + 12px rise on enter, fade + slight lift on
 * exit, keyed by pathname. Children may be a render prop receiving the keyed
 * location (so <Routes location={...}> stays frozen during exit).
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: DURATION.base, ease: EASE.out }}
      >
        {typeof children === 'function' ? children(location) : children}
      </Motion.div>
    </AnimatePresence>
  );
}
