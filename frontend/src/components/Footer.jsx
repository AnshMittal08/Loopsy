import React from 'react';
import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { to: '/', label: 'Explore' },
      { to: '/community', label: 'Community' },
      { to: '/learn', label: 'Learn' },
      { to: '/design', label: 'Design Canvas' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/terms', label: 'Terms of Service' },
      { to: '/privacy', label: 'Privacy Policy' },
    ],
  },
];

/** Site footer with real trust links — rendered on the public (TopNav) pages. */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-outline-variant/20 bg-surface-container-lowest">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <p className="font-display display-wonk text-xl font-bold text-on-surface">Loopsy</p>
            <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
              The AI-native crochet studio. Stitch counts are computed, never guessed.
            </p>
          </div>
          <div className="flex gap-12">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">{col.heading}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">Contact</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="mailto:hello@loopsy.app" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                    hello@loopsy.app
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-10 text-xs text-on-surface-variant">
          © {new Date().getFullYear()} Loopsy. Made with yarn and arithmetic.
        </p>
      </div>
    </footer>
  );
}
