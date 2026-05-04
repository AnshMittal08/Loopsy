import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { SkeletonTrackerLayout } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { getPatternTheme } from '../lib/patternThemes';
import StitchStep from '../components/StitchTooltip';
import { useAuth } from '../components/AuthProvider';
import AiTutor from '../components/AiTutor';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function ProgressRing({ percent, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#D4E4F4" strokeWidth={10}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="#1E40AF"
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-primary">{percent}%</span>
        <span className="text-xs text-on-surface-variant">done</span>
      </div>
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
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  const { showToast } = useToast();
  const theme = getPatternTheme(pattern?.category);

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
    try {
      const updated = await fetchJson(`/api/progress/${progress.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex }),
      });
      setProgress(updated);
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
            <div className="mb-8 flex items-start justify-between gap-6 animate-pulse">
              <div className="space-y-2">
                <div className="h-7 w-56 rounded-lg bg-surface-container-high" />
                <div className="h-4 w-36 rounded-lg bg-surface-container-high" />
              </div>
              <div className="h-[110px] w-[110px] rounded-full bg-surface-container-high" />
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
            <span className="material-symbols-outlined text-primary text-2xl">menu_book</span>
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
            <h1 className="font-display text-[2.4rem] font-bold text-on-surface mb-8">My Projects</h1>

            {allPatterns === null ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-surface-container-low animate-pulse" />
                ))}
              </div>
            ) : allPatterns.length === 0 ? (
              <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-10 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
                  <span className="material-symbols-outlined text-on-surface-variant">inbox</span>
                </div>
                <p className="text-on-surface-variant mb-5">No projects yet. Start your first one.</p>
                <Link to="/create" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
                  Start a project
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {allPatterns.map((p) => {
                  const t = getPatternTheme(p.category);
                  return (
                    <Link
                      key={p.id}
                      to={`/tracker/${p.id}`}
                      className="flex items-center gap-4 rounded-2xl bg-white border border-outline-variant/20 shadow-warm px-5 py-4 hover:shadow-warm-md transition-shadow card-lift"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.accent}`}>
                        <span className="material-symbols-outlined text-on-surface text-[18px]">{t.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface truncate">{p.title}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{p.difficulty} · {p.category}</p>
                      </div>
                      <span className="material-symbols-outlined text-primary shrink-0">arrow_forward</span>
                    </Link>
                  );
                })}
              </div>
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
            <span className="material-symbols-outlined">menu</span>
          </button>
          <MobileNav isOpen={mobileOpen} onClose={closeMobileNav} />
        </header>

        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface leading-tight">{pattern.title}</h1>
              <p className="text-sm text-on-surface-variant mt-1">
                {pattern.category || 'Custom'} · {pattern.difficulty}
                {pattern.isFallback && (
                  <span className="ml-2 rounded-full bg-error-container px-2 py-0.5 text-xs font-semibold text-on-error-container">
                    AI fallback
                  </span>
                )}
              </p>
            </div>
            <ProgressRing percent={progressPercent} size={100} />
          </div>

          <div className="flex flex-col lg:flex-row gap-5 min-h-0">
            {/* Left panel */}
            <section className="w-full lg:w-5/12 flex flex-col rounded-2xl overflow-hidden border border-outline-variant/20 shadow-warm bg-white">
              {templateImageUrl ? (
                <div className="relative h-48 flex-shrink-0 overflow-hidden">
                  <img src={templateImageUrl} alt={pattern.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-on-surface">
                      <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
                      {pattern.category}
                    </span>
                  </div>
                </div>
              ) : (
                <div className={`relative h-48 flex-shrink-0 overflow-hidden bg-gradient-to-br ${theme.accent} flex items-center justify-center`}>
                  <div className={`absolute -top-8 -right-8 h-28 w-28 rounded-full blur-2xl ${theme.orb}`} />
                  <div className="absolute inset-x-6 inset-y-5 rounded-xl border border-white/50 bg-white/30 backdrop-blur-sm" />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="rounded-full bg-white/80 p-4 shadow-warm">
                      <span className="material-symbols-outlined text-3xl text-on-surface">{theme.icon}</span>
                    </div>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-on-surface">
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
                      <span className="material-symbols-outlined text-[13px]">palette</span>
                      {pattern.customization.color}
                    </span>
                  )}
                  {pattern.customization?.size && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-medium">
                      <span className="material-symbols-outlined text-[13px]">aspect_ratio</span>
                      {pattern.customization.size}
                    </span>
                  )}
                  {pattern.isAIGenerated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
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
            <section className="w-full lg:w-7/12 flex flex-col rounded-2xl border border-outline-variant/20 shadow-warm bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center gap-2 shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]">menu_book</span>
                <h2 className="font-semibold text-on-surface">Step-by-Step Guide</h2>
                <span className="ml-auto text-xs text-on-surface-variant">{steps.length} steps</span>
              </div>

              {/* Tags / meta strip */}
              {((pattern.tags || []).length > 0 || (pattern.materials || []).length > 0) && (
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
                    <label
                      key={index}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl cursor-pointer transition-all relative overflow-hidden ${
                        isCompleted
                          ? 'bg-surface-container-low opacity-55'
                          : isNext
                            ? 'bg-primary-fixed/30 border border-primary/20 shadow-warm'
                            : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      {isNext && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />}

                      <div className={`pt-0.5 ${isNext ? 'pl-2' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => toggleStep(index)}
                          className="accent-primary w-4 h-4"
                          aria-label={`Step ${index + 1}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold mb-1 ${
                          isCompleted ? 'line-through text-on-surface-variant' : isNext ? 'text-primary' : 'text-on-surface-variant'
                        }`}>
                          Step {index + 1}
                          {isCompleted && <span className="ml-1.5 font-normal opacity-60">· done</span>}
                        </p>
                        <p className={`text-sm leading-relaxed ${isCompleted ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                          <StitchStep instruction={stepData.instruction} />
                        </p>
                        {isNext && (
                          <div className="mt-2 px-2.5 py-1.5 bg-secondary-container/60 rounded-lg flex gap-1.5 items-start">
                            <span className="material-symbols-outlined text-secondary text-[13px] shrink-0 mt-0.5">lightbulb</span>
                            <p className="text-xs text-on-secondary-container">Keep track of your stitch count as you work this row!</p>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>

      <AiTutor
        patternId={patternId}
        currentStepIndex={nextIdx >= 0 ? nextIdx : steps.length - 1}
        patternTitle={pattern.title}
        difficulty={pattern.difficulty}
      />
    </div>
  );
}
