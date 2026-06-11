import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('loopsy-theme', next); } catch { /* private mode */ }
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <Motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex"
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </Motion.span>
      </AnimatePresence>
    </button>
  );
}
