import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MobileNav from './MobileNav';
import { useAuth } from './AuthProvider';

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/20">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto">
        <Link to="/" className="font-display text-2xl font-bold text-on-surface tracking-tight hover:text-primary transition-colors">
          Loopsy
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {[
            { to: '/', label: 'Explore' },
            { to: '/#discover', label: 'Library', href: true },
            { to: '/create', label: 'Create' },
            { to: '/account', label: 'Account' },
          ].map(({ to, label, href }) =>
            href ? (
              <a key={label} href={to} className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors">
                {label}
              </a>
            ) : (
              <Link
                key={label}
                to={to}
                className={`text-sm font-medium transition-colors ${isActive(to) ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                {label}
              </Link>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user && (
            <Link
              to="/account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary text-sm font-bold shadow-warm hover:bg-primary-dim transition-colors"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </Link>
          )}
          <Link
            to={user ? '/create' : '/account'}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dim active:scale-95 transition-all shadow-warm"
          >
            {user ? 'Start Project' : 'Sign In'}
          </Link>
        </div>

        <button
          className="md:hidden text-on-surface-variant hover:text-on-surface transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
      </div>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </nav>
  );
}
