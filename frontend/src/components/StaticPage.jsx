import React from 'react';
import TopNav from './TopNav';
import Footer from './Footer';
import { Reveal } from './motion/Reveal';
import { useDocumentHead } from '../lib/useDocumentHead';

/**
 * Shared shell for static/prose pages (Terms, Privacy, About): TopNav, a
 * titled article with readable prose defaults, and the site footer.
 */
export default function StaticPage({ title, description, updated, children }) {
  useDocumentHead({ title, description });
  return (
    <div className="min-h-dvh bg-surface flex flex-col">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-5 pt-24 pb-12 md:px-10 outline-none">
        <Reveal>
          <h1 className="font-display display-wonk text-[2rem] font-bold text-on-surface">{title}</h1>
          {updated && <p className="mt-1 text-xs text-on-surface-variant">Last updated: {updated}</p>}
          <article className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-on-surface-variant [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mt-2 [&_strong]:text-on-surface [&_a]:text-primary [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
            {children}
          </article>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
