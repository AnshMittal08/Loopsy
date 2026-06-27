import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Users, SearchX, Globe } from 'lucide-react';
import TopNav from '../components/TopNav';
import PatternCard from '../components/PatternCard';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { SPRING } from '../lib/motionTokens';
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
  const [patterns, setPatterns] = useState([]);
  const [starredIds, setStarredIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('recent');

  const load = useCallback(async (off = 0, replace = true, sortBy = 'recent') => {
    try {
      if (replace) setLoading(true);
      const res = await fetch(`/api/community?limit=${PAGE}&offset=${off}&sort=${sortBy}`);
      const data = await res.json();
      const list = data.patterns ?? [];
      if (replace) {
        setPatterns(list);
      } else {
        setPatterns((p) => [...p, ...list]);
      }
      setStarredIds(new Set(data.starredIds ?? []));
      setHasMore(list.length === PAGE);
      setOffset(off + list.length);
    } catch {
      showToast('Could not load the community feed.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { Promise.resolve().then(() => load(0, true, sort)); }, [load, sort]);

  const handleSort = (id) => {
    if (id === sort) return;
    setOffset(0);
    setSort(id);
  };

  const handleNeedAuth = () => showToast('Sign in to star patterns.', 'info');

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
            <p className="text-on-surface-variant">No patterns published yet. Be the first!</p>
            <Link to="/create" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
              Create a pattern
            </Link>
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
                  onClick={() => load(offset, false, sort)}
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
    </div>
  );
}
