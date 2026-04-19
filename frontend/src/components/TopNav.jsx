import React from 'react';
import { Link } from 'react-router-dom';

export default function TopNav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-sm shadow-on-surface/5 font-headline font-medium text-sm tracking-tight">
      <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
        <Link to="/" className="text-2xl font-black text-on-surface tracking-tighter cursor-pointer hover:scale-[1.02] transition-transform">
          StitchFlow AI
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-primary font-bold border-b-2 border-primary pb-1 hover:text-primary transition-all duration-300 scale-105 active:scale-95">Explore</Link>
          <a href="#" className="text-on-surface-variant hover:text-primary transition-all duration-300 scale-105 active:scale-95">Community</a>
          <a href="#" className="text-on-surface-variant hover:text-primary transition-all duration-300 scale-105 active:scale-95">My Patterns</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-all duration-300 font-bold">Login</button>
          <Link to="/create" className="bg-gradient-to-r from-primary to-primary-dim text-on-primary px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all duration-300 font-bold shadow-[0_8px_16px_rgba(101,77,181,0.2)]">
            Start Project
          </Link>
        </div>

        <button className="md:hidden text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>
    </nav>
  );
}
