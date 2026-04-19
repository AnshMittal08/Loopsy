import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SideNav from '../components/SideNav';

export default function Tracker() {
  const { patternId } = useParams();
  const [pattern, setPattern] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patternId) return;
    
    Promise.all([
      fetch(`/api/patterns/${patternId}`).then(res => res.json()),
      fetch(`/api/progress/pattern/${patternId}`).then(res => res.json())
    ])
    .then(async ([patData, progData]) => {
      setPattern(patData);
      if (progData && progData.length > 0) {
        setProgress(progData[0]);
      } else if (patData && patData.id) {
        // Auto-initialize progress if visiting tracker directly
        try {
          const initRes = await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patternId: patData.id })
          });
          const initData = await initRes.json();
          // GET the full record to get the correct 'id' field
          const freshProg = await fetch(`/api/progress/pattern/${patData.id}`).then(r => r.json());
          if (freshProg && freshProg.length > 0) setProgress(freshProg[0]);
        } catch (_) {}
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [patternId]);

  const toggleStep = async (stepIndex) => {
    if (!progress) return;
    try {
      const res = await fetch(`/api/progress/${progress.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex })
      });
      const updated = await res.json();
      setProgress(updated);
    } catch (e) {
      console.error("Failed to update progress", e);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Loading pattern...</p></div>;
  }

  if (!pattern) {
    return <div className="flex items-center justify-center h-screen flex-col gap-4">
      <p>Pattern not found.</p>
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
              <p className="text-on-surface-variant text-sm font-body">Based on Template #{pattern.templateId}</p>
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
                className={`h-3 flex-1 rounded-full ${progress?.completedSteps?.includes(i) ? 'bg-secondary' : 'bg-surface-container-high'}`}
              ></div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-[500px]">
          {/* Preview Image Side */}
          <section className="w-full md:w-5/12 h-64 md:h-full relative rounded-xl overflow-hidden bg-surface-container-low flex flex-col shadow-sm">
            <div className="absolute inset-0 z-0">
              <img 
                alt="Pattern preview" 
                className="w-full h-full object-cover opacity-90 mix-blend-multiply" 
                src={`https://picsum.photos/seed/${encodeURIComponent(pattern.title)}/600/800`} 
              />
            </div>
            <div className="z-10 mt-auto p-6">
              <div className="glass-panel rounded-xl p-6 ambient-shadow bg-surface-container-lowest/80 backdrop-blur-md">
                <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface mb-2">{pattern.title}</h1>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">palette</span>
                    {pattern.customization?.color}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">aspect_ratio</span>
                    {pattern.customization?.size}
                  </span>
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
            
            <div className="flex-grow overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
              {pattern.steps.map((stepText, index) => {
                const isCompleted = progress?.completedSteps?.includes(index);
                const isNext = !isCompleted && (index === 0 || progress?.completedSteps?.includes(index - 1));

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
                        {stepText}
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
