import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Compass, Sparkles, Shapes, BookOpen, User } from 'lucide-react';

const TABS = [
  { to: '/', icon: Compass, label: 'Explore' },
  { to: '/create', icon: Sparkles, label: 'Create' },
  { to: '/design', icon: Shapes, label: 'Design' },
  { to: '/tracker', icon: BookOpen, label: 'Projects' },
  { to: '/account', icon: User, label: 'Account' },
];

// Native-app-style bottom navigation for phones. Renders only below `md`.
// The full-screen Design editor and public share pages own the whole
// viewport, so the bar steps out of the way there.
export default function MobileTabBar() {
  const { pathname } = useLocation();
  if (pathname === '/design' || pathname.startsWith('/d/')) return null;

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[80] md:hidden glass-panel border-t border-outline-variant/20 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {TABS.map(({ to, icon, label }) => {
          const Icon = icon;
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              {active && (
                <Motion.span
                  layoutId="tabbar-pill"
                  className="absolute inset-x-2 top-1 h-8 rounded-full bg-primary/10"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={active ? 2.4 : 2} className="relative shrink-0" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
