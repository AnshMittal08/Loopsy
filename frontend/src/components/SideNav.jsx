import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SideNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside className="hidden md:flex flex-col h-full py-8 gap-2 bg-surface-container-low w-64 rounded-r-[3rem] sticky left-0 top-0 shadow-none border-r border-outline-variant/10">
      <div className="px-8 pb-8">
        <Link to="/">
            <h1 className="text-xl font-bold text-primary">StitchFlow AI</h1>
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link to="/" className="flex items-center gap-4 px-4 py-3 text-on-surface-variant hover:bg-surface-container-lowest rounded-full mx-2 font-headline text-sm font-semibold hover:translate-x-1 transition-transform duration-200">
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </Link>
        <Link to="/create" className={`flex items-center gap-4 px-4 py-3 rounded-full mx-2 font-headline text-sm font-semibold hover:translate-x-1 transition-transform duration-200 ${isActive('/create') ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-lowest'}`}>
          <span className="material-symbols-outlined">auto_awesome</span>
          Create New
        </Link>
        <Link to="/tracker" className={`flex items-center gap-4 px-4 py-3 rounded-full mx-2 font-headline text-sm font-semibold hover:translate-x-1 transition-transform duration-200 ${isActive('/tracker') ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-lowest'}`}>
          <span className="material-symbols-outlined">menu_book</span>
          Tracker
        </Link>
        <a href="#" className="flex items-center gap-4 px-4 py-3 text-on-surface-variant hover:bg-surface-container-lowest rounded-full mx-2 font-headline text-sm font-semibold hover:translate-x-1 transition-transform duration-200">
          <span className="material-symbols-outlined">inventory_2</span>
          Yarn Stash
        </a>
      </nav>
      <div className="px-8 mt-auto">
        <button className="w-full py-3 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-full font-semibold text-sm hover:scale-[1.02] transition-transform">Upgrade to Pro</button>
      </div>
    </aside>
  );
}
