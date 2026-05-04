import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { SkeletonTemplatePreview } from '../components/Skeleton';
import { getPatternTheme } from '../lib/patternThemes';
import { useAuth } from '../components/AuthProvider';

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

  const [isGenerating, setIsGenerating] = useState(false);
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
        <p className="text-on-surface-variant">Loading workspace…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-surface text-on-surface">
        <SideNav />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-outlined text-primary text-2xl">lock</span>
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
          </div>
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
      navigate(`/tracker/${data.id}`);
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
    try {
      const res = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, difficulty })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.code === 'RATE_LIMIT_EXCEEDED') {
          setActionError(data.error);
          setRateLimitHit(true);
          return;
        }
        throw new Error(data.error || 'Failed to generate pattern');
      }

      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: data.id })
      });
      const progressData = await progressRes.json();
      if (!progressRes.ok) throw new Error(progressData.error || 'Failed to initialize progress');
      navigate(`/tracker/${data.id}`);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <SideNav />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface/90 backdrop-blur-md border-b border-outline-variant/15">
          <Link to="/" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-sm font-medium">Explore</span>
          </Link>
          <span className="font-display text-lg font-bold text-on-surface">Loopsy</span>
          <button className="text-on-surface-variant" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <MobileNav isOpen={mobileOpen} onClose={closeMobileNav} />
        </header>

        <div className="px-6 py-10 md:px-12 md:py-14 lg:px-20">
          <div className="max-w-3xl mx-auto">

            {/* Page header */}
            <div className="mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">
                {mode === 'template' ? 'Template Studio' : 'AI Studio'}
              </p>
              <h1 className="font-display text-[2.6rem] md:text-[3.2rem] font-bold text-on-surface leading-tight tracking-tight">
                {mode === 'template' ? 'Customize your pattern.' : 'Draft your next masterpiece.'}
              </h1>
              <p className="mt-4 text-on-surface-variant text-base leading-relaxed max-w-xl">
                {mode === 'template'
                  ? 'Personalize this template with your preferred colors and size.'
                  : 'Describe your idea and let AI generate a complete step-by-step crochet pattern.'}
              </p>
            </div>

            {/* Mode toggle (template route only) */}
            {hasTemplateRoute && (
              <div className="flex gap-2 mb-8 p-1 rounded-full bg-surface-container-low w-fit">
                {[
                  { id: 'template', label: 'Use Template' },
                  { id: 'ai', label: 'AI Generate' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTemplateMode(tab.id)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                      mode === tab.id
                        ? 'bg-primary text-on-primary shadow-warm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Template mode */}
            {mode === 'template' && loadingTemplate && <SkeletonTemplatePreview />}

            {mode === 'template' && template && (
              <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm overflow-hidden">
                {visibleError && (
                  <div className="mx-6 mt-6 p-4 bg-error-container text-on-error-container rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined shrink-0 text-[18px]">error</span>
                    <p className="flex-1 text-sm">{visibleError}</p>
                    <button onClick={() => { setActionError(null); setTemplateError(null); }} className="shrink-0 hover:opacity-70">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}

                {/* Template hero */}
                <div className={`relative h-52 bg-gradient-to-br ${templateTheme.accent} overflow-hidden`}>
                  <div className={`absolute -top-8 right-0 h-32 w-32 rounded-full blur-3xl ${templateTheme.orb}`} />
                  <div className="absolute inset-x-6 inset-y-5 rounded-xl border border-white/50 bg-white/30 backdrop-blur-sm" />
                  <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
                    <div className="rounded-xl bg-white/85 px-4 py-2.5 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{template.category}</p>
                      <h3 className="mt-0.5 text-lg font-bold text-on-surface leading-tight">{template.name}</h3>
                    </div>
                    <div className="rounded-full bg-white/85 p-2.5">
                      <span className="material-symbols-outlined text-on-surface">{templateTheme.icon}</span>
                    </div>
                  </div>
                  <span className="absolute top-3 right-3 px-3 py-1 bg-white/80 backdrop-blur-md rounded-full text-xs font-semibold text-on-surface">
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
                          <button
                            key={s.value}
                            onClick={() => setSize(s.value)}
                            className={`rounded-xl px-5 py-3 text-left min-w-[120px] border transition-all ${
                              size === s.value
                                ? 'bg-primary/8 border-primary text-primary shadow-warm'
                                : 'border-outline-variant/20 hover:bg-surface-container-low text-on-surface-variant'
                            }`}
                          >
                            <p className="font-semibold text-sm">{s.label}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{s.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleTemplateGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim active:scale-95 transition-all shadow-warm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isGenerating ? 'hourglass_empty' : 'check_circle'}
                      </span>
                      {isGenerating ? 'Generating…' : 'Generate Pattern'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI mode */}
            {mode === 'ai' && (
              <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-6 md:p-8">
                {visibleError && (
                  <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined shrink-0 text-[18px]">error</span>
                    <p className="flex-1 text-sm">
                      {visibleError}
                      {rateLimitHit && (
                        <Link to="/account" className="ml-1 underline font-semibold">View plans →</Link>
                      )}
                    </p>
                    <button onClick={() => { setActionError(null); setRateLimitHit(false); }} className="shrink-0 hover:opacity-70">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}

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

                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-3">Difficulty level</label>
                    <div className="flex flex-wrap gap-3">
                      {['beginner', 'intermediate', 'advanced'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`rounded-xl px-5 py-2.5 border text-sm font-medium capitalize transition-all ${
                            difficulty === level
                              ? 'bg-primary/8 border-primary text-primary shadow-warm'
                              : 'border-outline-variant/20 hover:bg-surface-container-low text-on-surface-variant'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-primary-fixed/40 border border-primary-fixed-dim/30 p-4">
                    <p className="text-sm font-semibold text-on-surface mb-1">Prompt tips</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Include project type, size, colors, and recipient. Example: "A beginner-friendly sunflower tote bag in cream and moss green with sturdy handles."
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !prompt}
                    className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim active:scale-95 transition-all shadow-warm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isGenerating ? 'hourglass_empty' : 'auto_awesome'}
                    </span>
                    {isGenerating ? 'Generating…' : 'Generate Pattern'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
