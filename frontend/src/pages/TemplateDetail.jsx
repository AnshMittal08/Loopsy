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
        <Link to="/" className="text-primary underline text-sm">Back to Explore</Link>
      </div>
    );
  }

  const steps = template.defaultPattern || [];

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNav />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden flex justify-between items-center px-5 py-4 border-b border-outline-variant/15">
          <Link to="/" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <span className="font-display text-lg font-bold text-on-surface">Loopsy</span>
          <button className="text-on-surface-variant" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        </header>

        {/* Hero */}
        <div className={`relative h-64 md:h-80 overflow-hidden bg-gradient-to-br ${theme.accent}`}>
          {template.imageUrl ? (
            <>
              <img src={template.imageUrl} alt={template.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            </>
          ) : (
            <>
              <div className={`absolute -top-10 -right-10 h-48 w-48 rounded-full blur-3xl ${theme.orb}`} />
              <div className={`absolute top-8 left-16 h-32 w-32 rounded-full blur-2xl ${theme.orb} opacity-50`} />
            </>
          )}
          <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-on-surface backdrop-blur-sm">
                {template.difficulty}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-on-surface backdrop-blur-sm">
                <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
                {template.category}
              </span>
            </div>
            <h1 className={`font-display text-3xl md:text-4xl font-bold drop-shadow-md ${template.imageUrl ? 'text-white' : 'text-on-surface'}`}>
              {template.name}
            </h1>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-7">
          {/* Description */}
          <p className="text-base text-on-surface-variant leading-relaxed max-w-2xl">{template.description}</p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/create/${template.id}`}
              className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim active:scale-95 transition-all shadow-warm"
            >
              Customize This Pattern
            </Link>
            <Link
              to="/create"
              className="rounded-full border border-outline-variant/30 bg-white px-7 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              AI Remix
            </Link>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Hook Size', value: template.hookSize, icon: 'straighten' },
              { label: 'Yarn Weight', value: template.yarnWeight, icon: 'texture' },
              { label: 'Time Estimate', value: template.timeEstimate, icon: 'schedule' },
              { label: 'Finished Size', value: template.finishedSize, icon: 'crop_free' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white border border-outline-variant/20 shadow-warm p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">{item.icon}</span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{item.label}</p>
                </div>
                <p className="font-semibold text-on-surface text-sm">{item.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Materials & Notes */}
          {((template.materials || []).length > 0 || (template.notes || []).length > 0) && (
            <div className="grid gap-5 md:grid-cols-2">
              {(template.materials || []).length > 0 && (
                <div className="rounded-xl bg-white border border-outline-variant/20 shadow-warm p-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">Materials</h3>
                  <ul className="space-y-2">
                    {template.materials.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px] text-secondary shrink-0 mt-0.5">check_circle</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(template.notes || []).length > 0 && (
                <div className="rounded-xl bg-white border border-outline-variant/20 shadow-warm p-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">Maker Notes</h3>
                  <ul className="space-y-2">
                    {template.notes.map((note, i) => (
                      <li key={i} className="text-sm text-on-surface-variant leading-relaxed">{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {(template.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Pattern steps */}
          {steps.length > 0 && (
            <div className="rounded-xl bg-white border border-outline-variant/20 shadow-warm p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-4">
                Pattern Steps ({steps.length} steps)
              </h3>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-on-surface-variant leading-relaxed">{expandAbbreviations(step)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="py-8 text-center">
            <Link
              to={`/create/${template.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-on-primary hover:bg-primary-dim active:scale-95 transition-all shadow-warm-md"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Start This Pattern
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
