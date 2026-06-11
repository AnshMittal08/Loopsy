import React from 'react';
import { motion as Motion } from 'motion/react';
import { fadeRise, staggerChildren } from '../../lib/motionTokens';

/** Fades + rises content into view when it scrolls into the viewport. */
export function Reveal({ children, className = '', delay = 0, ...rest }) {
  return (
    <Motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: fadeRise.hidden,
        visible: {
          ...fadeRise.visible,
          transition: { ...fadeRise.visible.transition, delay },
        },
      }}
      {...rest}
    >
      {children}
    </Motion.div>
  );
}

/** Parent that staggers its <RevealItem> children into view. */
export function RevealGroup({ children, className = '', stagger = 0.07, delay = 0, ...rest }) {
  return (
    <Motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={staggerChildren(stagger, delay)}
      {...rest}
    >
      {children}
    </Motion.div>
  );
}

export function RevealItem({ children, className = '', ...rest }) {
  return (
    <Motion.div className={className} variants={fadeRise} {...rest}>
      {children}
    </Motion.div>
  );
}
