import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

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
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-72 bg-surface shadow-xl flex flex-col animate-[slideIn_0.3s_ease-out]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10">
          <span className="text-lg font-black text-primary tracking-tight">StitchFlow AI</span>
          <button onClick={onClose} aria-label="Close menu" className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            to="/"
            className={`flex items-center gap-4 px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
              isActive('/') ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-lowest'
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Explore
          </Link>
          <Link
            to="/create"
            className={`flex items-center gap-4 px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
              isActive('/create') ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-lowest'
            }`}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            Create New
          </Link>
          <Link
            to="/tracker"
            className={`flex items-center gap-4 px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
              isActive('/tracker') ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-lowest'
            }`}
          >
            <span className="material-symbols-outlined">menu_book</span>
            In Progress
          </Link>
          <Link
            to="/account"
            className={`flex items-center gap-4 px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
              isActive('/account') ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-lowest'
            }`}
          >
            <span className="material-symbols-outlined">person</span>
            Account
          </Link>
        </nav>

        <div className="px-6 py-6 border-t border-outline-variant/10">
          <Link
            to={user ? "/create" : "/account"}
            className="block w-full rounded-full bg-gradient-to-r from-primary to-primary-dim px-6 py-3 text-center text-sm font-bold text-on-primary shadow-md"
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
