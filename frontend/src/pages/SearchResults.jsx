import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, GraduationCap } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileHeader from '../components/MobileHeader';
import VerifiedBadge from '../components/VerifiedBadge';
import { searchGuides } from '../lib/learnContent';

function Group({ title, items, render }) {
  if (!items?.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">{title} · {items.length}</h2>
      <ul className="grid gap-2.5 sm:grid-cols-2">{items.map(render)}</ul>
    </section>
  );
}

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const query = q.trim();
    const my = ++reqId.current;
    let cancelled = false;
    if (query.length < 2) {
      Promise.resolve().then(() => { if (!cancelled) setResults(null); });
      return () => { cancelled = true; };
    }
    Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && my === reqId.current) { setResults(data); setLoading(false); } })
      .catch(() => { if (!cancelled && my === reqId.current) { setResults({ templates: [], patterns: [], designs: [] }); setLoading(false); } });
    return () => { cancelled = true; };
  }, [q]);

  const submit = (e) => { e.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}); };
  // Guides are bundled client-side, so they're searched here directly (no API).
  const guideHits = searchGuides(q);
  const total = (results ? results.templates.length + results.patterns.length + results.designs.length : 0) + guideHits.length;

  return (
    <div className="flex min-h-dvh bg-surface text-on-surface">
      <MobileHeader />
      <SideNav />
      <main id="main-content" tabIndex={-1} className="flex-1 px-5 pt-20 pb-28 md:pt-10 sm:px-6 md:px-10 md:pb-10 lg:px-16 outline-none">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Search</p>
          <h1 className="font-display display-wonk mb-6 text-[1.9rem] font-bold leading-tight sm:text-[2.4rem]">Find anything you've made.</h1>

          <form onSubmit={submit} className="relative mb-8">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search templates, your patterns and designs…"
              aria-label="Search"
              className="w-full rounded-full border border-outline-variant/30 bg-surface-container-lowest py-3.5 pl-11 pr-4 text-sm shadow-warm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </form>

          {q.trim().length >= 2 && !loading && results && total === 0 && (
            <p className="text-on-surface-variant">No matches for “{q}”. Try a different word.</p>
          )}

          <Group title="Learning" items={guideHits} render={(g) => (
            <li key={g.slug}>
              <Link to={`/learn/${g.slug}`} className="card-lift flex items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-warm">
                <span className="inline-flex items-center gap-2 min-w-0">
                  <GraduationCap size={15} className="shrink-0 text-primary" />
                  <span className="min-w-0"><span className="font-semibold">{g.title}</span><span className="block text-xs text-on-surface-variant">{g.category} · {g.minutes} min read</span></span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-on-surface-variant" />
              </Link>
            </li>
          )} />

          {results && (
            <>
              <Group title="Templates" items={results.templates} render={(t) => (
                <li key={t.id}>
                  <Link to={`/templates/${t.id}`} className="card-lift flex items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-warm">
                    <span><span className="font-semibold">{t.name}</span><span className="block text-xs text-on-surface-variant">{t.difficulty} · {t.category}</span></span>
                    <ArrowRight size={15} className="shrink-0 text-on-surface-variant" />
                  </Link>
                </li>
              )} />
              <Group title="Your patterns" items={results.patterns} render={(p) => (
                <li key={p.id}>
                  <Link to={`/tracker/${p.id}`} className="card-lift flex items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-warm">
                    <span className="font-semibold">{p.title}<VerifiedBadge pattern={p} compact className="ml-1.5 align-text-bottom" /></span>
                    <ArrowRight size={15} className="shrink-0 text-on-surface-variant" />
                  </Link>
                </li>
              )} />
              <Group title="Your designs" items={results.designs} render={(d) => (
                <li key={d.id}>
                  <Link to={`/d/${d.id}`} className="card-lift flex items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-warm">
                    <span className="font-semibold">{d.name}</span>
                    <ArrowRight size={15} className="shrink-0 text-on-surface-variant" />
                  </Link>
                </li>
              )} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
