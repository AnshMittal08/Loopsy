import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { X, Search } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useFocusTrap } from '../lib/useFocusTrap';
import { openCommandPalette } from '../lib/commandPalette';
import { NAV_DESTINATIONS, isNavActive } from '../lib/navigation';

function NavItem({ to, icon, label, active }) {
  const Icon = icon;
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'text-primary font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      {active && (
        <Motion.span
          layoutId="mobilenav-pill"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon size={18} className="relative shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="relative">{label}</span>
    </Link>
  );
}

function MobileNavContent({ onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const isActive = (path) => isNavActive(location.pathname, path);
  const prevPathname = useRef(location.pathname);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      prevPathname.current = location.pathname;
      onClose();
    }
  }, [location.pathname, onClose]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0" style={{ zIndex: 99999 }}>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-72 bg-surface-container-lowest shadow-warm-xl flex flex-col animate-[slideIn_0.25s_ease-out] outline-none"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-outline-variant/20">
          <Link to="/" className="font-display text-xl font-bold text-on-surface">Loopsy</Link>
          <button onClick={onClose} aria-label="Close menu" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_DESTINATIONS.map((d) => (
            <NavItem key={d.to} to={d.to} icon={d.icon} label={d.label} active={isActive(d.to)} />
          ))}
          <button
            onClick={() => { onClose(); openCommandPalette(); }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          >
            <Search size={18} className="shrink-0" strokeWidth={2} />
            <span>Search</span>
          </button>
        </nav>

        <div className="px-4 py-5 border-t border-outline-variant/20 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-low">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <p className="text-sm font-medium text-on-surface truncate">{user.name}</p>
            </div>
          )}
          <Link
            to={user ? '/create' : '/account'}
            className="flex items-center justify-center gap-2 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors"
          >
            {user ? 'Start Project' : 'Sign In'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MobileNav({ isOpen, onClose }) {
  if (!isOpen) return null;
  return createPortal(<MobileNavContent onClose={onClose} />, document.body);
}
