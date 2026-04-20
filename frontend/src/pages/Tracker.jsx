import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SideNav from '../components/SideNav';
import { getPatternTheme } from '../lib/patternThemes';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export default function Tracker() {
  const { patternId } = useParams();
  const [pattern, setPattern] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = getPatternTheme(pattern?.category);

  useEffect(() => {
    let cancelled = false;

    async function loadTracker() {
      if (!patternId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [patData, progData] = await Promise.all([
          fetchJson(`/api/patterns/${patternId}`),
          fetchJson(`/api/progress/pattern/${patternId}`)
        ]);

        if (cancelled) return;

        setPattern(patData);

        if (progData.length > 0) {
          setProgress(progData[0]);
        } else {
          const initData = await fetchJson('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patternId: patData.id })
          });

          if (cancelled) return;
          setProgress(initData);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message);
        setPattern(null);
        setProgress(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTracker();

    return () => {
      cancelled = true;
    };
  }, [patternId]);

  const toggleStep = async (stepIndex) => {
    if (!progress) return;
    try {
      const updated = await fetchJson(`/api/progress/${progress.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex })
      });
      setProgress(updated);
    } catch (e) {
      console.error("Failed to update progress", e);
      setError(e.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Loading pattern...</p></div>;
  }

  if (!pattern) {
    return <div className="flex items-center justify-center h-screen flex-col gap-4">
      <p>{error || 'Pattern not found.'}</p>
      <Link to="/create" className="text-primary underline">Go Back</Link>
    </div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNav />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative p-8 md:p-12 max-w-6xl mx-auto w-full">
        <header className="md:hidden flex justify-between items-center mb-8 w-full z-50">
          <div className="text-2xl font-black text-on-surface tracking-tighter">StitchFlow AI</div>
          <button className="text-primary"><span className="material-symbols-outlined">menu</span></button>
        </header>

        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-2 font-headline">{pattern.title}</h2>
              <p className="text-on-surface-variant text-sm font-body">
                {pattern.category || 'Custom'} • {pattern.difficulty}
                {pattern.templateId ? ` • Based on template ${pattern.templateId}` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{progress?.progressPercentage || 0}%</span>
              <p className="text-xs text-on-surface-variant mt-1">Complete</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2 w-full h-4 items-center">
            {pattern.steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-3 flex-1 rounded-full ${progress?.steps?.[i]?.completed ? 'bg-secondary' : 'bg-surface-container-high'}`}
              ></div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-[500px]">
          {/* Preview Image Side */}
          <section className={`w-full md:w-5/12 h-64 md:h-full relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${theme.accent} flex flex-col shadow-sm`}>
            <div className={`absolute -top-10 right-0 h-36 w-36 rounded-full blur-3xl ${theme.orb}`}></div>
            <div className="absolute inset-x-6 top-6 bottom-40 rounded-[1.5rem] border border-white/50 bg-white/45 backdrop-blur-sm"></div>
            <div className="absolute left-10 top-10 rounded-full bg-white/80 p-4 shadow-sm">
              <span className="material-symbols-outlined text-on-surface">{theme.icon}</span>
            </div>
            <div className="z-10 mt-auto p-6">
              <div className="glass-panel rounded-xl p-6 ambient-shadow bg-surface-container-lowest/85 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{pattern.category || 'Custom project'}</p>
                    <h1 className="mt-2 font-headline text-xl font-bold tracking-tight text-on-surface">{pattern.title}</h1>
                  </div>
                  {pattern.isFallback && (
                    <span className="rounded-full bg-error-container px-3 py-1 text-xs font-bold text-on-error-container">
                      AI fallback
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pattern.customization?.color && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-xs font-semibold">
                      <span className="material-symbols-outlined text-[16px]">palette</span>
                      {pattern.customization.color}
                    </span>
                  )}
                  {pattern.customization?.size && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold">
                      <span className="material-symbols-outlined text-[16px]">aspect_ratio</span>
                      {pattern.customization.size}
                    </span>
                  )}
                  {pattern.isAIGenerated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      AI generated
                    </span>
                  )}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-on-surface-variant">
                  <div>
                    <p className="font-bold text-on-surface">Hook</p>
                    <p>{pattern.hookSize || 'Flexible'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Yarn</p>
                    <p>{pattern.yarnWeight || 'Project dependent'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Time</p>
                    <p>{pattern.timeEstimate || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Finish</p>
                    <p>{pattern.finishedSize || 'Custom fit'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Steps Side */}
          <section className="w-full md:w-7/12 flex flex-col bg-surface rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
            <div className="p-6 bg-surface z-10 border-b border-surface-container">
              <h2 className="font-headline text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Step-by-Step Guide
              </h2>
            </div>

            <div className="border-b border-outline-variant/10 bg-surface-container-low px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {(pattern.tags || []).map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                    #{tag}
                  </span>
                ))}
              </div>
              {pattern.promptSummary && (
                <p className="mt-3 text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">Prompt:</span> {pattern.promptSummary}
                </p>
              )}
            </div>

            <div className="grid gap-6 border-b border-outline-variant/10 bg-surface-container-low px-6 py-5 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-primary">Materials</h3>
                <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  {(pattern.materials || []).map((item) => (
                    <li key={item} className="rounded-xl bg-surface px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-primary">Maker notes</h3>
                <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  {(pattern.notes || []).map((note) => (
                    <li key={note} className="rounded-xl bg-surface px-3 py-2">{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
              {pattern.steps.map((stepData, index) => {
                const isCompleted = progress?.steps?.[index]?.completed;
                const isNext = !isCompleted && (index === 0 || progress?.steps?.[index - 1]?.completed);

                return (
                  <label 
                    key={index} 
                    className={`flex items-start gap-4 p-5 rounded-lg cursor-pointer transition-colors relative overflow-hidden ${
                      isCompleted ? 'bg-surface-container-lowest opacity-70' : 
                      isNext ? 'bg-surface-container-highest shadow-sm border border-outline-variant/20' : 
                      'bg-surface-container-low border border-transparent'
                    }`}
                  >
                    {isNext && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                    
                    <div className={`pt-1 ${isNext ? 'pl-2' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={isCompleted} 
                        onChange={() => toggleStep(index)} 
                        className="accent-primary" 
                      />
                    </div>
                    
                    <div className="flex-grow">
                      <h4 className={`font-headline text-base ${isNext ? 'font-bold text-primary' : 'font-semibold text-on-surface'} mb-1 ${isCompleted ? 'line-through text-opacity-60' : ''}`}>
                        Step {index + 1}
                      </h4>
                      <p className={`font-body text-sm leading-relaxed ${isCompleted ? 'text-on-surface-variant line-through text-opacity-60' : 'text-on-surface'}`}>
                        {stepData.instruction}
                      </p>
                      
                      {isNext && (
                        <div className="mt-3 p-3 bg-secondary-container rounded-lg flex gap-2 items-start">
                          <span className="material-symbols-outlined text-on-secondary-container text-sm">lightbulb</span>
                          <p className="text-xs text-on-secondary-container font-medium">Keep track of your stitch count!</p>
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
