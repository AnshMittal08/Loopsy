import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Users, SearchX, Globe, X, Tag, Sparkles } from 'lucide-react';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import PatternCard from '../components/PatternCard';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { SPRING } from '../lib/motionTokens';
import { useDocumentHead } from '../lib/useDocumentHead';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';

const PAGE = 24;

const SORTS = [
  { id: 'recent', label: 'Recent' },
  { id: 'trending', label: 'Trending' },
];

export default function Community() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag') || '';
  const [patterns, setPatterns] = useState([]);
  const [starredIds, setStarredIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('recent');
  const [popularTags, setPopularTags] = useState([]);
  const [catalog, setCatalog] = useState([]);

  const load = useCallback(async (off = 0, replace = true, sortBy = 'recent', tag = '') => {
    try {
      if (replace) setLoading(true);
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(off), sort: sortBy });
      if (tag) params.set('tag', tag);
      const res = await fetch(`/api/community?${params.toString()}`);
      const data = await res.json();
      const list = data.patterns ?? [];
      if (replace) {
        setPatterns(list);
      } else {
        setPatterns((p) => [...p, ...list]);
      }
      setStarredIds(new Set(data.starredIds ?? []));
      if (off === 0) setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
      setHasMore(list.length === PAGE);
      setOffset(off + list.length);
    } catch {
      showToast('Could not load the community feed.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Feed reloads on sort or tag change (offset resets to 0).
  useEffect(() => { Promise.resolve().then(() => load(0, true, sort, activeTag)); }, [load, sort, activeTag]);

  // Popular tags load once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/community/tags?limit=20');
        const data = await res.json();
        if (!cancelled) setPopularTags(Array.isArray(data.tags) ? data.tags : []);
      } catch {
        /* non-critical */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSort = (id) => {
    if (id === sort) return;
    setOffset(0);
    setSort(id);
  };

  const handleTag = (tag) => {
    setOffset(0);
    const next = new URLSearchParams(searchParams);
    if (tag) next.set('tag', tag);
    else next.delete('tag');
    setSearchParams(next);
  };

  const handleNeedAuth = () => showToast('Sign in to star patterns.', 'info');

  useDocumentHead({
    title: activeTag ? `Patterns tagged #${activeTag}` : 'Community patterns',
    description: activeTag
      ? `Crochet patterns tagged #${activeTag}, published by the Loopsy community.`
      : 'Browse crochet patterns published by the Loopsy community — star the ones you love and start making.',
    canonicalPath: '/community',
  });

  return (
    <div className="min-h-dvh bg-surface">
      <TopNav />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 md:px-10 outline-none">
        <Reveal>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Globe size={18} className="text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Community</p>
          </div>
          <h1 className="font-display display-wonk text-[1.9rem] sm:text-[2.4rem] font-bold text-on-surface leading-tight mb-2">
            Made by makers, for makers.
          </h1>
          <p className="text-on-surface-variant max-w-xl mb-6">
            Patterns published by the Loopsy community — star the ones you love and start making.
          </p>

          <div className="mb-8 inline-flex rounded-full border border-outline-variant/30 bg-surface-container-lowest p-1 shadow-warm">
            {SORTS.map((s) => {
              const active = sort === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSort(s.id)}
                  aria-pressed={active}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    active ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {active && (
                    <Motion.span
                      layoutId="community-sort-pill"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative">{s.label}</span>
                </button>
              );
            })}
          </div>

          {popularTags.length > 0 && (
            <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
              <Tag size={14} className="shrink-0 text-on-surface-variant" />
              <div className="flex flex-nowrap gap-2">
                {popularTags.map((t) => {
                  const active = activeTag === t.tag;
                  return (
                    <button
                      key={t.tag}
                      onClick={() => handleTag(active ? '' : t.tag)}
                      aria-pressed={active}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      #{t.tag}
                      {typeof t.count === 'number' && (
                        <span className={`ml-1.5 ${active ? 'text-on-primary/70' : 'text-on-surface-variant/60'}`}>{t.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTag && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-on-surface">
                Patterns tagged <span className="text-primary">#{activeTag}</span>
              </h2>
              <button
                onClick={() => handleTag('')}
                className="inline-flex items-center gap-1 rounded-full border border-outline-variant/30 px-3 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            </div>
          )}
        </Reveal>

        {loading && patterns.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl shimmer" />
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <SearchX size={40} className="text-on-surface-variant/40" />
            {activeTag ? (
              <>
                <p className="text-on-surface-variant">No patterns tagged <span className="font-semibold text-on-surface">#{activeTag}</span> yet.</p>
                <button onClick={() => handleTag('')} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
                  View all patterns
                </button>
              </>
            ) : (
              <>
                <p className="text-on-surface-variant">No patterns published yet. Be the first!</p>
                <Link to="/create" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
                  Create a pattern
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <RevealGroup className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {patterns.map((p) => (
                <RevealItem key={p.id}>
                  <PatternCard
                    pattern={p}
                    starred={starredIds.has(p.id)}
                    onStar={user ? undefined : handleNeedAuth}
                    authed={Boolean(user)}
                  />
                </RevealItem>
              ))}
            </RevealGroup>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Motion.button
                  onClick={() => load(offset, false, sort, activeTag)}
                  disabled={loading}
                  whileTap={{ scale: 0.96 }}
                  transition={SPRING.bouncy}
                  className="rounded-full border border-outline-variant/30 px-6 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </Motion.button>
              </div>
            )}
          </>
        )}

        {!activeTag && catalog.length > 0 && (
          <section className="mt-12">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              <h2 className="font-display text-lg font-bold text-on-surface">From the Loopsy catalog</h2>
            </div>
            <p className="mb-5 text-sm text-on-surface-variant">Verified-math patterns to start making today{patterns.length === 0 ? ' — community makes will appear above as they\u2019re published' : ''}.</p>
            <RevealGroup className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {catalog.map((t) => (
                <RevealItem key={t.id}>
                  <Link
                    to={`/templates/${t.id}`}
                    className="group flex h-full flex-col rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm overflow-hidden hover:shadow-warm-md transition-shadow"
                  >
                    <div className="flex items-center justify-between px-4 pt-4">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">Catalog</span>
                      <span className="text-[10px] font-semibold text-secondary">Verified ✓</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <h3 className="text-sm font-bold text-on-surface leading-snug">{t.title}</h3>
                      <p className="text-xs text-on-surface-variant">{t.difficulty} · {t.category}</p>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}

        {!user && patterns.length > 0 && (
          <Reveal delay={0.1} className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary-fixed/40 p-5">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-primary shrink-0" />
              <p className="text-sm text-on-surface">Join the community to publish your own patterns and star your favourites.</p>
            </div>
            <Link to="/account" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
              Sign up free
            </Link>
          </Reveal>
        )}
      </main>
      <Footer />
    </div>
  );
}
