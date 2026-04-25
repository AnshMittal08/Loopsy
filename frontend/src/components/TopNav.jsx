import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MobileNav from './MobileNav';
import { useAuth } from './AuthProvider';

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-sm shadow-on-surface/5 font-headline font-medium text-sm tracking-tight">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto">
        <Link to="/" className="text-2xl font-black text-on-surface tracking-tighter cursor-pointer hover:scale-[1.02] transition-transform">
          StitchFlow AI
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-primary font-bold border-b-2 border-primary pb-1 hover:text-primary transition-all duration-300 scale-105 active:scale-95">Explore</Link>
          <a href="/#discover" className="text-on-surface-variant hover:text-on-surface transition-colors">Library</a>
          <Link to="/create" className="text-on-surface-variant hover:text-on-surface transition-colors">AI Studio</Link>
          <Link to="/account" className="text-on-surface-variant hover:text-on-surface transition-colors">Account</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user && (
            <Link to="/account" className="flex h-11 min-w-11 items-center justify-center rounded-full bg-surface-container-low px-4 text-sm font-bold text-on-surface">
              {user.name.slice(0, 1).toUpperCase()}
            </Link>
          )}
          <Link to={user ? "/create" : "/account"} className="bg-gradient-to-r from-primary to-primary-dim text-on-primary px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all duration-300 font-bold shadow-[0_8px_16px_rgba(101,77,181,0.2)]">
            {user ? 'Start Project' : 'Sign In'}
          </Link>
        </div>

        <button
          className="md:hidden text-on-surface-variant"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </nav>
  );
}
