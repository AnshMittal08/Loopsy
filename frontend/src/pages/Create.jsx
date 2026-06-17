import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Menu, Lock, AlertCircle, X, Sparkles, CheckCircle2, Lightbulb, RotateCcw, Camera, PenLine } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { SkeletonTemplatePreview } from '../components/Skeleton';
import { ThreadSpinner } from '../components/motion/Thread';
import { Reveal } from '../components/motion/Reveal';
import Magnetic from '../components/motion/Magnetic';
import VerifiedBadge from '../components/VerifiedBadge';
import VisionStudio from '../components/VisionStudio';
import { getPatternTheme } from '../lib/patternThemes';
import { SPRING, fadeRise, staggerChildren, popIn } from '../lib/motionTokens';
import { fireConfetti } from '../lib/confetti';
import { readGenerationStream } from '../lib/generationStream';
import { useAuth } from '../components/AuthProvider';

const LOADING_LINES = [
  'Reading your idea…',
  'Sketching the shape…',
  'Counting every stitch…',
  'Winding the yarn…',
  'Writing it up beautifully…',
];

/* ── Generation theater — the loading state is a moment, not a spinner ──
   When the API streams (AI mode), `statusMessage` carries the real pipeline
   stage and `steps` fills with computed rows that typewriter in live. */
function GenerationTheater({ statusMessage, steps = [] }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => (i + 1) % LOADING_LINES.length), 1900);
    return () => clearInterval(id);
  }, []);

  // Steps arrive in bursts from the compiler; pace the reveal so the feed
  // reads as the pattern being written, one row at a time.
  useEffect(() => {
    if (revealed >= steps.length) return;
    const id = setTimeout(() => setRevealed((r) => r + 1), 280);
    return () => clearTimeout(id);
  }, [revealed, steps.length]);

  const feed = steps.slice(Math.max(0, revealed - 4), revealed);

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 md:p-14 text-center"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-yarn-coral/15 blur-3xl blob-drift" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-yarn-periwinkle/15 blur-3xl blob-drift-slow" />
      <div className="relative flex flex-col items-center gap-6">
        <ThreadSpinner size={72} />
        <div className="h-6" aria-live="polite">
          <AnimatePresence mode="wait">
            <Motion.p
              key={statusMessage || lineIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-semibold text-on-surface"
            >
              {statusMessage || LOADING_LINES[lineIdx]}
            </Motion.p>
          </AnimatePresence>
        </div>

        {feed.length > 0 ? (
          <div className="w-full max-w-md space-y-1.5 text-left" aria-live="polite">
            <AnimatePresence initial={false}>
              {feed.map((step) => (
                <Motion.p
                  key={step.row}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="truncate rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant"
                >
                  <span className="mr-2 font-bold text-primary">{step.row}</span>
                  {step.instruction}
                </Motion.p>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
            Loopsy is composing your pattern row by row — stitch counts are computed, never guessed.
          </p>
        )}
      </div>
    </Motion.div>
  );
}

/* ── Result view — steps stagger in, materials pop with springs ── */
function GenerationResult({ pattern, onOpenTracker, onReset }) {
  const steps = pattern.steps || [];
  const materials = pattern.materials || [];

  return (
    <Motion.div
      variants={staggerChildren(0.06)}
      initial="hidden"
      animate="visible"
      className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-outline-variant/15">
        <Motion.div variants={fadeRise} className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles size={12} />
            Pattern ready
          </span>
          <VerifiedBadge pattern={pattern} />
          {pattern.isExperimental && (
            <span className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-semibold text-on-tertiary-container">
              Experimental
            </span>
          )}
        </Motion.div>
        <Motion.h2 variants={fadeRise} className="font-display display-wonk text-2xl md:text-3xl font-bold text-on-surface leading-tight">
          {pattern.title}
        </Motion.h2>
        <Motion.p variants={fadeRise} className="mt-1.5 text-sm text-on-surface-variant">
          {pattern.category || 'Custom'} · {pattern.difficulty}
        </Motion.p>
      </div>

      {materials.length > 0 && (
        <div className="px-6 md:px-8 py-5 border-b border-outline-variant/10 bg-surface-container-low">
          <Motion.h3 variants={fadeRise} className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">
            Materials
          </Motion.h3>
          <Motion.ul variants={staggerChildren(0.05, 0.15)} className="flex flex-wrap gap-2">
            {materials.map((item) => (
              <Motion.li
                key={item}
                variants={popIn}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-on-surface-variant"
              >
                <CheckCircle2 size={12} className="text-secondary shrink-0" />
                {item}
              </Motion.li>
            ))}
          </Motion.ul>
        </div>
      )}

      <div className="px-6 md:px-8 py-5 max-h-80 overflow-y-auto custom-scrollbar">
        <Motion.h3 variants={fadeRise} className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">
          Steps ({steps.length})
        </Motion.h3>
        <Motion.ol variants={staggerChildren(0.04, 0.25)} className="space-y-2">
          {steps.map((step, i) => (
            <Motion.li key={i} variants={fadeRise} className="flex items-start gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-on-surface-variant leading-relaxed pt-0.5">{step.instruction}</p>
            </Motion.li>
          ))}
        </Motion.ol>
      </div>

      <Motion.div variants={fadeRise} className="flex flex-wrap items-center justify-end gap-3 px-6 md:px-8 py-5 border-t border-outline-variant/15">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-6 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <RotateCcw size={15} />
          Make another
        </button>
        <Magnetic>
          <button
            onClick={onOpenTracker}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md"
          >
            Start tracking
            <ArrowRight size={16} />
          </button>
        </Magnetic>
      </Motion.div>
    </Motion.div>
  );
}

export default function Create() {
  const { user, loading: authLoading } = useAuth();
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  const hasTemplateRoute = Boolean(templateId);

  const [template, setTemplate] = useState(null);
  const [templateError, setTemplateError] = useState(null);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('medium');

  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [aiSubMode, setAiSubMode] = useState('describe'); // 'describe' | 'photo'

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamStatus, setStreamStatus] = useState(null);
  const [streamSteps, setStreamSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [templateMode, setTemplateMode] = useState('template');
  const mode = hasTemplateRoute ? templateMode : 'ai';
  const isTemplateResolved = template?.id === templateId;
  const loadingTemplate = hasTemplateRoute && !isTemplateResolved && templateError?.templateId !== templateId;
  const visibleError = mode === 'template'
    ? (templateError?.templateId === templateId ? templateError.message : actionError)
    : actionError;
  const templateTheme = getPatternTheme(template?.category);
  const TemplateIcon = templateTheme.icon;

  useEffect(() => {
    if (!user || !templateId) return;
    let cancelled = false;
    fetch(`/api/templates/${templateId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load template');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setTemplateError(null);
        setTemplate(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setTemplateError({ templateId, message: err.message });
        setTemplate(null);
      });
    return () => { cancelled = true; };
  }, [templateId, user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <ThreadSpinner size={56} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-surface text-on-surface">
        <SideNav />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <Reveal className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock size={24} className="text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-on-surface mb-2">Sign in to create</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
              AI generations and template projects are saved to your account.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
                Go to account
              </Link>
              <Link to="/" className="rounded-full border border-outline-variant/30 px-6 py-3 text-center text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
                Back to explore
              </Link>
            </div>
          </Reveal>
        </main>
      </div>
    );
  }

  const handleTemplateGenerate = async () => {
    if (!template) return;
    setIsGenerating(true);
    setActionError(null);
    try {
      const res = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          title: `${template.name} - ${color || 'Custom'}`,
          customization: { color: color || null, size }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate pattern');

      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: data.id })
      });
      const progressData = await progressRes.json();
      if (!progressRes.ok) throw new Error(progressData.error || 'Failed to initialize progress');
      setResult(data);
      fireConfetti({ count: 70 });
    } catch (e) {
      setActionError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setActionError(null);
    setRateLimitHit(false);
    setStreamStatus(null);
    setStreamSteps([]);
    try {
      const res = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, difficulty, stream: true })
      });

      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('text/event-stream')) {
        // Streaming generation — pipeline stages and computed rows arrive live.
        data = await readGenerationStream(res, {
          onStatus: (status) => setStreamStatus(status.message),
          onStep: (step) => setStreamSteps((prev) => [...prev, step]),
        });
      } else {
        data = await res.json();
        if (!res.ok) {
          if (res.status === 429 && data.code === 'RATE_LIMIT_EXCEEDED') {
            setActionError(data.error);
            setRateLimitHit(true);
            return;
          }
          throw new Error(data.error || 'Failed to generate pattern');
        }
      }

      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: data.id })
      });
      const progressData = await progressRes.json();
      if (!progressRes.ok) throw new Error(progressData.error || 'Failed to initialize progress');
      setResult(data);
      fireConfetti({ count: 90 });
    } catch (e) {
      setActionError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Vision Studio: compile a user-approved Design Spec through the same
  // streaming theater the text path uses.
  const handleCompileFromSpec = async (spec) => {
    setIsGenerating(true);
    setActionError(null);
    setRateLimitHit(false);
    setStreamStatus(null);
    setStreamSteps([]);
    try {
      const res = await fetch('/api/ai/generate-from-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, difficulty, stream: true })
      });

      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('text/event-stream')) {
        data = await readGenerationStream(res, {
          onStatus: (status) => setStreamStatus(status.message),
          onStep: (step) => setStreamSteps((prev) => [...prev, step]),
        });
      } else {
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to compile the design');
      }

      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: data.id })
      });
      const progressData = await progressRes.json();
      if (!progressRes.ok) throw new Error(progressData.error || 'Failed to initialize progress');
      setResult(data);
      fireConfetti({ count: 90 });
    } catch (e) {
      setActionError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateButton = (onClick, disabled, label) => (
    <Magnetic>
      <Motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.03 }}
        whileTap={disabled ? {} : { scale: 0.97 }}
        transition={SPRING.snappy}
        className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <ThreadSpinner size={18} className="text-on-primary" />
        ) : (
          label === 'ai' ? <Sparkles size={17} /> : <CheckCircle2 size={17} />
        )}
        {isGenerating ? 'Spinning up your pattern…' : 'Generate Pattern'}
      </Motion.button>
    </Magnetic>
  );

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <SideNav />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between px-5 py-4 glass-panel border-b border-outline-variant/15">
          <Link to="/" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
            <ArrowLeft size={19} />
            <span className="text-sm font-medium">Explore</span>
          </Link>
          <span className="font-display text-lg font-bold text-on-surface">Loopsy</span>
          <button className="text-on-surface-variant" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <MobileNav isOpen={mobileOpen} onClose={closeMobileNav} />
        </header>

        <div className="px-6 py-10 md:px-12 md:py-14 lg:px-20">
          <div className="max-w-3xl mx-auto">

            {/* Page header */}
            <Reveal className="mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">
                {mode === 'template' ? 'Template Studio' : 'AI Studio'}
              </p>
              <h1 className="font-display display-wonk text-[2.6rem] md:text-[3.2rem] font-bold text-on-surface leading-tight tracking-tight">
                {mode === 'template' ? 'Customize your pattern.' : 'Draft your next masterpiece.'}
              </h1>
              <p className="mt-4 text-on-surface-variant text-base leading-relaxed max-w-xl">
                {mode === 'template'
                  ? 'Personalize this template with your preferred colors and size.'
                  : 'Describe your idea and let AI generate a complete step-by-step crochet pattern.'}
              </p>
            </Reveal>

            {/* Generation theater — the loading state is a moment */}
            {isGenerating && <GenerationTheater statusMessage={streamStatus} steps={streamSteps} />}

            {/* Result view — verified badge, staggered steps, springy materials */}
            {!isGenerating && result && (
              <GenerationResult
                pattern={result}
                onOpenTracker={() => navigate(`/tracker/${result.id}`)}
                onReset={() => setResult(null)}
              />
            )}

            {/* Mode toggle (template route only) */}
            {!isGenerating && !result && hasTemplateRoute && (
              <div className="flex gap-2 mb-8 p-1 rounded-full bg-surface-container-low w-fit">
                {[
                  { id: 'template', label: 'Use Template' },
                  { id: 'ai', label: 'AI Generate' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTemplateMode(tab.id)}
                    className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                      mode === tab.id ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {mode === tab.id && (
                      <Motion.span
                        layoutId="create-mode-pill"
                        className="absolute inset-0 rounded-full bg-primary shadow-warm"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative">{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Template mode */}
            {!isGenerating && !result && mode === 'template' && loadingTemplate && <SkeletonTemplatePreview />}

            {!isGenerating && !result && mode === 'template' && template && (
              <Reveal className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm overflow-hidden">
                {visibleError && (
                  <div className="mx-6 mt-6 p-4 bg-error-container text-on-error-container rounded-xl flex items-start gap-3">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-sm">{visibleError}</p>
                    <button onClick={() => { setActionError(null); setTemplateError(null); }} className="shrink-0 hover:opacity-70">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Template hero */}
                <div className={`relative h-52 bg-gradient-to-br ${templateTheme.accent} overflow-hidden`}>
                  <div className={`absolute -top-8 right-0 h-32 w-32 rounded-full blur-3xl ${templateTheme.orb}`} />
                  <div className="absolute inset-x-6 inset-y-5 rounded-xl border border-white/50 bg-white/30 backdrop-blur-sm" />
                  <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
                    <div className="rounded-xl bg-surface-container-lowest/85 px-4 py-2.5 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{template.category}</p>
                      <h3 className="mt-0.5 text-lg font-bold text-on-surface leading-tight">{template.name}</h3>
                    </div>
                    <div className="rounded-full bg-surface-container-lowest/85 p-2.5">
                      <TemplateIcon size={20} className="text-on-surface" />
                    </div>
                  </div>
                  <span className="absolute top-3 right-3 px-3 py-1 bg-surface-container-lowest/80 backdrop-blur-md rounded-full text-xs font-semibold text-on-surface">
                    {template.difficulty}
                  </span>
                </div>

                <div className="p-6 md:p-8">
                  {/* Template meta */}
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-5">{template.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
                    {[
                      { label: 'Hook', value: template.hookSize },
                      { label: 'Yarn', value: template.yarnWeight },
                      { label: 'Time', value: template.timeEstimate },
                      { label: 'Size', value: template.finishedSize },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl bg-surface-container-low p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-1">{m.label}</p>
                        <p className="text-sm font-semibold text-on-surface">{m.value || '—'}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  {(template.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {template.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Customization */}
                  <div className="space-y-6 border-t border-outline-variant/15 pt-6">
                    <div>
                      <label className="block text-sm font-semibold text-on-surface mb-2">Yarn color</label>
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="e.g. Deep Red, Ocean Blue, Cream"
                        className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-on-surface mb-3">Size</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { value: 'small', label: 'Small', desc: '×0.75 stitches' },
                          { value: 'medium', label: 'Medium', desc: 'Standard' },
                          { value: 'large', label: 'Large', desc: '×1.25 stitches' },
                        ].map((s) => (
                          <Motion.button
                            key={s.value}
                            onClick={() => setSize(s.value)}
                            whileTap={{ scale: 0.96 }}
                            transition={SPRING.snappy}
                            className={`rounded-xl px-5 py-3 text-left min-w-[120px] border transition-all ${
                              size === s.value
                                ? 'bg-primary/8 border-primary text-primary shadow-warm'
                                : 'border-outline-variant/20 hover:bg-surface-container-low text-on-surface-variant'
                            }`}
                          >
                            <p className="font-semibold text-sm">{s.label}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{s.desc}</p>
                          </Motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    {generateButton(handleTemplateGenerate, isGenerating, 'template')}
                  </div>
                </div>
              </Reveal>
            )}

            {/* AI mode */}
            {!isGenerating && !result && mode === 'ai' && (
              <Reveal className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6 md:p-8">
                {visibleError && (
                  <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl flex items-start gap-3">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-sm">
                      {visibleError}
                      {rateLimitHit && (
                        <Link to="/account" className="ml-1 underline font-semibold">View plans →</Link>
                      )}
                    </p>
                    <button onClick={() => { setActionError(null); setRateLimitHit(false); }} className="shrink-0 hover:opacity-70">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Describe ↔ From photo sub-toggle */}
                <div className="flex gap-2 mb-6 p-1 rounded-full bg-surface-container-low w-fit">
                  {[
                    { id: 'describe', label: 'Describe' },
                    { id: 'photo', label: 'From photo' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setAiSubMode(id)}
                      className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                        aiSubMode === id ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {aiSubMode === id && (
                        <Motion.span
                          layoutId="ai-submode-pill"
                          className="absolute inset-0 rounded-full bg-primary shadow-warm"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        {id === 'describe' ? <PenLine size={14} /> : <Camera size={14} />}
                        {label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Difficulty — shared across both sub-modes */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-on-surface mb-3">Difficulty level</label>
                  <div className="flex flex-wrap gap-3">
                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                      <Motion.button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING.snappy}
                        className={`rounded-xl px-5 py-2.5 border text-sm font-medium capitalize transition-all ${
                          difficulty === level
                            ? 'bg-primary/8 border-primary text-primary shadow-warm'
                            : 'border-outline-variant/20 hover:bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        {level}
                      </Motion.button>
                    ))}
                  </div>
                </div>

                {aiSubMode === 'describe' ? (
                  <>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-on-surface mb-2">What do you want to make?</label>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          rows={4}
                          className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                          placeholder="e.g. A small red teddy bear with a blue bow tie, beginner friendly"
                        />
                      </div>

                      <div className="rounded-xl bg-tertiary-container/50 border border-tertiary/20 p-4">
                        <p className="text-sm font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                          <Lightbulb size={14} className="text-tertiary" />
                          Prompt tips
                        </p>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          Include project type, size, colors, and recipient. Example: "A beginner-friendly sunflower tote bag in cream and moss green with sturdy handles."
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                      {generateButton(handleAIGenerate, isGenerating || !prompt, 'ai')}
                    </div>
                  </>
                ) : (
                  <VisionStudio
                    onCompile={handleCompileFromSpec}
                    disabled={isGenerating}
                  />
                )}
              </Reveal>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
