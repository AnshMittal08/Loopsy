import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import MobileNav from './MobileNav';
import { openCommandPalette } from '../lib/commandPalette';

/**
 * Compact fixed top bar for phones on SideNav-based pages (SideNav is hidden
 * below md, which used to leave those pages with no search and no way to reach
 * Library/Learn/Design). Renders only below md; pages add mobile top padding.
 */
export default function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-3 glass-panel border-b border-outline-variant/20 md:hidden">
        <Link to="/" className="font-display display-wonk text-lg font-bold text-on-surface">Loopsy</Link>
        <div className="flex items-center gap-1">
          <button onClick={openCommandPalette} aria-label="Search" className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
            <Search size={20} />
          </button>
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
            <Menu size={22} />
          </button>
        </div>
      </header>
      <MobileNav isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
