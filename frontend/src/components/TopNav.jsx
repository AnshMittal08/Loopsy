import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Menu, Search } from 'lucide-react';
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';
import Magnetic from './motion/Magnetic';
import { useAuth } from './AuthProvider';
import { openCommandPalette } from '../lib/commandPalette';

const LINKS = [
  { to: '/', label: 'Explore' },
  { to: '/create', label: 'Create' },
  { to: '/tracker', label: 'Projects' },
  { to: '/account', label: 'Account' },
];

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="fixed top-0 w-full z-50 glass-panel border-b border-outline-variant/20">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto">
        <Link to="/" className="font-display text-2xl font-bold text-on-surface tracking-tight hover:text-primary transition-colors display-wonk">
          Loopsy
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map(({ to, label }) => {
            const active = isActive(to);
            return (
              <Link
                key={label}
                to={to}
                className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                  active ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {active && (
                  <Motion.span
                    layoutId="topnav-pill"
                    className="absolute inset-0 rounded-full bg-primary/10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={openCommandPalette}
            aria-label="Search"
            className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50 transition-colors"
          >
            <Search size={15} />
            <span>Search</span>
            <kbd className="rounded border border-outline-variant/30 px-1.5 text-[10px]">⌘K</kbd>
          </button>
          <ThemeToggle />
          {user && (
            <Link
              to="/account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary text-sm font-bold shadow-warm hover:bg-primary-dim transition-colors"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </Link>
          )}
          <Magnetic>
            <Link
              to={user ? '/create' : '/account'}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm"
            >
              {user ? 'Start Project' : 'Sign In'}
            </Link>
          </Magnetic>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={openCommandPalette}
            aria-label="Search"
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
          >
            <Search size={24} />
          </button>
          <ThemeToggle />
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={26} />
          </button>
        </div>
      </div>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </nav>
  );
}
