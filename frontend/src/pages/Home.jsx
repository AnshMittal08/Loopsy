import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Sparkles, ArrowDown, ArrowRight, Lightbulb, GraduationCap } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { ThreadDivider, ThreadHero, ThreadSpinner } from '../components/motion/Thread';
import Magnetic from '../components/motion/Magnetic';
import Marquee from '../components/motion/Marquee';
import VerifiedBadge from '../components/VerifiedBadge';
import CatalogBrowser from '../components/CatalogBrowser';
import { getPatternTheme } from '../lib/patternThemes';
import { SPRING } from '../lib/motionTokens';
import { useDocumentHead } from '../lib/useDocumentHead';
import { useAuth } from '../components/AuthProvider';

// three.js stays out of the initial bundle — the yarn ball arrives lazily.
const YarnBallHero = lazy(() => import('../components/three/YarnBallHero'));

/* Word-by-word headline entrance; accent words land in italic Fraunces. */
function StaggeredHeadline({ words, className }) {
  return (
    <h1 className={className} aria-label={words.map((w) => w.text).join(' ')}>
      {words.map((word, i) => (
        <Motion.span
          key={i}
          aria-hidden
          className={`inline-block ${word.accent ? 'italic text-primary' : ''}`}
          initial={{ opacity: 0, y: 28, rotate: 3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ ...SPRING.gentle, delay: 0.15 + i * 0.07 }}
        >
          {word.text}&nbsp;
        </Motion.span>
      ))}
    </h1>
  );
}

const HEADLINE = [
  { text: 'From' }, { text: 'idea' }, { text: 'to' },
  { text: 'finished', accent: true }, { text: 'pattern', accent: true },
  { text: 'in' }, { text: 'minutes.' },
];

const MARQUEE_ITEMS = [
  'Amigurumi', 'Verified math ✓', 'Wearables', 'Granny squares',
  'Stitch by stitch', 'Home decor', 'Computed, never guessed', 'Accessories',
];

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    // Reduced-motion users get the final value on the first frame.
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 800;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display}</>;
}

const BEGINNER_PATH = [
  { id: 'template_001', learn: 'Chain stitches + rows' },
  { id: 'template_015', learn: 'Magic ring + rounds' },
  { id: 'template_006', learn: 'Rows + seaming' },
  { id: 'template_005', learn: 'Repetition + confidence' },
  { id: 'template_008', learn: 'Shaping introduction' },
  { id: 'template_004', learn: 'Working in the round' },
];

export default function Home() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [recentPatterns, setRecentPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHome() {
      try {
        setLoading(true);
        setError(null);
        const requests = [fetchJson('/api/templates')];
        if (user) requests.push(fetchJson('/api/patterns'));
        const [templateData, patternData = []] = await Promise.all(requests);
        if (cancelled) return;
        setTemplates(templateData);
        setRecentPatterns(patternData.slice(0, 4));
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadHome();
    return () => { cancelled = true; };
  }, [user]);

  const beginnerPath = useMemo(() => {
    return BEGINNER_PATH.map((bp, i) => {
      const template = templates.find((t) => t.id === bp.id);
      return template ? { ...template, learn: bp.learn, sequence: i + 1 } : null;
    }).filter(Boolean);
  }, [templates]);

  const featuredTemplate = templates[0];

  useDocumentHead({
    title: 'Loopsy — AI-native crochet studio',
    description:
      'Browse curated templates, customize by skill level, or describe what you want to make and let AI generate a complete step-by-step pattern.',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Loopsy',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://loopsy.app',
    },
  });

  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="w-full max-w-[1440px] mx-auto px-5 pb-28 pt-24 sm:px-6 md:px-12 md:pb-24 outline-none">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm-lg px-6 py-10 sm:px-8 sm:py-12 md:px-14 md:py-16">
          {/* Yarn gradient-mesh blobs — slow CSS drift, killed by the reduced-motion switch */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-yarn-coral/15 blur-3xl blob-drift" />
          <div className="pointer-events-none absolute -bottom-10 left-1/4 h-48 w-48 rounded-full bg-yarn-periwinkle/15 blur-3xl blob-drift-slow" />
          <div className="pointer-events-none absolute top-1/3 right-1/4 h-36 w-36 rounded-full bg-yarn-marigold/15 blur-2xl blob-drift-slower" />

          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <RevealGroup stagger={0.1}>
              <RevealItem>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-low px-3.5 py-1.5 text-xs font-semibold text-on-surface-variant">
                  <Sparkles size={14} className="text-primary" />
                  AI-powered crochet patterns
                </div>
              </RevealItem>
              <RevealItem>
                <StaggeredHeadline
                  words={HEADLINE}
                  className="font-display display-wonk max-w-2xl text-[2.4rem] font-bold leading-[1.05] tracking-tight text-on-surface sm:text-[3.2rem] md:text-[4.4rem]"
                />
              </RevealItem>
              <RevealItem>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-on-surface-variant">
                  Browse curated templates, customize by skill level, or describe what you want to make and let AI generate a complete step-by-step pattern.
                </p>
              </RevealItem>
              <RevealItem>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Magnetic>
                    <Link
                      to={user ? '/create' : '/account'}
                      className="shine-sweep inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md"
                    >
                      <Sparkles size={17} />
                      {user ? 'Start a project' : 'Get started'}
                    </Link>
                  </Magnetic>
                  <a
                    href="#discover"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-7 py-3.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Browse patterns
                    <ArrowDown size={15} />
                  </a>
                </div>
              </RevealItem>
              <RevealItem>
                <ThreadHero className="mt-8 max-w-xl -ml-1" />
              </RevealItem>
            </RevealGroup>

            {/* The one 3D moment: lazy-loaded yarn ball, drag to spin */}
            <Motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block h-[420px]"
            >
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center">
                    <ThreadSpinner size={64} />
                  </div>
                }
              >
                <YarnBallHero className="h-full w-full" />
              </Suspense>
            </Motion.div>
          </div>
        </section>

        {/* ── Editorial marquee ── */}
        <Reveal>
          <Marquee items={MARQUEE_ITEMS} className="mt-10 border-y border-outline-variant/20 py-4 opacity-90" />
        </Reveal>

        {/* ── Featured + stats strip ── */}
        <RevealGroup stagger={0.1} className="mt-10 grid gap-4 md:grid-cols-[1.3fr_0.5fr_0.5fr]">
          <RevealItem>
            <div className="shine-sweep group h-full overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm card-lift">
              {featuredTemplate?.imageUrl && (
                <div className="relative h-32 w-full overflow-hidden">
                  <img src={featuredTemplate.imageUrl} alt={featuredTemplate.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-xs font-semibold text-on-surface backdrop-blur-sm">
                    {featuredTemplate.difficulty} · {featuredTemplate.category}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Featured</p>
                  <h2 className="mt-1 text-base font-bold text-on-surface">{featuredTemplate?.name || 'Loading…'}</h2>
                  <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant line-clamp-1">
                    {featuredTemplate?.description}
                  </p>
                </div>
                {featuredTemplate && (
                  <Link to={`/create/${featuredTemplate.id}`} className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-dim transition-colors">
                    Customize
                  </Link>
                )}
              </div>
            </div>
          </RevealItem>

          <RevealItem>
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4 shadow-warm h-full card-lift">
              <p className="text-xs font-semibold text-on-surface-variant">Templates</p>
              <p className="mt-2 font-display text-4xl font-bold text-on-surface"><CountUp value={templates.length} /></p>
              <p className="mt-1 text-xs text-on-surface-variant">Ready to customize.</p>
            </div>
          </RevealItem>
          <RevealItem>
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4 shadow-warm h-full card-lift">
              <p className="text-xs font-semibold text-on-surface-variant">Your projects</p>
              <p className="mt-2 font-display text-4xl font-bold text-on-surface"><CountUp value={recentPatterns.length} /></p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {user ? (recentPatterns.length > 0 ? 'Keep going.' : 'Start your first.') : 'Sign in to save.'}
              </p>
            </div>
          </RevealItem>
        </RevealGroup>

        {/* ── Beginner Path ── */}
        {!loading && beginnerPath.length >= 4 && (
          <section className="mt-16">
            <Reveal>
              <div className="flex items-center gap-2.5 mb-1">
                <GraduationCap size={18} className="text-secondary" />
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">New to crochet?</p>
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-on-surface">Start Here</h2>
              <p className="mt-2 max-w-xl text-on-surface-variant text-sm leading-relaxed">
                Six projects in learning order — from your first chain to working in the round.
              </p>
            </Reveal>

            <RevealGroup stagger={0.08} className="mt-7 flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:gap-5">
              {beginnerPath.map((item) => (
                <RevealItem key={item.id} className="min-w-[240px] snap-start md:min-w-0">
                  <Link
                    to={`/create/${item.id}`}
                    className="group block overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm card-lift"
                  >
                    <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${getPatternTheme(item.category).accent}`}>
                      {item.imageUrl ? (
                        <>
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        </>
                      ) : (
                        <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl ${getPatternTheme(item.category).orb}`} />
                      )}
                      <div className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-on-secondary text-xs font-bold shadow-sm">
                        {item.sequence}
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="rounded-full bg-surface-container-lowest/90 px-2 py-0.5 text-[11px] font-semibold text-on-surface backdrop-blur-sm">
                          {item.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">{item.name}</h3>
                      <p className="mt-1.5 text-xs text-on-surface-variant flex items-center gap-1">
                        <Lightbulb size={12} className="text-secondary shrink-0" />
                        {item.learn}
                      </p>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}

        <ThreadDivider className="mt-16" />

        {/* ── Discover ── */}
        {error && (
          <div className="mt-8 rounded-xl bg-error-container px-5 py-4 text-sm text-on-error-container border border-error/10">{error}</div>
        )}
        <CatalogBrowser templates={templates} loading={loading} user={user} />

        <ThreadDivider className="mt-20" />

        {/* ── Bottom Sections ── */}
        <section className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-7 shadow-warm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">How it works</p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-on-surface">From inspiration to progress tracking</h2>
            <div className="mt-6 space-y-3">
              {[
                { n: 1, text: 'Browse templates by category, difficulty, and materials.' },
                { n: 2, text: 'Customize the pattern or describe your idea to AI.' },
                { n: 3, text: 'Track each row and keep project notes visible while you crochet.' },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3.5 items-start rounded-xl bg-surface-container-low p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                    {n}
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant pt-1">{text}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-7 shadow-warm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Recent</p>
                <h2 className="font-display mt-1.5 text-2xl font-bold tracking-tight text-on-surface">Continue where you left off</h2>
              </div>
              <Link to="/create" className="hidden rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-dim transition-colors md:inline-block">
                New project
              </Link>
            </div>
            <div className="space-y-3">
              {recentPatterns.length === 0 && (
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-5 text-sm text-on-surface-variant">
                  {user ? 'Generate a pattern to start your library.' : 'Sign in to build a personal project library.'}
                </div>
              )}
              {recentPatterns.map((pattern) => {
                const rTheme = getPatternTheme(pattern.category);
                const RIcon = rTheme.icon;
                return (
                  <Link key={pattern.id} to={`/tracker/${pattern.id}`} className="flex items-center gap-4 rounded-xl border border-outline-variant/15 bg-surface-container-low p-4 transition-colors hover:bg-surface-container hover:border-outline-variant/30 group">
                    <div className={`h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br ${rTheme.accent} flex items-center justify-center`}>
                      <RIcon size={18} className="text-white/90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-semibold text-sm text-on-surface truncate">{pattern.title}</h3>
                        <VerifiedBadge pattern={pattern} compact />
                      </div>
                      <p className="text-xs text-on-surface-variant">{pattern.category || 'Custom'} · {pattern.difficulty}</p>
                    </div>
                    <ArrowRight size={17} className="text-on-surface-variant shrink-0 transition-transform group-hover:translate-x-1" />
                  </Link>
                );
              })}
            </div>
          </Reveal>
        </section>

        {/* ── Editorial footer ── */}
        <footer className="mt-24">
          <ThreadDivider />
          <Reveal className="mt-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
              Made stitch by stitch
            </p>
            <p className="display-wonk font-display mt-2 select-none text-[18vw] font-bold leading-none tracking-tight text-on-surface/[0.08] md:text-[11rem]">
              Loopsy
            </p>
            <div className="-mt-6 flex flex-col items-center gap-4 pb-4 md:-mt-10">
              <p className="max-w-md text-sm leading-relaxed text-on-surface-variant">
                Patterns with the math proven — computed, never guessed.
              </p>
              <div className="flex items-center gap-2">
                {['bg-yarn-coral', 'bg-yarn-marigold', 'bg-yarn-sage', 'bg-yarn-periwinkle', 'bg-yarn-rose'].map((c) => (
                  <span key={c} className={`h-2 w-2 rounded-full ${c}`} />
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/70">© {new Date().getFullYear()} Loopsy</p>
            </div>
          </Reveal>
        </footer>
      </main>
    </>
  );
}
