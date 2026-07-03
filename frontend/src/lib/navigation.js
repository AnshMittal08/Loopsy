import { Compass, Sparkles, Shapes, FolderOpen, BookOpen, Library, Globe, GraduationCap, User } from 'lucide-react';

// THE single source of truth for app navigation. Every nav surface (TopNav,
// SideNav, MobileNav drawer, MobileTabBar, CommandPalette) derives its items
// from this list — labels, routes, and icons can never drift apart again.
//
// Flags choose which surface shows which destination. The drawer and palette
// always carry EVERYTHING so every destination is reachable on every viewport.
export const NAV_DESTINATIONS = [
  { to: '/', label: 'Explore', icon: Compass, inTabBar: true, inTopNav: true, inSideNav: true },
  { to: '/create', label: 'Create', icon: Sparkles, inTabBar: true, inTopNav: true, inSideNav: true },
  { to: '/design', label: 'Design Canvas', icon: Shapes, inTabBar: false, inTopNav: false, inSideNav: true },
  { to: '/designs', label: 'My Designs', icon: FolderOpen, inTabBar: false, inTopNav: false, inSideNav: true },
  { to: '/tracker', label: 'Projects', icon: BookOpen, inTabBar: true, inTopNav: true, inSideNav: true },
  { to: '/library', label: 'Library', icon: Library, inTabBar: false, inTopNav: false, inSideNav: true },
  { to: '/community', label: 'Community', icon: Globe, inTabBar: true, inTopNav: true, inSideNav: true },
  { to: '/learn', label: 'Learn', icon: GraduationCap, inTabBar: false, inTopNav: true, inSideNav: true },
  { to: '/account', label: 'Account', icon: User, inTabBar: true, inTopNav: true, inSideNav: true },
];

/** Destinations for a given surface flag ('inTabBar' | 'inTopNav' | 'inSideNav'). */
export const navFor = (flag) => NAV_DESTINATIONS.filter((d) => d[flag]);

/** Shared active-route test: exact for '/', prefix otherwise. */
export const isNavActive = (pathname, to) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
