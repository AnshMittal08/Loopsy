import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { ArrowLeft, Menu, Ruler, Layers, Clock, Scan, CheckCircle2 } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { SkeletonTemplatePreview } from '../components/Skeleton';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { getPatternTheme } from '../lib/patternThemes';
import { expandAbbreviations } from '../lib/crochetAbbreviations';
import { SPRING } from '../lib/motionTokens';

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
  const ThemeIcon = theme.icon;

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
          <Link to="/" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors" aria-label="Back to explore">
            <ArrowLeft size={19} />
          </Link>
          <span className="font-display text-lg font-bold text-on-surface">Loopsy</span>
          <button className="text-on-surface-variant" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        </header>

        {/* Hero */}
        <div className={`relative h-64 md:h-80 overflow-hidden bg-gradient-to-br ${theme.accent}`}>
          {template.imageUrl ? (
            <>
              <Motion.img
                src={template.imageUrl}
                alt={template.name}
                className="h-full w-full object-cover"
                initial={{ scale: 1.08, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            </>
          ) : (
            <>
              <div className={`absolute -top-10 -right-10 h-48 w-48 rounded-full blur-3xl ${theme.orb}`} />
              <div className={`absolute top-8 left-16 h-32 w-32 rounded-full blur-2xl ${theme.orb} opacity-50`} />
            </>
          )}
          <Motion.div
            className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="rounded-full bg-surface-container-lowest/90 px-3 py-1 text-xs font-semibold text-on-surface backdrop-blur-sm">
                {template.difficulty}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/90 px-3 py-1 text-xs font-semibold text-on-surface backdrop-blur-sm">
                <ThemeIcon size={13} />
                {template.category}
              </span>
            </div>
            <h1 className={`font-display display-wonk text-3xl md:text-4xl font-bold drop-shadow-md ${template.imageUrl ? 'text-white' : 'text-on-surface'}`}>
              {template.name}
            </h1>
          </Motion.div>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-7">
          {/* Description */}
          <Reveal>
            <p className="text-base text-on-surface-variant leading-relaxed max-w-2xl">{template.description}</p>
          </Reveal>

          {/* CTAs */}
          <Reveal className="flex flex-wrap gap-3">
            <Motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={SPRING.snappy} className="inline-flex">
              <Link
                to={`/create/${template.id}`}
                className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm"
              >
                Customize This Pattern
              </Link>
            </Motion.span>
            <Link
              to="/create"
              className="rounded-full border border-outline-variant/30 bg-surface-container-lowest px-7 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              AI Remix
            </Link>
          </Reveal>

          {/* Metadata grid */}
          <RevealGroup stagger={0.07} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Hook Size', value: template.hookSize, Icon: Ruler },
              { label: 'Yarn Weight', value: template.yarnWeight, Icon: Layers },
              { label: 'Time Estimate', value: template.timeEstimate, Icon: Clock },
              { label: 'Finished Size', value: template.finishedSize, Icon: Scan },
            ].map((m) => (
              <RevealItem key={m.label}>
                <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-4 h-full">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <m.Icon size={14} className="text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{m.label}</p>
                  </div>
                  <p className="font-semibold text-on-surface text-sm">{m.value || '—'}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          {/* Materials & Notes */}
          {((template.materials || []).length > 0 || (template.notes || []).length > 0) && (
            <div className="grid gap-5 md:grid-cols-2">
              {(template.materials || []).length > 0 && (
                <Reveal className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">Materials</h3>
                  <ul className="space-y-2">
                    {template.materials.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <CheckCircle2 size={14} className="text-secondary shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
              {(template.notes || []).length > 0 && (
                <Reveal delay={0.08} className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">Maker Notes</h3>
                  <ul className="space-y-2">
                    {template.notes.map((note, i) => (
                      <li key={i} className="text-sm text-on-surface-variant leading-relaxed">{note}</li>
                    ))}
                  </ul>
                </Reveal>
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
            <Reveal className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6">
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
            </Reveal>
          )}

          {/* Bottom CTA */}
          <div className="py-8 text-center">
            <Motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={SPRING.snappy} className="inline-flex">
              <Link
                to={`/create/${template.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md"
              >
                <CheckCircle2 size={17} />
                Start This Pattern
              </Link>
            </Motion.span>
          </div>
        </div>
      </main>
    </div>
  );
}
