import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Sparkles, BookOpen, User, X } from 'lucide-react';
import { useAuth } from './AuthProvider';

function NavItem({ to, icon, label, active }) {
  const Icon = icon;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}

function MobileNavContent({ onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const prevPathname = useRef(location.pathname);

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
      <div className="absolute right-0 top-0 h-full w-72 bg-surface-container-lowest shadow-warm-xl flex flex-col animate-[slideIn_0.25s_ease-out]">
        <div className="flex items-center justify-between px-5 py-5 border-b border-outline-variant/20">
          <Link to="/" className="font-display text-xl font-bold text-on-surface">Loopsy</Link>
          <button onClick={onClose} aria-label="Close menu" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavItem to="/" icon={Compass} label="Explore" active={isActive('/')} />
          <NavItem to="/create" icon={Sparkles} label="Create" active={isActive('/create')} />
          <NavItem to="/tracker" icon={BookOpen} label="In Progress" active={isActive('/tracker')} />
          <NavItem to="/account" icon={User} label="Account" active={isActive('/account')} />
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
