import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { SkeletonTemplatePreview } from '../components/Skeleton';
import { getPatternTheme } from '../lib/patternThemes';

export default function Create() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasTemplateRoute = Boolean(templateId);

  // Template-based generation state
  const [template, setTemplate] = useState(null);
  const [templateError, setTemplateError] = useState(null);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('medium');

  // AI generation state
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');

  // Shared state
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [templateMode, setTemplateMode] = useState('template');
  const mode = hasTemplateRoute ? templateMode : 'ai';
  const isTemplateResolved = template?.id === templateId;
  const loadingTemplate = hasTemplateRoute && !isTemplateResolved && templateError?.templateId !== templateId;
  const visibleError = mode === 'template'
    ? (templateError?.templateId === templateId ? templateError.message : actionError)
    : actionError;
  const templateTheme = getPatternTheme(template?.category);

  useEffect(() => {
    if (!templateId) {
      return;
    }

    let cancelled = false;

    fetch(`/api/templates/${templateId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load template');
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setTemplateError(null);
        setTemplate(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setTemplateError({ templateId, message: err.message });
        setTemplate(null);
      });

    return () => {
      cancelled = true;
    };
  }, [templateId]);

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

      // Initialize progress
      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: data.id })
      });
      const progressData = await progressRes.json();

      if (!progressRes.ok) throw new Error(progressData.error || 'Failed to initialize progress');

      navigate(`/tracker/${data.id}`);
    } catch (e) {
      console.error(e);
      setActionError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setActionError(null);

    try {
      const res = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          difficulty
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to generate pattern');

      // Initialize progress
      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId: data.id })
      });
      const progressData = await progressRes.json();

      if (!progressRes.ok) throw new Error(progressData.error || 'Failed to initialize progress');

      navigate(`/tracker/${data.id}`);
    } catch (e) {
      console.error(e);
      setActionError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNav />

      <main className="flex-grow relative overflow-y-auto">
        <header className="md:hidden flex justify-between items-center px-6 py-4 sticky top-0 bg-surface/90 backdrop-blur-md z-10">
          <Link to="/" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-sm font-semibold">Explore</span>
          </Link>
          <span className="text-lg font-black text-on-surface tracking-tighter">StitchFlow AI</span>
          <button className="text-primary" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        </header>

        <div className="p-6 pt-2 md:p-12 lg:p-20">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary-fixed-dim/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">

          <header className="mb-16">
            <h2 className="text-[3.5rem] font-bold font-headline text-on-surface tracking-[-0.02em] leading-tight mb-4">
              {mode === 'template' ? 'Customize your pattern.' : 'Draft your next masterpiece.'}
            </h2>
            <p className="text-on-surface-variant text-lg font-body max-w-2xl leading-relaxed">
              {mode === 'template'
                ? 'Personalize this template with your preferred colors and size.'
                : 'Describe what you want to create, set your skill level, and let our AI engine generate a complete, step-by-step crochet pattern tailored just for you.'}
            </p>
          </header>

          {/* Mode Toggle */}
          {hasTemplateRoute && (
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setTemplateMode('template')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  mode === 'template'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Use Template
              </button>
              <button
                onClick={() => setTemplateMode('ai')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  mode === 'ai'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                AI Generate
              </button>
            </div>
          )}

          {mode === 'template' && template && (
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-8 md:p-12 shadow-[0_20px_40px_-10px_rgba(26,28,31,0.06)] relative border border-outline-variant/10">
              {visibleError && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined shrink-0">error</span>
                  <p className="flex-1">{visibleError}</p>
                  <button onClick={() => { setActionError(null); setTemplateError(null); }} className="shrink-0 hover:opacity-70">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              {/* Template Preview */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`relative h-56 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${templateTheme.accent}`}>
                  <div className={`absolute -top-10 right-0 h-28 w-28 rounded-full blur-3xl ${templateTheme.orb}`}></div>
                  <div className="absolute inset-x-6 bottom-6 top-6 rounded-[1.25rem] border border-white/50 bg-white/45 backdrop-blur-sm"></div>
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div className="rounded-2xl bg-white/80 px-4 py-3 backdrop-blur-sm">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant">{template.category}</p>
                      <h3 className="mt-1 text-xl font-black text-on-surface">{template.name}</h3>
                    </div>
                    <div className="rounded-full bg-white/80 p-3 shadow-sm">
                      <span className="material-symbols-outlined">{templateTheme.icon}</span>
                    </div>
                  </div>
                  <span className="absolute top-3 right-3 px-3 py-1 bg-surface/80 backdrop-blur-md rounded-full text-xs font-bold text-on-surface">
                    {template.difficulty}
                  </span>
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">{template.name}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{template.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-on-surface-variant">
                    <div>
                      <p className="font-bold text-on-surface">Hook</p>
                      <p>{template.hookSize}</p>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">Yarn</p>
                      <p>{template.yarnWeight}</p>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">Time</p>
                      <p>{template.timeEstimate}</p>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">Finish</p>
                      <p>{template.finishedSize}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(template.tags || []).map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customization Form */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-primary mb-3 uppercase tracking-[0.05em] font-label">Yarn Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g., Deep Red, Ocean Blue, Cream"
                  className="w-full bg-surface-container-low text-on-surface rounded-lg p-4 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed-dim/30 transition-all duration-300 font-body"
                />
              </div>

              <div className="mb-12">
                <label className="block text-sm font-bold text-primary mb-4 uppercase tracking-[0.05em] font-label">Size</label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: 'small', label: 'Small', desc: '×0.75 stitches' },
                    { value: 'medium', label: 'Medium', desc: 'Standard' },
                    { value: 'large', label: 'Large', desc: '×1.25 stitches' }
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSize(s.value)}
                      className={`px-6 py-3 rounded-xl border transition-colors text-left min-w-[140px] ${
                        size === s.value
                          ? 'bg-primary/10 border-2 border-primary text-primary shadow-sm'
                          : 'border border-outline-variant/15 hover:bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <div className="font-bold text-base">{s.label}</div>
                      <div className="text-xs text-on-surface-variant">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-outline-variant/10 flex justify-end items-center gap-6">
                <button
                  onClick={handleTemplateGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl px-10 py-4 font-bold text-lg hover:scale-[1.02] active:scale-95 transition-transform duration-200 shadow-lg shadow-primary/20 flex items-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">{isGenerating ? 'hourglass_empty' : 'check_circle'}</span>
                  {isGenerating ? 'Generating...' : 'Generate Pattern'}
                </button>
              </div>
            </div>
          )}

          {mode === 'template' && loadingTemplate && (
            <SkeletonTemplatePreview />
          )}

          {mode === 'ai' && (
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-8 md:p-12 shadow-[0_20px_40px_-10px_rgba(26,28,31,0.06)] relative border border-outline-variant/10">
              {visibleError && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined shrink-0">error</span>
                  <p className="flex-1">{visibleError}</p>
                  <button onClick={() => { setActionError(null); setTemplateError(null); }} className="shrink-0 hover:opacity-70">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              <div className="mb-12">
                <label className="block text-sm font-bold text-primary mb-3 uppercase tracking-[0.05em] font-label">What do you want to make?</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-surface-container-low text-on-surface rounded-lg p-4 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed-dim/30 transition-all duration-300 font-body resize-none"
                  placeholder="e.g. A small red teddy bear with a blue bow tie, beginner friendly"
                />
              </div>

              <div className="mb-12">
                <label className="block text-sm font-bold text-primary mb-4 uppercase tracking-[0.05em] font-label">Difficulty Level</label>
                <div className="flex flex-wrap gap-4">
                  {['beginner', 'intermediate', 'advanced'].map(level => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`px-6 py-3 rounded-xl border transition-colors capitalize ${
                        difficulty === level
                          ? 'bg-primary/10 border-2 border-primary text-primary shadow-sm'
                          : 'border border-outline-variant/15 hover:bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <span className="font-bold text-base block">{level}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-12 rounded-2xl bg-surface-container-low p-5">
                <p className="text-sm font-bold text-on-surface mb-2">Prompt guidance</p>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Include the project type, size, colors, recipient, and any stitch mood you want. Example: "A beginner-friendly sunflower tote bag in cream and moss green with sturdy handles."
                </p>
              </div>

              <div className="pt-8 border-t border-outline-variant/10 flex justify-end items-center gap-6">
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !prompt}
                  className="bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl px-10 py-4 font-bold text-lg hover:scale-[1.02] active:scale-95 transition-transform duration-200 shadow-lg shadow-primary/20 flex items-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">{isGenerating ? 'hourglass_empty' : 'magic_button'}</span>
                  {isGenerating ? 'Generating...' : 'Generate Pattern'}
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
