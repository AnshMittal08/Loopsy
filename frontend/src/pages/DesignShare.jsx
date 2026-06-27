import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Sparkles, ArrowRight, BadgeCheck } from 'lucide-react';
import CanvasStage from '../components/CanvasStage';
import { hexOf } from '../lib/yarnColors';
import Magnetic from '../components/motion/Magnetic';
import { ThreadSpinner } from '../components/motion/Thread';
import { useAuth } from '../components/AuthProvider';

// Public, read-only share page for a Design Canvas creation: the distribution
// unit. Anyone with the link sees the creature, its parts, and a CTA to make
// their own. No auth required to view.
export default function DesignShare() {
  const { id } = useParams();
  const { user } = useAuth();
  const [design, setDesign] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/designs/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Design not found');
        return d;
      })
      .then((d) => { if (!cancelled) setDesign(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id]);

  // Best-effort social meta so link unfurls point at this design's OG image.
  useEffect(() => {
    if (!design) return;
    const prev = document.title;
    document.title = `${design.name} · Loopsy`;
    const tags = [
      ['og:title', `${design.name} — made with Loopsy`],
      ['og:description', 'A crochet creature designed on Loopsy, with verified stitch-by-stitch math.'],
      ['og:image', `${window.location.origin}/api/designs/${id}/og.svg`],
      ['og:type', 'website'],
      ['twitter:card', 'summary_large_image'],
    ];
    const created = tags.map(([property, content]) => {
      const m = document.createElement('meta');
      m.setAttribute('property', property);
      m.setAttribute('content', content);
      document.head.appendChild(m);
      return m;
    });
    return () => { document.title = prev; created.forEach((m) => m.remove()); };
  }, [design, id]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <p className="text-on-surface-variant">{error}</p>
        <Link to="/" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Explore Loopsy</Link>
      </div>
    );
  }
  if (!design) {
    return <div className="flex min-h-dvh items-center justify-center bg-surface"><ThreadSpinner size={56} /></div>;
  }

  const parts = design.spec?.parts || [];
  const palette = [...new Set(parts.map((p) => p.color).filter(Boolean))];

  // Adapt the saved spec parts to the canvas renderer. Parts carry their
  // layout; any without one (e.g. legacy/photo specs) get a simple stack.
  const stageParts = parts.map((p, i) => ({
    id: `s${i}`,
    name: p.name,
    shape: p.shape,
    dims: p.dimensions || {},
    color: p.color,
    quantity: p.quantity,
    face: p.face,
    ...(p.colorPlan ? { colorPlan: p.colorPlan } : {}),
    x: p.layout?.x ?? 180,
    y: p.layout?.y ?? 80 + i * 70,
  }));

  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      {/* top bar */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link to="/" className="font-display text-xl font-bold">Loopsy</Link>
        <Link to={user ? '/design' : '/account'} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
          Design your own
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 md:px-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          {/* Creature card */}
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-outline-variant/20 shadow-warm-lg"
          >
            <div className="relative aspect-square bg-gradient-to-b from-surface-container-low to-surface-container">
              <div className="pointer-events-none absolute -top-12 -right-8 h-48 w-48 rounded-full bg-yarn-periwinkle/15 blur-3xl blob-drift" />
              <div className="pointer-events-none absolute -bottom-10 -left-8 h-44 w-44 rounded-full bg-yarn-rose/15 blur-3xl blob-drift-slow" />
              <CanvasStage parts={stageParts} interactive={false} />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-outline-variant/15 bg-surface-container-lowest px-5 py-3">
              <span className="text-sm font-semibold">Made with Loopsy</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary"><BadgeCheck size={13} /> Verified math</span>
            </div>
          </Motion.div>

          {/* Details */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary mb-2">Crochet design</p>
            <h1 className="font-display display-wonk text-[2rem] sm:text-[2.6rem] md:text-[3.2rem] font-bold leading-tight">{design.name}</h1>
            <p className="mt-3 text-on-surface-variant leading-relaxed">
              {parts.length} parts · amigurumi · designed on Loopsy. The pattern's stitch counts are computed by the engine, not guessed.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {parts.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: hexOf(p.color) }} />
                  {p.name}{p.quantity > 1 ? ` ×${p.quantity}` : ''}
                </span>
              ))}
            </div>

            {palette.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Yarn</span>
                {palette.map((c) => <span key={c} className="h-5 w-5 rounded-full border border-outline-variant/30" style={{ backgroundColor: hexOf(c) }} title={c} />)}
              </div>
            )}

            <div className="mt-8">
              <Magnetic>
                <Link to={user ? '/design' : '/account'} className="shine-sweep inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md">
                  <Sparkles size={17} /> Design your own creature <ArrowRight size={16} />
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
