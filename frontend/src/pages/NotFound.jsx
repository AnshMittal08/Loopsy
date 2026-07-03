import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Globe, GraduationCap } from 'lucide-react';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import { Reveal } from '../components/motion/Reveal';
import { useDocumentHead } from '../lib/useDocumentHead';

export default function NotFound() {
  useDocumentHead({
    title: 'Page not found',
    description: 'That page has been frogged. Head back to the good yarn.',
  });

  return (
    <div className="min-h-dvh bg-surface">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-5 py-24 text-center outline-none">
        <Reveal>
          <p className="font-display display-wonk text-[5rem] font-bold leading-none text-primary/30">404</p>
          <h1 className="mt-4 font-display text-2xl font-bold text-on-surface">This page has been frogged.</h1>
          <p className="mx-auto mt-3 max-w-md text-on-surface-variant">
            Rip-it, rip-it — the page you're looking for doesn't exist or has moved. Let's get you back to the good yarn.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
              <Compass size={16} />
              Explore patterns
            </Link>
            <Link to="/community" className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-6 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
              <Globe size={16} />
              Community
            </Link>
            <Link to="/learn" className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-6 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
              <GraduationCap size={16} />
              Learn
            </Link>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
