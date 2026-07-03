import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Plus, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { openCommandPalette } from '../lib/commandPalette';
import { navFor, isNavActive } from '../lib/navigation';

function NavItem({ to, icon, label, active }) {
  const Icon = icon;
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'text-primary font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      {active && (
        <Motion.span
          layoutId="sidenav-pill"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon size={18} className="relative shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="relative">{label}</span>
    </Link>
  );
}

const [EXPLORE, ...REST_DESTINATIONS] = navFor('inSideNav');

export default function SideNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isActive = (path) => isNavActive(location.pathname, path);

  return (
    <aside className="hidden md:flex flex-col h-full bg-surface-container-lowest border-r border-outline-variant/25 w-[220px] shrink-0 sticky left-0 top-0">
      <div className="px-5 pt-7 pb-6 flex items-start justify-between">
        <Link to="/" className="block">
          <h1 className="font-display text-[1.45rem] font-bold text-on-surface tracking-tight leading-none display-wonk">Loopsy</h1>
          <p className="text-[11px] text-on-surface-variant mt-1 font-medium tracking-wide uppercase">Crochet Studio</p>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        <NavItem to={EXPLORE.to} icon={EXPLORE.icon} label={EXPLORE.label} active={isActive(EXPLORE.to)} />
        <button
          onClick={openCommandPalette}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
        >
          <Search size={18} className="shrink-0" strokeWidth={2} />
          <span>Search</span>
          <kbd className="ml-auto rounded border border-outline-variant/30 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        {REST_DESTINATIONS.map((d) => (
          <NavItem key={d.to} to={d.to} icon={d.icon} label={d.label} active={isActive(d.to)} />
        ))}
      </nav>

      <div className="px-3 pb-5 space-y-3">
        <div className="flex items-center justify-between px-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">Theme</span>
          <ThemeToggle />
        </div>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-low">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <p className="text-sm font-medium text-on-surface truncate">{user.name}</p>
          </div>
        )}
        <Link
          to="/create"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dim transition-colors"
        >
          <Plus size={16} />
          New project
        </Link>
      </div>
    </aside>
  );
}
