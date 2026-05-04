import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

function NavItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <span
        className="material-symbols-outlined text-[20px] shrink-0"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

export default function SideNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className="hidden md:flex flex-col h-full bg-white border-r border-outline-variant/25 w-[220px] shrink-0 sticky left-0 top-0">
      <div className="px-5 pt-7 pb-6">
        <Link to="/" className="block">
          <h1 className="font-display text-[1.45rem] font-bold text-on-surface tracking-tight leading-none">Loopsy</h1>
          <p className="text-[11px] text-on-surface-variant mt-1 font-medium tracking-wide uppercase">Crochet Studio</p>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        <NavItem to="/" icon="dashboard" label="Explore" active={isActive('/')} />
        <NavItem to="/create" icon="auto_awesome" label="Create" active={isActive('/create')} />
        <NavItem to="/tracker" icon="menu_book" label="In Progress" active={isActive('/tracker')} />
        <NavItem to="/account" icon="person" label="Account" active={isActive('/account')} />
      </nav>

      <div className="px-3 pb-5 space-y-3">
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
          <span className="material-symbols-outlined text-[18px]">add</span>
          New project
        </Link>
      </div>
    </aside>
  );
}
