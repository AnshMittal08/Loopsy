import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserX, Star, Sparkles } from 'lucide-react';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import PatternCard from '../components/PatternCard';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { useAuth } from '../components/AuthProvider';
import { useDocumentHead } from '../lib/useDocumentHead';
import { formatMonthYear } from '../lib/formatDate';

export default function CreatorProfile() {
  const { handle } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [starredIds, setStarredIds] = useState(new Set());

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    (async () => {
      try {
        const [res, feed] = await Promise.all([
          fetch(`/api/users/${handle}`),
          user
            ? fetch(`/api/community?limit=100&offset=0`).then((r) => r.json()).catch(() => ({}))
            : Promise.resolve({}),
        ]);
        if (cancelled) return;
        if (!res.ok) {
          Promise.resolve().then(() => { setNotFound(true); setLoading(false); });
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        Promise.resolve().then(() => {
          setData(json);
          setStarredIds(new Set(feed.starredIds ?? []));
          setLoading(false);
        });
      } catch {
        if (!cancelled) Promise.resolve().then(() => { setNotFound(true); setLoading(false); });
      }
    })();
    return () => { cancelled = true; };
  }, [handle, user]);

  const creator = data?.creator;
  const stats = data?.stats || {};
  useDocumentHead(
    creator
      ? {
          title: `${creator.name} (@${creator.handle})`,
          description: `${stats.published ?? 0} published patterns · ${stats.totalStars ?? 0} stars on Loopsy.`,
          canonicalPath: `/u/${handle}`,
          type: 'profile',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            mainEntity: {
              '@type': 'Person',
              name: creator.name,
              alternateName: `@${creator.handle}`,
            },
          },
        }
      : {},
  );

  if (loading) {
    return (
      <div className="min-h-dvh bg-surface">
        <TopNav />
        <main className="mx-auto max-w-6xl px-5 pt-24 pb-10 md:px-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full shimmer" />
            <div className="space-y-2">
              <div className="h-6 w-48 rounded-lg shimmer" />
              <div className="h-4 w-32 rounded-lg shimmer" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl shimmer" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-dvh bg-surface">
        <TopNav />
        <main className="mx-auto max-w-3xl px-5 py-20 text-center md:px-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low">
            <UserX size={24} className="text-on-surface-variant" />
          </div>
          <h1 className="font-display text-2xl font-bold text-on-surface mb-2">Creator not found</h1>
          <p className="text-sm text-on-surface-variant mb-7">We couldn't find a maker with that handle.</p>
          <Link to="/community" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
            Browse community
          </Link>
        </main>
      </div>
    );
  }

  const { patterns = [] } = data;
  const initial = (creator.name || creator.handle || '?').slice(0, 1).toUpperCase();

  return (
    <div className="min-h-dvh bg-surface">
      <TopNav />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 pt-24 pb-10 md:px-10 outline-none">
        <Reveal>
          <div className="flex flex-wrap items-center gap-5 mb-8">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-2xl font-bold shadow-warm">
              {initial}
            </div>
            <div className="min-w-0">
              <h1 className="font-display display-wonk text-[1.7rem] sm:text-[2.1rem] font-bold text-on-surface leading-tight">
                {creator.name}
              </h1>
              <p className="text-sm text-on-surface-variant">@{creator.handle}</p>
              {creator.bio && (
                <p className="mt-2 max-w-md text-sm leading-relaxed text-on-surface">{creator.bio}</p>
              )}
              {creator.createdAt && (
                <p className="text-xs text-on-surface-variant mt-0.5">Joined {formatMonthYear(creator.createdAt)}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
                  <Sparkles size={12} className="text-primary" />
                  {stats.published ?? patterns.length} patterns
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
                  <Star size={12} className="text-tertiary fill-tertiary" />
                  {stats.totalStars ?? 0} stars
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {patterns.length === 0 ? (
          <Reveal delay={0.1}>
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
              <p className="text-on-surface-variant">This maker hasn't published any patterns yet.</p>
            </div>
          </Reveal>
        ) : (
          <RevealGroup className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {patterns.map((p) => (
              <RevealItem key={p.id}>
                <PatternCard
                  pattern={p}
                  starred={starredIds.has(p.id)}
                  authed={Boolean(user)}
                  showStar={false}
                />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </main>
      <Footer />
    </div>
  );
}
