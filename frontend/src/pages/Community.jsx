import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Star, Sparkles, Users, SearchX, Globe } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import VerifiedBadge from '../components/VerifiedBadge';
import { getPatternTheme } from '../lib/patternThemes';
import { SPRING } from '../lib/motionTokens';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';

const PAGE = 24;

function PatternCard({ pattern, starred, onStar, authed }) {
  const theme = getPatternTheme(pattern.category);
  const Icon = theme.icon;
  const [localStarred, setLocalStarred] = useState(starred);
  const [localCount, setLocalCount] = useState(pattern.starCount ?? 0);
  const [busy, setBusy] = useState(false);
  const prevStarredRef = React.useRef(starred);

  // Sync prop change when parent refreshes starredIds (deferred to avoid
  // the react-hooks/set-state-in-effect lint rule).
  React.useEffect(() => {
    if (prevStarredRef.current !== starred) {
      prevStarredRef.current = starred;
      Promise.resolve().then(() => setLocalStarred(starred));
    }
  }, [starred]);

  const handleStar = async (e) => {
    e.preventDefault();
    if (!authed) { onStar?.(); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/patterns/${pattern.id}/star`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocalStarred(data.starred);
      setLocalCount(data.starCount);
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      to={`/p/${pattern.id}`}
      className="group relative flex flex-col rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm overflow-hidden hover:shadow-warm-md transition-shadow"
    >
      <div className={`h-40 relative bg-gradient-to-br ${theme.accent} flex items-end p-4`}>
        <div className={`absolute -top-4 -right-4 h-20 w-20 rounded-full blur-2xl opacity-60 ${theme.orb}`} />
        <div className="rounded-full bg-surface-container-lowest/85 p-2 backdrop-blur-sm">
          <Icon size={16} className="text-on-surface" />
        </div>
        <button
          onClick={handleStar}
          disabled={busy}
          aria-label={localStarred ? 'Unstar' : 'Star'}
          className="absolute top-3 right-3 rounded-full bg-surface-container-lowest/85 p-1.5 backdrop-blur-sm transition-transform hover:scale-110 disabled:opacity-60"
        >
          <Star
            size={15}
            className={localStarred ? 'text-tertiary fill-tertiary' : 'text-on-surface-variant'}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-on-surface leading-snug line-clamp-2 flex-1">
            {pattern.title}
          </h3>
          {pattern.verified && <VerifiedBadge size={14} />}
        </div>
        <p className="text-xs text-on-surface-variant">by {pattern.authorName}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex gap-1.5 flex-wrap">
            {pattern.difficulty && (
              <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                {pattern.difficulty}
              </span>
            )}
            {pattern.isAIGenerated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles size={9} />AI
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
            <Star size={11} className={localStarred ? 'text-tertiary fill-tertiary' : ''} />
            {localCount}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Community() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [patterns, setPatterns] = useState([]);
  const [starredIds, setStarredIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (off = 0, replace = true) => {
    try {
      if (replace) setLoading(true);
      const res = await fetch(`/api/community?limit=${PAGE}&offset=${off}`);
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

  useEffect(() => { Promise.resolve().then(() => load(0, true)); }, [load]);

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
          <p className="text-on-surface-variant max-w-xl mb-8">
            Patterns published by the Loopsy community — star the ones you love and start making.
          </p>
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
                  onClick={() => load(offset, false)}
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
