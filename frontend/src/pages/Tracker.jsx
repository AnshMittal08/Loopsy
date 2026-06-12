import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Menu, BookOpen, ArrowRight, Inbox, Palette, Scaling, Sparkles,
  Lightbulb, X, Check, ChevronLeft, ChevronRight, Maximize2,
} from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { SkeletonTrackerLayout } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { getPatternTheme } from '../lib/patternThemes';
import StitchStep from '../components/StitchTooltip';
import { useAuth } from '../components/AuthProvider';
import AiTutor from '../components/AiTutor';
import YarnBallProgress from '../components/motion/YarnBallProgress';
import VerifiedBadge from '../components/VerifiedBadge';
import { fireConfetti } from '../lib/confetti';
import { SPRING, EASE } from '../lib/motionTokens';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

const MILESTONES = [
  { at: 25, message: 'A quarter wound up — you’re in the rhythm now! 🧶' },
  { at: 50, message: 'Halfway there. Your hands know the way.' },
  { at: 75, message: 'Three quarters done — the finish line is in sight!' },
  { at: 100, message: 'Finished! You made this. Take the victory lap. 🎉' },
];

/* ── Crochet Mode — fullscreen focus view ─────────────────────── */
function CrochetMode({ pattern, progress, onToggleStep, onClose }) {
  const steps = pattern.steps || [];
  const firstOpen = steps.findIndex((_, i) => !(progress?.steps?.[i]?.completed ?? false));
  const [idx, setIdx] = useState(firstOpen >= 0 ? firstOpen : steps.length - 1);
  const wakeLockRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const isDone = progress?.steps?.[idx]?.completed ?? false;
  const pct = progress?.progressPercentage ?? 0;

  // Keep the screen awake while crocheting — hands are busy
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch { /* unsupported or denied — fine */ }
    }
    acquire();
    const onVisible = () => { if (!cancelled && document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, []);

  const advance = useCallback(() => {
    onToggleStep(idx);
    if (idx < steps.length - 1) setIdx(idx + 1);
  }, [idx, steps.length, onToggleStep]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, onClose, steps.length]);

  return createPortal(
    <Motion.div
      className="fixed inset-0 z-[9500] bg-surface flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15 shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Crochet Mode</p>
          <p className="font-display text-base font-bold text-on-surface truncate">{pattern.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-on-surface-variant">{pct}% done</span>
          <button
            onClick={onClose}
            aria-label="Exit crochet mode"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Progress thread */}
      <div className="h-1 bg-surface-container-low shrink-0">
        <Motion.div
          className="h-1 bg-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 16 }}
        />
      </div>

      {/* Step */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Motion.div
            key={idx}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-2xl text-center"
          >
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary mb-6">
              Step {idx + 1} <span className="text-on-surface-variant font-medium normal-case tracking-normal">of {steps.length}</span>
              {isDone && <span className="ml-2 rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] text-on-secondary-container normal-case tracking-normal">done</span>}
            </p>
            <p className={`font-display text-[1.7rem] md:text-[2.2rem] leading-snug text-on-surface ${isDone ? 'opacity-50 line-through' : ''}`}>
              <StitchStep instruction={steps[idx]?.instruction || ''} />
            </p>
          </Motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 pb-10 shrink-0">
        <button
          onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          disabled={idx === 0}
          aria-label="Previous step"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <Motion.button
          onClick={advance}
          whileTap={{ scale: 0.95 }}
          transition={SPRING.snappy}
          className="flex items-center gap-2.5 rounded-full bg-primary px-9 py-4 text-base font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md"
        >
          <Check size={19} />
          {isDone ? 'Mark not done' : 'Done — next row'}
        </Motion.button>
        <button
          onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))}
          disabled={idx >= steps.length - 1}
          aria-label="Next step"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <p className="text-center text-[11px] text-on-surface-variant pb-4 shrink-0 hidden md:block">
        Space to complete · arrow keys to navigate · Esc to exit
      </p>
    </Motion.div>,
    document.body
  );
}

export default function Tracker() {
  const { user, loading: authLoading } = useAuth();
  const { patternId } = useParams();
  const [pattern, setPattern] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templateImageUrl, setTemplateImageUrl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [allPatterns, setAllPatterns] = useState(null);
  const [crochetMode, setCrochetMode] = useState(false);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const theme = getPatternTheme(pattern?.category);
  const ThemeIcon = theme.icon;

  useEffect(() => {
    let cancelled = false;

    async function loadTracker() {
      if (!user) { setLoading(false); return; }
      if (!patternId) {
        try {
          const data = await fetchJson('/api/patterns');
          if (!cancelled) setAllPatterns(data);
        } catch {
          if (!cancelled) setAllPatterns([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [patData, progData] = await Promise.all([
          fetchJson(`/api/patterns/${patternId}`),
          fetchJson(`/api/progress/pattern/${patternId}`),
        ]);
        if (cancelled) return;
        setPattern(patData);

        if (progData.length > 0) {
          setProgress(progData[0]);
        } else {
          const initData = await fetchJson('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patternId: patData.id }),
          });
          if (cancelled) return;
          if (!initData?.id) {
            showToast('Could not initialize progress tracker. Please refresh.', 'error');
          } else {
            setProgress(initData);
          }
        }

        if (patData.templateId) {
          fetchJson(`/api/templates/${patData.templateId}`)
            .then((tmpl) => { if (!cancelled && tmpl.imageUrl) setTemplateImageUrl(tmpl.imageUrl); })
            .catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTracker();
    return () => { cancelled = true; };
  }, [patternId, user]);

  const toggleStep = async (stepIndex) => {
    if (!progress) return;
    const oldPct = progress.progressPercentage ?? 0;
    try {
      const updated = await fetchJson(`/api/progress/${progress.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex }),
      });
      setProgress(updated);
      const newPct = updated.progressPercentage ?? 0;
      const milestone = MILESTONES.find((m) => oldPct < m.at && newPct >= m.at);
      if (milestone) {
        fireConfetti({ count: milestone.at === 100 ? 160 : 80 });
        showToast(milestone.message, 'success');
      }
    } catch {
      showToast('Failed to save step progress. Please try again.', 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="h-7 w-56 rounded-lg shimmer" />
                <div className="h-4 w-36 rounded-lg shimmer" />
              </div>
              <div className="h-[110px] w-[110px] rounded-full shimmer" />
            </div>
            <SkeletonTrackerLayout />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen size={24} className="text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-on-surface mb-2">Sign in to track progress</h1>
          <p className="text-sm text-on-surface-variant mb-7">Your projects and progress are tied to your account.</p>
          <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
            Go to account
          </Link>
        </div>
      </div>
    );
  }

  /* ── My Projects list ─────────────────────────────── */
  if (!patternId) {
    return (
      <div className="flex min-h-screen bg-surface">
        <SideNav />
        <main className="flex-1 px-6 py-10 md:px-10 lg:px-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">In Progress</p>
            <h1 className="font-display display-wonk text-[2.4rem] font-bold text-on-surface mb-8">My Projects</h1>

            {allPatterns === null ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl shimmer" />
                ))}
              </div>
            ) : allPatterns.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
                  <Inbox size={20} className="text-on-surface-variant" />
                </div>
                <p className="text-on-surface-variant mb-5">No projects yet. Start your first one.</p>
                <Link to="/create" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
                  Start a project
                </Link>
              </div>
            ) : (
              <Motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              >
                {allPatterns.map((p) => {
                  const t = getPatternTheme(p.category);
                  const TIcon = t.icon;
                  return (
                    <Motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}>
                      <Link
                        to={`/tracker/${p.id}`}
                        className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm px-5 py-4 card-lift group"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.accent}`}>
                          <TIcon size={18} className="text-white/90" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-on-surface truncate">{p.title}</p>
                            <VerifiedBadge pattern={p} compact />
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">{p.difficulty} · {p.category}</p>
                        </div>
                        <ArrowRight size={18} className="text-primary shrink-0 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Motion.div>
                  );
                })}
              </Motion.div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface">
        <p className="text-on-surface-variant">{error || 'Pattern not found.'}</p>
        <Link to="/create" className="text-primary underline text-sm">Go Back</Link>
      </div>
    );
  }

  const progressPercent = progress?.progressPercentage ?? 0;
  const steps = pattern?.steps || [];
  const nextIdx = steps.findIndex((_, i) => !(progress?.steps?.[i]?.completed ?? false));

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNav />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden flex justify-between items-center px-5 py-4 border-b border-outline-variant/15">
          <span className="font-display text-lg font-bold text-on-surface">Loopsy</span>
          <button className="text-on-surface-variant" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <MobileNav isOpen={mobileOpen} onClose={closeMobileNav} />
        </header>

        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display display-wonk text-2xl md:text-3xl font-bold text-on-surface leading-tight">{pattern.title}</h1>
              <p className="text-sm text-on-surface-variant mt-1">
                {pattern.category || 'Custom'} · {pattern.difficulty}
                <VerifiedBadge pattern={pattern} className="ml-2 align-text-bottom" />
                {pattern.isFallback && (
                  <span className="ml-2 rounded-full bg-error-container px-2 py-0.5 text-xs font-semibold text-on-error-container">
                    AI fallback
                  </span>
                )}
              </p>
              <Motion.button
                onClick={() => setCrochetMode(true)}
                whileTap={{ scale: 0.96 }}
                transition={SPRING.snappy}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
              >
                <Maximize2 size={13} />
                Crochet Mode
              </Motion.button>
            </div>
            <YarnBallProgress percent={progressPercent} size={110} />
          </div>

          <div className="flex flex-col lg:flex-row gap-5 min-h-0">
            {/* Left panel */}
            <section className="w-full lg:w-5/12 flex flex-col rounded-2xl overflow-hidden border border-outline-variant/20 shadow-warm bg-surface-container-lowest">
              {templateImageUrl ? (
                <div className="relative h-48 flex-shrink-0 overflow-hidden">
                  <img src={templateImageUrl} alt={pattern.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/90 px-3 py-1.5 text-xs font-semibold text-on-surface backdrop-blur-sm">
                      <ThemeIcon size={13} />
                      {pattern.category}
                    </span>
                  </div>
                </div>
              ) : (
                <div className={`relative h-48 flex-shrink-0 overflow-hidden bg-gradient-to-br ${theme.accent} flex items-center justify-center`}>
                  <div className={`absolute -top-8 -right-8 h-28 w-28 rounded-full blur-2xl ${theme.orb}`} />
                  <div className="absolute inset-x-6 inset-y-5 rounded-xl border border-white/50 bg-white/30 backdrop-blur-sm" />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="rounded-full bg-surface-container-lowest/85 p-4 shadow-warm">
                      <ThemeIcon size={28} className="text-on-surface" />
                    </div>
                    <span className="rounded-full bg-surface-container-lowest/75 px-3 py-1 text-xs font-semibold text-on-surface">
                      {pattern.category || 'Custom project'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {pattern.customization?.color && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-xs font-medium">
                      <Palette size={12} />
                      {pattern.customization.color}
                    </span>
                  )}
                  {pattern.customization?.size && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-medium">
                      <Scaling size={12} />
                      {pattern.customization.size}
                    </span>
                  )}
                  {pattern.isAIGenerated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Sparkles size={12} />
                      AI generated
                    </span>
                  )}
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2.5 text-sm">
                  {[
                    { label: 'Hook', value: pattern.hookSize },
                    { label: 'Yarn', value: pattern.yarnWeight },
                    { label: 'Time', value: pattern.timeEstimate },
                    { label: 'Finish', value: pattern.finishedSize },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-surface-container-low p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{m.label}</p>
                      <p className="mt-1 font-semibold text-on-surface text-sm">{m.value || '—'}</p>
                    </div>
                  ))}
                </div>

                {pattern.promptSummary && (
                  <p className="text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface">Prompt:</span> {pattern.promptSummary}
                  </p>
                )}
              </div>
            </section>

            {/* Right panel — steps */}
            <section className="w-full lg:w-7/12 flex flex-col rounded-2xl border border-outline-variant/20 shadow-warm bg-surface-container-lowest overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center gap-2 shrink-0">
                <BookOpen size={17} className="text-primary" />
                <h2 className="font-semibold text-on-surface">Step-by-Step Guide</h2>
                <span className="ml-auto text-xs text-on-surface-variant">{steps.length} steps</span>
              </div>

              {/* Tags strip */}
              {(pattern.tags || []).length > 0 && (
                <div className="border-b border-outline-variant/10 bg-surface-container-low px-5 py-3 shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {(pattern.tags || []).map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs text-on-surface-variant">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials + Notes */}
              {((pattern.materials || []).length > 0 || (pattern.notes || []).length > 0) && (
                <div className="grid gap-4 border-b border-outline-variant/10 bg-surface-container-low px-5 py-4 md:grid-cols-2 shrink-0">
                  {(pattern.materials || []).length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-2">Materials</h3>
                      <ul className="space-y-1">
                        {pattern.materials.map((item) => (
                          <li key={item} className="rounded-lg bg-surface px-3 py-1.5 text-xs text-on-surface-variant">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(pattern.notes || []).length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-2">Maker Notes</h3>
                      <ul className="space-y-1">
                        {pattern.notes.map((note) => (
                          <li key={note} className="rounded-lg bg-surface px-3 py-1.5 text-xs text-on-surface-variant">{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Steps list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {steps.map((stepData, index) => {
                  const isCompleted = progress?.steps?.[index]?.completed ?? false;
                  const isNext = !isCompleted && (index === 0 || (progress?.steps?.[index - 1]?.completed ?? false));

                  return (
                    <Motion.label
                      key={index}
                      layout
                      transition={SPRING.gentle}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl cursor-pointer relative overflow-hidden transition-colors ${
                        isCompleted
                          ? 'bg-surface-container-low opacity-55'
                          : isNext
                            ? 'bg-primary/8 border border-primary/25 shadow-warm'
                            : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      {isNext && (
                        <Motion.div
                          layoutId="next-step-bar"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"
                          transition={SPRING.gentle}
                        />
                      )}

                      <Motion.div
                        className={`pt-0.5 ${isNext ? 'pl-2' : ''}`}
                        animate={{ scale: isCompleted ? [1, 1.35, 1] : 1 }}
                        transition={{ duration: 0.4, times: [0, 0.4, 1], ease: 'easeOut' }}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => toggleStep(index)}
                          className="accent-primary w-4 h-4"
                          aria-label={`Step ${index + 1}`}
                        />
                      </Motion.div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold mb-1 ${
                          isCompleted ? 'text-on-surface-variant' : isNext ? 'text-primary' : 'text-on-surface-variant'
                        }`}>
                          Step {index + 1}
                          {isCompleted && <span className="ml-1.5 font-normal opacity-60">· done</span>}
                        </p>
                        <p className={`relative text-sm leading-relaxed transition-colors ${isCompleted ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                          <StitchStep instruction={stepData.instruction} />
                          {/* Strike-through that draws itself across the row */}
                          <Motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-0 top-1/2 h-[1.5px] bg-on-surface-variant/80"
                            initial={false}
                            animate={{ width: isCompleted ? '100%' : '0%' }}
                            transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE.out }}
                          />
                        </p>
                        <AnimatePresence>
                          {isNext && (
                            <Motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 px-2.5 py-1.5 bg-secondary-container/60 rounded-lg flex gap-1.5 items-start">
                                <Lightbulb size={13} className="text-secondary shrink-0 mt-0.5" />
                                <p className="text-xs text-on-secondary-container">Keep track of your stitch count as you work this row!</p>
                              </div>
                            </Motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Motion.label>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {crochetMode && (
          <CrochetMode
            pattern={pattern}
            progress={progress}
            onToggleStep={toggleStep}
            onClose={() => setCrochetMode(false)}
          />
        )}
      </AnimatePresence>

      <AiTutor
        patternId={patternId}
        currentStepIndex={nextIdx >= 0 ? nextIdx : steps.length - 1}
        patternTitle={pattern.title}
        difficulty={pattern.difficulty}
      />
    </div>
  );
}
