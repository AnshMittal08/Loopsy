import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { SkeletonTemplatePreview } from '../components/Skeleton';
import { getPatternTheme } from '../lib/patternThemes';
import { expandAbbreviations } from '../lib/crochetAbbreviations';

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export default function TemplateDetail() {
  const { templateId } = useParams();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchJson(`/api/templates/${templateId}`);
        if (!cancelled) setTemplate(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [templateId]);

  const theme = getPatternTheme(template?.category);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto w-full">
          <SkeletonTemplatePreview />
        </main>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface text-on-surface">
        <p className="text-on-surface-variant">{error || 'Template not found.'}</p>
        <Link to="/" className="text-primary underline">Back to Explore</Link>
      </div>
    );
  }

  const steps = template.defaultPattern || [];

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNav />

      <main className="flex-1 overflow-y-auto">
        <header className="md:hidden flex justify-between items-center px-6 py-4">
          <Link to="/" className="text-2xl font-black text-on-surface tracking-tighter">StitchFlow AI</Link>
          <button className="text-primary" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        </header>

        {/* Hero image */}
        <div className={`relative h-64 md:h-80 overflow-hidden bg-gradient-to-br ${theme.accent}`}>
          {template.imageUrl ? (
            <>
              <img src={template.imageUrl} alt={template.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className={`absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl ${theme.orb}`} />
          )}
          <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-on-surface">{template.difficulty}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-on-surface">
                <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
                {template.category}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">{template.name}</h1>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
          {/* Description */}
          <p className="text-lg text-on-surface-variant leading-relaxed">{template.description}</p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4">
            <Link
              to={`/create/${template.id}`}
              className="rounded-xl bg-gradient-to-r from-primary to-primary-dim px-8 py-4 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              Customize This Pattern
            </Link>
            <Link
              to="/create"
              className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-8 py-4 text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              AI Remix
            </Link>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Hook Size', value: template.hookSize, icon: 'straighten' },
              { label: 'Yarn Weight', value: template.yarnWeight, icon: 'texture' },
              { label: 'Time Estimate', value: template.timeEstimate, icon: 'schedule' },
              { label: 'Finished Size', value: template.finishedSize, icon: 'crop_free' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-outline-variant/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm text-primary">{item.icon}</span>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{item.label}</p>
                </div>
                <p className="font-semibold text-on-surface">{item.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Materials & Notes */}
          <div className="grid gap-6 md:grid-cols-2">
            {(template.materials || []).length > 0 && (
              <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-outline-variant/10">
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-3">Materials</h3>
                <ul className="space-y-2">
                  {template.materials.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm text-secondary shrink-0 mt-0.5">check_circle</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(template.notes || []).length > 0 && (
              <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-outline-variant/10">
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-3">Maker Notes</h3>
                <ul className="space-y-2">
                  {template.notes.map((note, i) => (
                    <li key={i} className="text-sm text-on-surface-variant leading-relaxed">{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tags */}
          {(template.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Default pattern steps */}
          {steps.length > 0 && (
            <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-outline-variant/10">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-4">
                Pattern Steps ({steps.length} steps)
              </h3>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant">
                      {i + 1}
                    </span>
                    <p className="text-on-surface-variant leading-relaxed">{expandAbbreviations(step)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="py-6 text-center">
            <Link
              to={`/create/${template.id}`}
              className="inline-block rounded-full bg-on-surface px-8 py-4 text-sm font-bold uppercase tracking-wide text-white hover:scale-[1.01] transition-transform"
            >
              Start This Pattern
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
