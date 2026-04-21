import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SideNav from '../components/SideNav';
import { getPatternTheme } from '../lib/patternThemes';
import { expandAbbreviations } from '../lib/crochetAbbreviations';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// Animated SVG progress ring
function ProgressRing({ percent, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--md-sys-color-surface-container-high, #e8e0ec)" strokeWidth={10}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--md-sys-color-primary, #7c3aed)"
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-primary">{percent}%</span>
        <span className="text-xs text-on-surface-variant">done</span>
      </div>
    </div>
  );
}


export default function Tracker() {
  const { patternId } = useParams();
  const [pattern, setPattern] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templateImageUrl, setTemplateImageUrl] = useState(null);
  const theme = getPatternTheme(pattern?.category);

  useEffect(() => {
    let cancelled = false;

    async function loadTracker() {
      if (!patternId) { setLoading(false); return; }

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
          setProgress(initData);
        }

        // Load template image if this pattern came from a template
        if (patData.templateId) {
          fetchJson(`/api/templates/${patData.templateId}`)
            .then((tmpl) => { if (!cancelled && tmpl.imageUrl) setTemplateImageUrl(tmpl.imageUrl); })
            .catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTracker();
    return () => { cancelled = true; };
  }, [patternId]);

  const toggleStep = async (stepIndex) => {
    if (!progress) return;
    try {
      const updated = await fetchJson(`/api/progress/${progress.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex }),
      });
      setProgress(updated);
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-on-surface-variant">Loading your pattern…</p>
        </div>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p>{error || 'Pattern not found.'}</p>
        <Link to="/create" className="text-primary underline">Go Back</Link>
      </div>
    );
  }

  const progressPercent = progress?.progressPercentage ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNav />

      <main className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full">
        <header className="md:hidden flex justify-between items-center mb-6">
          <div className="text-2xl font-black text-on-surface tracking-tighter">StitchFlow AI</div>
          <button className="text-primary"><span className="material-symbols-outlined">menu</span></button>
        </header>

        {/* Title + Progress Ring */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-on-surface font-headline">{pattern.title}</h2>
            <p className="text-on-surface-variant text-sm mt-1">
              {pattern.category || 'Custom'} · {pattern.difficulty}
              {pattern.isFallback && <span className="ml-2 rounded-full bg-error-container px-2 py-0.5 text-xs font-bold text-on-error-container">AI fallback</span>}
            </p>
          </div>
          <ProgressRing percent={progressPercent} size={110} />
        </div>

        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[500px]">
          {/* Left panel */}
          <section className="w-full md:w-5/12 flex flex-col rounded-[1.75rem] overflow-hidden shadow-sm">
            {/* Hero image area */}
            {templateImageUrl ? (
              <div className="relative h-56 flex-shrink-0 overflow-hidden">
                <img src={templateImageUrl} alt={pattern.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-on-surface backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
                    {pattern.category}
                  </span>
                </div>
              </div>
            ) : (
              /* Gradient artwork for AI patterns without a template image */
              <div className={`relative h-56 flex-shrink-0 overflow-hidden bg-gradient-to-br ${theme.accent} flex items-center justify-center`}>
                <div className={`absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl ${theme.orb}`} />
                <div className="absolute inset-x-8 inset-y-6 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="rounded-full bg-white/80 p-5 shadow-md">
                    <span className="material-symbols-outlined text-4xl text-on-surface">{theme.icon}</span>
                  </div>
                  <span className="rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold text-on-surface backdrop-blur-sm">
                    {pattern.category || 'Custom project'}
                  </span>
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="flex-1 overflow-y-auto bg-surface-container-lowest p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {pattern.customization?.color && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-xs font-semibold">
                    <span className="material-symbols-outlined text-[14px]">palette</span>
                    {pattern.customization.color}
                  </span>
                )}
                {pattern.customization?.size && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold">
                    <span className="material-symbols-outlined text-[14px]">aspect_ratio</span>
                    {pattern.customization.size}
                  </span>
                )}
                {pattern.isAIGenerated && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    AI generated
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Hook</p>
                  <p className="mt-1 font-semibold text-on-surface">{pattern.hookSize || '—'}</p>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Yarn</p>
                  <p className="mt-1 font-semibold text-on-surface">{pattern.yarnWeight || '—'}</p>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Time</p>
                  <p className="mt-1 font-semibold text-on-surface">{pattern.timeEstimate || '—'}</p>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Finish</p>
                  <p className="mt-1 font-semibold text-on-surface">{pattern.finishedSize || '—'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right panel — steps */}
          <section className="w-full md:w-7/12 flex flex-col bg-surface rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
            <div className="p-5 border-b border-surface-container">
              <h2 className="font-headline text-xl font-bold text-primary tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined">auto_awesome</span>
                Step-by-Step Guide
              </h2>
            </div>

            <div className="border-b border-outline-variant/10 bg-surface-container-low px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {(pattern.tags || []).map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">#{tag}</span>
                ))}
              </div>
              {pattern.promptSummary && (
                <p className="mt-2 text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">Prompt:</span> {pattern.promptSummary}
                </p>
              )}
            </div>

            {((pattern.materials || []).length > 0 || (pattern.notes || []).length > 0) && (
              <div className="grid gap-5 border-b border-outline-variant/10 bg-surface-container-low px-5 py-5 md:grid-cols-2">
                {(pattern.materials || []).length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-2">Materials</h3>
                    <ul className="space-y-1">
                      {pattern.materials.map((item) => (
                        <li key={item} className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(pattern.notes || []).length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-2">Maker Notes</h3>
                    <ul className="space-y-1">
                      {pattern.notes.map((note) => (
                        <li key={note} className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex-grow overflow-y-auto px-5 py-5 space-y-3">
              {pattern.steps.map((stepData, index) => {
                const isCompleted = progress?.steps?.[index]?.completed ?? false;
                const isNext = !isCompleted && (index === 0 || (progress?.steps?.[index - 1]?.completed ?? false));

                return (
                  <label
                    key={index}
                    className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-colors relative overflow-hidden ${
                      isCompleted
                        ? 'bg-surface-container-lowest opacity-60'
                        : isNext
                          ? 'bg-surface-container-highest shadow-sm border border-outline-variant/20'
                          : 'bg-surface-container-low'
                    }`}
                  >
                    {isNext && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />}

                    <div className={`pt-0.5 ${isNext ? 'pl-2' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleStep(index)}
                        className="accent-primary w-4 h-4"
                      />
                    </div>

                    <div className="flex-grow min-w-0">
                      <h4 className={`font-headline text-sm font-bold mb-1 ${
                        isCompleted ? 'line-through text-on-surface-variant' : isNext ? 'text-primary' : 'text-on-surface'
                      }`}>
                        Step {index + 1}
                        {isCompleted && <span className="ml-2 text-xs font-normal opacity-60">✓ complete</span>}
                      </h4>
                      <p className={`text-sm leading-relaxed ${isCompleted ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                        {expandAbbreviations(stepData.instruction)}
                      </p>
                      {isNext && (
                        <div className="mt-2 p-2 bg-secondary-container rounded-lg flex gap-2 items-start">
                          <span className="material-symbols-outlined text-on-secondary-container text-sm shrink-0">lightbulb</span>
                          <p className="text-xs text-on-secondary-container font-medium">Keep track of your stitch count as you work this row!</p>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
