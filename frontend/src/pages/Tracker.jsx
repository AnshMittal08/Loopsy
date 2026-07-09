import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Menu, BookOpen, ArrowRight, Inbox, Palette, Scaling, Sparkles,
  Lightbulb, Check, Maximize2, Trash2, Globe, Lock, Printer, Pencil,
} from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileHeader from '../components/MobileHeader';
import MobileNav from '../components/MobileNav';
import ConfirmDialog from '../components/ConfirmDialog';
import PrintablePattern from '../components/PrintablePattern';
import CopyLinkDialog from '../components/CopyLinkDialog';
import PatternEditor from '../components/PatternEditor';
import { SkeletonTrackerLayout } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import TermsToggle from '../components/TermsToggle';
import { renderTerms, readTermsPref, writeTermsPref } from '../lib/terms';
import { getPatternTheme } from '../lib/patternThemes';
import StitchStep from '../components/StitchTooltip';
import CrochetMode from '../components/CrochetMode';
import { useAuth } from '../components/AuthProvider';
import AiTutor from '../components/AiTutor';
import YarnBallProgress from '../components/motion/YarnBallProgress';
import VerifiedBadge from '../components/VerifiedBadge';
import { fireConfetti } from '../lib/confetti';
import { stitchCountOf } from '../lib/stitchCount';
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

/* Animated circular progress — used on My Projects cards. */
function ProgressRing({ percent, size = 52 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-container-high)" strokeWidth={stroke} />
        <Motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={percent >= 100 ? 'var(--secondary)' : 'var(--primary)'}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(100, percent) / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-bold text-on-surface">
        {Math.round(percent)}%
      </span>
    </div>
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
  const [progressMap, setProgressMap] = useState({});
  const [crochetMode, setCrochetMode] = useState(false);
  const [panelTab, setPanelTab] = useState('steps');
  const currentRowRef = useRef(null);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  const { showToast } = useToast();
  const [terms, setTermsState] = useState(readTermsPref());
  const setTerms = (m) => { setTermsState(m); writeTermsPref(m); };
  const reduceMotion = useReducedMotion();

  // { id, title } while the delete-confirmation dialog is open.
  const [confirmDelete, setConfirmDelete] = useState(null);
  const handleDeleteProject = async () => {
    const { id } = confirmDelete || {};
    setConfirmDelete(null);
    if (!id) return;
    try {
      const res = await fetch(`/api/patterns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete the project.');
      setAllPatterns((list) => (list || []).filter((p) => p.id !== id));
      showToast('Project deleted.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Publishing to a public feed deserves an explicit confirmation, not a
  // silent hover-toggle. Unpublish stays one tap.
  const [confirmPublish, setConfirmPublish] = useState(null); // { id, title }
  const requestTogglePublish = (id, currentlyPublished, title) => {
    if (currentlyPublished) handleTogglePublish(id, true);
    else setConfirmPublish({ id, title });
  };
  const handleTogglePublish = async (id, currentlyPublished) => {
    setConfirmPublish(null);
    try {
      const res = await fetch(`/api/patterns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentlyPublished }),
      });
      if (!res.ok) throw new Error('Could not update visibility.');
      setAllPatterns((list) => (list || []).map((p) =>
        p.id === id ? { ...p, publishedAt: !currentlyPublished ? new Date().toISOString() : null } : p
      ));
      showToast(!currentlyPublished ? 'Pattern published to community.' : 'Pattern unpublished.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  // Maker's own project notes — debounced PATCH { notes } to the progress record.
  const [myNotes, setMyNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimer = useRef(null);
  useEffect(() => {
    const v = progress?.notes;
    if (typeof v === 'string') Promise.resolve().then(() => setMyNotes(v));
  }, [progress?.id, progress?.notes]);
  const handleNotesChange = (value) => {
    setMyNotes(value);
    setNotesSaved(false);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      try {
        await fetchJson(`/api/progress/${progress.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: value }),
        });
        setNotesSaved(true);
      } catch {
        showToast('Could not save your notes — they stay on this screen, try again shortly.', 'error');
      }
    }, 800);
  };

  const [editing, setEditing] = useState(false); // pattern editor modal

  // Finish-screen actions: publish THIS pattern, then share its public link.
  const [finishShareUrl, setFinishShareUrl] = useState(null);
  const handlePublishThis = async () => {
    if (!pattern || pattern.publishedAt) return;
    try {
      const res = await fetch(`/api/patterns/${pattern.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true }),
      });
      if (!res.ok) throw new Error('Could not publish.');
      setPattern((cur) => (cur ? { ...cur, publishedAt: new Date().toISOString() } : cur));
      showToast('Published to the community — congrats, maker!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  const handleShareFinished = async () => {
    const url = `${window.location.origin}/p/${pattern.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied.', 'success');
    } catch {
      setFinishShareUrl(url);
    }
  };

  const theme = getPatternTheme(pattern?.category);
  const ThemeIcon = theme.icon;

  useEffect(() => {
    let cancelled = false;

    async function loadTracker() {
      if (!user) { setLoading(false); return; }
      if (!patternId) {
        try {
          const [data, summary] = await Promise.all([
            fetchJson('/api/patterns'),
            fetchJson('/api/progress').catch(() => []),
          ]);
          if (cancelled) return;
          setAllPatterns(data);
          setProgressMap(Object.fromEntries(summary.map((s) => [s.patternId, s.progressPercentage ?? 0])));
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
  }, [patternId, user, showToast]);

  // Keep the active row in view as rows are completed — but not on first
  // load, where the studio header should be what greets you.
  const lastPctRef = useRef(null);
  useEffect(() => {
    const pct = progress?.progressPercentage;
    if (pct == null) return;
    if (lastPctRef.current != null && lastPctRef.current !== pct) {
      currentRowRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    lastPctRef.current = pct;
  }, [progress?.progressPercentage, reduceMotion]);

  // ── Offline-resilient progress ──────────────────────────────────────────
  // Check-offs apply OPTIMISTICALLY and, when the network fails, queue as
  // explicit desired states (idempotent on the server) in localStorage.
  // The queue replays when the connection returns or on the next interval.
  const QUEUE_KEY = 'loopsy:progress:queue';
  const offlineToastRef = useRef(false);
  const readQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
  const writeQueue = (q) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* full */ } };

  const flushQueue = useCallback(async () => {
    let q = readQueue();
    if (q.length === 0) return;
    for (const item of [...q]) {
      try {
        const updated = await fetchJson(`/api/progress/${item.progressId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepIndex: item.stepIndex, completed: item.completed }),
        });
        q = q.filter((x) => x !== item);
        writeQueue(q);
        setProgress((cur) => (cur && cur.id === updated.id ? { ...updated, notes: cur.notes ?? updated.notes } : cur));
      } catch {
        return; // still offline — try again on the next signal
      }
    }
    offlineToastRef.current = false;
    showToast('You’re back online — progress synced.', 'success');
  }, [showToast]);

  useEffect(() => {
    const onOnline = () => { flushQueue(); };
    window.addEventListener('online', onOnline);
    const t = setInterval(() => { if (readQueue().length) flushQueue(); }, 15000);
    return () => { window.removeEventListener('online', onOnline); clearInterval(t); };
  }, [flushQueue]);

  const toggleStep = async (stepIndex) => {
    if (!progress) return;
    const oldPct = progress.progressPercentage ?? 0;

    // Optimistic local update — the couch/plane case must never lose a row.
    const nextSteps = progress.steps.map((st, i) => (i === stepIndex ? { ...st, completed: !st.completed } : st));
    const completedCount = nextSteps.filter((st) => st.completed).length;
    const newPct = Math.round((completedCount / progress.totalSteps) * 100);
    const desired = nextSteps[stepIndex].completed;
    setProgress((cur) => (cur ? { ...cur, steps: nextSteps, progressPercentage: newPct } : cur));

    const milestone = MILESTONES.find((m) => oldPct < m.at && newPct >= m.at);
    if (milestone) {
      fireConfetti({ count: milestone.at === 100 ? 160 : 80 });
      showToast(milestone.message, 'success');
    }

    try {
      const updated = await fetchJson(`/api/progress/${progress.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex, completed: desired }),
      });
      setProgress((cur) => (cur ? { ...updated, notes: cur.notes ?? updated.notes } : updated));
    } catch {
      // Queue the DESIRED state (replay-safe) and keep the optimistic UI.
      const q = readQueue().filter((x) => !(x.progressId === progress.id && x.stepIndex === stepIndex));
      q.push({ progressId: progress.id, stepIndex, completed: desired });
      writeQueue(q);
      if (!offlineToastRef.current) {
        offlineToastRef.current = true;
        showToast('Offline — progress saved on this device and will sync automatically.', 'info');
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-dvh overflow-hidden bg-surface text-on-surface">
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
      <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
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
      <div className="flex min-h-dvh bg-surface">
        <MobileHeader />
        {confirmPublish && (
          <ConfirmDialog
            title={`Publish "${confirmPublish.title}"?`}
            body="Your pattern appears in the public community feed with your name on it. Anyone can view, star, save, and make it. You can unpublish at any time."
            confirmLabel="Publish"
            danger={false}
            onConfirm={() => handleTogglePublish(confirmPublish.id, false)}
            onCancel={() => setConfirmPublish(null)}
          />
        )}
        {confirmDelete && (
          <ConfirmDialog
            title={`Delete "${confirmDelete.title}"?`}
            body="This removes it from your projects. It stays recoverable for a short while."
            confirmLabel="Delete"
            onConfirm={handleDeleteProject}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
        <SideNav />
        <main id="main-content" tabIndex={-1} className="flex-1 px-5 pt-20 pb-28 md:pt-10 sm:px-6 md:px-10 md:pb-10 lg:px-16 outline-none">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">In Progress</p>
            <h1 className="font-display display-wonk text-[1.9rem] sm:text-[2.4rem] font-bold text-on-surface mb-8">My Projects</h1>

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
                className="grid gap-4 sm:grid-cols-2"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              >
                {allPatterns.map((p) => {
                  const t = getPatternTheme(p.category);
                  const TIcon = t.icon;
                  const pct = progressMap[p.id] ?? 0;
                  const finished = pct >= 100;
                  return (
                    <Motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }} className="group relative">
                      <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); requestTogglePublish(p.id, Boolean(p.publishedAt), p.title); }}
                          aria-label={p.publishedAt ? 'Unpublish pattern' : 'Publish to community'}
                          title={p.publishedAt ? 'Unpublish' : 'Publish to community'}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface-variant shadow-warm backdrop-blur transition-colors hover:text-primary"
                        >
                          {p.publishedAt ? <Globe size={13} className="text-primary" /> : <Lock size={13} />}
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete({ id: p.id, title: p.title }); }}
                          aria-label={`Delete ${p.title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface-variant shadow-warm backdrop-blur transition-colors hover:text-error"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <Link
                        to={`/tracker/${p.id}`}
                        className="group block h-full overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm card-lift"
                      >
                        <div className={`relative h-2 bg-gradient-to-r ${t.accent}`} />
                        <div className="flex items-center gap-4 p-5">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.accent}`}>
                            <TIcon size={19} className="text-white/90" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-semibold text-on-surface truncate">{p.title}</p>
                              <VerifiedBadge pattern={p} compact />
                            </div>
                            <p className="text-xs text-on-surface-variant mt-0.5">{p.difficulty} · {p.category}</p>
                            <p className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${finished ? 'text-secondary' : 'text-primary'}`}>
                              {finished ? 'Finished — well made!' : pct > 0 ? 'In progress' : 'Ready to start'}
                              <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                            </p>
                          </div>
                          <ProgressRing percent={pct} />
                        </div>
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
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-surface">
        <p className="text-on-surface-variant">{error || 'Pattern not found.'}</p>
        <Link to="/create" className="text-primary underline text-sm">Go Back</Link>
      </div>
    );
  }

  const progressPercent = progress?.progressPercentage ?? 0;
  const steps = pattern?.steps || [];
  const nextIdx = steps.findIndex((_, i) => !(progress?.steps?.[i]?.completed ?? false));
  const completedCount = steps.filter((_, i) => progress?.steps?.[i]?.completed ?? false).length;

  return (
    <>
    <PrintablePattern pattern={pattern} steps={steps} terms={terms} />
    {finishShareUrl && <CopyLinkDialog url={finishShareUrl} title="Share your finished make" onClose={() => setFinishShareUrl(null)} />}
    {editing && <PatternEditor pattern={pattern} onSaved={(p) => setPattern(p)} onClose={() => setEditing(false)} />}
    <div className="flex h-dvh overflow-hidden bg-surface text-on-surface print:hidden">
      <SideNav />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col h-full overflow-y-auto outline-none">
        {/* Mobile header */}
        <header className="md:hidden flex justify-between items-center px-5 py-4 border-b border-outline-variant/15">
          <span className="font-display text-lg font-bold text-on-surface">Loopsy</span>
          <button className="text-on-surface-variant" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <MobileNav isOpen={mobileOpen} onClose={closeMobileNav} />
        </header>

        <div className="flex-1 overflow-y-auto p-5 pb-24 md:p-8">
          {/* Studio header — title, live stats, yarn ball */}
          <div className="flex flex-wrap items-start justify-between gap-5 mb-6">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary mb-1.5">Project Studio</p>
              <h1 className="font-display display-wonk text-2xl md:text-3xl font-bold text-on-surface leading-tight">
                {pattern.title}
                <button
                  onClick={() => setEditing(true)}
                  aria-label="Edit pattern"
                  title="Edit the title or fix a step"
                  className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full align-middle text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                >
                  <Pencil size={14} />
                </button>
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                {pattern.category || 'Custom'} · {pattern.difficulty}
                <VerifiedBadge pattern={pattern} className="ml-2 align-text-bottom" />
                {pattern.isExperimental && (
                  <span
                    className="ml-2 rounded-full bg-tertiary-container px-2 py-0.5 text-xs font-semibold text-on-tertiary-container"
                    title="Written freeform by AI — stitch counts could not be independently verified"
                  >
                    Experimental
                  </span>
                )}
                {pattern.isFallback && (
                  <span className="ml-2 rounded-full bg-error-container px-2 py-0.5 text-xs font-semibold text-on-error-container">
                    AI fallback
                  </span>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {[
                  { label: 'Rows done', value: `${completedCount} / ${steps.length}` },
                  { label: 'Remaining', value: steps.length - completedCount },
                  { label: 'Est. time', value: pattern.timeEstimate || '—' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 px-3.5 py-2 shadow-warm">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{s.label}</p>
                    <p className="text-sm font-bold text-on-surface">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <YarnBallProgress percent={progressPercent} size={110} />
          </div>

          {/* Up-next spotlight — the row you're working, front and center */}
          {nextIdx >= 0 ? (
            <Motion.section
              layout
              className="pulse-ring relative overflow-hidden rounded-2xl border border-primary/25 bg-surface-container-lowest shadow-warm-lg p-6 md:p-7 mb-6"
            >
              <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-yarn-coral/12 blur-3xl blob-drift" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    Up next · Row {nextIdx + 1} of {steps.length}
                  </span>
                  {stitchCountOf(steps[nextIdx]?.instruction) != null && (
                    <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-on-secondary-container">
                      {stitchCountOf(steps[nextIdx]?.instruction)} stitches
                    </span>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <Motion.p
                    key={nextIdx}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: EASE.out }}
                    className="font-display text-lg md:text-[1.45rem] leading-snug text-on-surface max-w-3xl"
                  >
                    <StitchStep instruction={steps[nextIdx]?.instruction || ''} />
                  </Motion.p>
                </AnimatePresence>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Motion.button
                    onClick={() => toggleStep(nextIdx)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING.snappy}
                    className="shine-sweep inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md"
                  >
                    <Check size={16} />
                    Mark row done
                  </Motion.button>
                  <Motion.button
                    onClick={() => setCrochetMode(true)}
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING.snappy}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors"
                  >
                    <Maximize2 size={14} />
                    Crochet Mode
                  </Motion.button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                    title="Print or save this pattern as a PDF"
                  >
                    <Printer size={14} />
                    Print / PDF
                  </button>
                </div>
              </div>
            </Motion.section>
          ) : (
            <Motion.section
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-secondary/30 bg-secondary-container/40 shadow-warm-lg p-6 md:p-7 mb-6 text-center"
            >
              <p className="font-display text-xl md:text-2xl font-bold text-on-surface">Finished! You made this. 🎉</p>
              <p className="mt-1.5 text-sm text-on-surface-variant">Every row checked — take the victory lap, then share the make.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={handlePublishThis}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm"
                >
                  <Globe size={15} />
                  {pattern.publishedAt ? 'Published ✓' : 'Publish to community'}
                </button>
                {pattern.publishedAt && (
                  <button
                    onClick={handleShareFinished}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Share link
                  </button>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <ArrowRight size={15} />
                  Make your next thing
                </Link>
                <button
                  onClick={() => fireConfetti({ count: 160 })}
                  className="inline-flex items-center gap-2 rounded-full border border-secondary/40 px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary-container/40 transition-colors"
                >
                  <Sparkles size={15} />
                  Celebrate
                </button>
              </div>
            </Motion.section>
          )}

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

            {/* Right panel — tabbed guide with timeline steps */}
            <section className="w-full lg:w-7/12 flex flex-col rounded-2xl border border-outline-variant/20 shadow-warm bg-surface-container-lowest overflow-hidden">
              {/* Tab bar */}
              <div className="px-4 pt-2 border-b border-outline-variant/15 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="ml-auto order-last pb-1"><TermsToggle mode={terms} onChange={setTerms} /></span>
                  {[
                    { id: 'steps', label: 'Steps', count: steps.length },
                    { id: 'materials', label: 'Materials', count: (pattern.materials || []).length },
                    { id: 'notes', label: 'Notes', count: (pattern.notes || []).length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPanelTab(tab.id)}
                      className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
                        panelTab === tab.id ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && <span className="ml-1.5 text-[11px] font-bold opacity-60">{tab.count}</span>}
                      {panelTab === tab.id && (
                        <Motion.span
                          layoutId="tracker-panel-tab"
                          className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-primary"
                          transition={SPRING.snappy}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thin yarn-gradient progress bar */}
              <div className="h-1 bg-surface-container-low shrink-0">
                <Motion.div
                  className="h-full bg-gradient-to-r from-yarn-periwinkle via-yarn-rose to-yarn-sage"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 16 }}
                />
              </div>

              {/* Steps — timeline rail with tappable nodes */}
              {panelTab === 'steps' && (
                <div className="flex-1 overflow-y-auto px-4 py-5">
                  {steps.map((stepData, index) => {
                    const isCompleted = progress?.steps?.[index]?.completed ?? false;
                    const isNext = !isCompleted && (index === 0 || (progress?.steps?.[index - 1]?.completed ?? false));
                    const sts = stitchCountOf(stepData.instruction);

                    return (
                      <div key={index} ref={isNext ? currentRowRef : undefined} className="group flex gap-3">
                        {/* Rail node + connector */}
                        <div className="flex flex-col items-center">
                          <Motion.button
                            onClick={() => toggleStep(index)}
                            whileTap={{ scale: 0.82 }}
                            transition={SPRING.snappy}
                            aria-label={`Toggle step ${index + 1}`}
                            aria-pressed={isCompleted}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                              isCompleted
                                ? 'bg-primary border-primary text-on-primary'
                                : isNext
                                  ? 'pulse-ring border-primary bg-primary/10 text-primary'
                                  : 'border-outline-variant/50 text-on-surface-variant group-hover:border-primary/50 group-hover:text-primary'
                            }`}
                          >
                            {isCompleted ? <Check size={13} /> : index + 1}
                          </Motion.button>
                          {index < steps.length - 1 && (
                            <span className={`my-1 w-px flex-1 transition-colors ${isCompleted ? 'bg-primary/40' : 'bg-outline-variant/30'}`} />
                          )}
                        </div>

                        {/* Instruction */}
                        <div
                          onClick={() => toggleStep(index)}
                          className={`mb-3 flex-1 min-w-0 cursor-pointer rounded-xl px-3 py-1.5 -mt-0.5 transition-colors ${
                            isNext ? 'bg-primary/8' : 'hover:bg-surface-container-low'
                          } ${isCompleted ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className={`relative text-sm leading-relaxed ${isCompleted ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                              <StitchStep instruction={renderTerms(stepData.instruction, terms)} />
                              <Motion.span
                                aria-hidden="true"
                                className="pointer-events-none absolute left-0 top-1/2 h-[1.5px] bg-on-surface-variant/80"
                                initial={false}
                                animate={{ width: isCompleted ? '100%' : '0%' }}
                                transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE.out }}
                              />
                            </p>
                            {sts != null && (
                              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isCompleted ? 'bg-surface-container text-on-surface-variant' : 'bg-secondary-container/70 text-on-secondary-container'
                              }`}>
                                {sts} sts
                              </span>
                            )}
                          </div>
                          <AnimatePresence>
                            {isNext && (
                              <Motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 mb-1 flex items-start gap-1.5">
                                  <Lightbulb size={13} className="text-secondary shrink-0 mt-0.5" />
                                  <p className="text-xs text-on-surface-variant">You're here — tap the row when it's done.</p>
                                </div>
                              </Motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Materials checklist */}
              {panelTab === 'materials' && (
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {(pattern.materials || []).length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No materials listed for this pattern.</p>
                  ) : (
                    <ul className="space-y-2">
                      {pattern.materials.map((item) => (
                        <li key={item} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                          <Check size={15} className="shrink-0 text-secondary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Notes + tags */}
              {panelTab === 'notes' && (
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">My project notes</p>
                    <textarea
                      value={myNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Your own notes — hook changes, yarn substitutions, who it's for…"
                      rows={4}
                      className="w-full resize-y rounded-xl bg-surface-container-low px-4 py-3 text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/25"
                    />
                    <p className="mt-1 text-[10px] text-on-surface-variant">{notesSaved ? 'Saved ✓' : 'Saves automatically'}</p>
                  </div>
                  {(pattern.notes || []).length === 0 && (pattern.tags || []).length === 0 && (
                    <p className="text-sm text-on-surface-variant">No maker notes for this pattern.</p>
                  )}
                  {(pattern.notes || []).map((note) => (
                    <div key={note} className="flex items-start gap-2.5 rounded-xl bg-surface-container-low px-4 py-3">
                      <Lightbulb size={15} className="mt-0.5 shrink-0 text-secondary" />
                      <p className="text-sm leading-relaxed text-on-surface-variant">{note}</p>
                    </div>
                  ))}
                  {(pattern.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pattern.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs text-on-surface-variant">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
    </>
  );
}
