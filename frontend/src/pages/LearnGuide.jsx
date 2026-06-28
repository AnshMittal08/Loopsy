import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, GraduationCap } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Reveal } from '../components/motion/Reveal';
import { getGuide } from '../lib/learnContent';
import { getAbbreviationData } from '../lib/crochetAbbreviations';

export default function LearnGuide() {
  const { slug } = useParams();
  const guide = getGuide(slug);

  if (!guide) {
    return (
      <div className="min-h-dvh bg-surface">
        <TopNav />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-20 text-center md:px-10 outline-none">
          <p className="text-on-surface-variant mb-4">We couldn't find that guide.</p>
          <Link to="/learn" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
            Back to the Learning Centre
          </Link>
        </main>
      </div>
    );
  }

  // Match each used stitch against the glossary; skip any the glossary doesn't know.
  const stitches = (guide.stitches || [])
    .map((abbr) => ({ abbr, data: getAbbreviationData(abbr) }))
    .filter((s) => s.data);

  const related = (guide.related || [])
    .map((relSlug) => getGuide(relSlug))
    .filter(Boolean);

  return (
    <div className="min-h-dvh bg-surface">
      <TopNav />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-10 pb-20 md:px-10 outline-none">
        <Reveal>
          <Link to="/learn" className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface mb-6 transition-colors">
            <ArrowLeft size={13} />
            Learning Centre
          </Link>

          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {guide.category}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
              <Clock size={11} />
              {guide.minutes} min read
            </span>
          </div>

          <h1 className="font-display display-wonk text-[1.7rem] sm:text-[2.1rem] font-bold text-on-surface leading-tight mb-3">
            {guide.title}
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed mb-8">{guide.summary}</p>

          <article className="space-y-7">
            {guide.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-base font-bold text-on-surface mb-2">{section.heading}</h2>
                {section.body.split('\n').filter(Boolean).map((para, j) => (
                  <p key={j} className="text-on-surface-variant leading-relaxed">
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </article>

          {stitches.length > 0 && (
            <div className="mt-10 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-warm">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">Stitches used</h2>
              <ul className="flex flex-wrap gap-2">
                {stitches.map(({ abbr, data }) => (
                  <li
                    key={abbr}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono font-bold text-primary">{abbr}</span>
                    <span className="text-on-surface-variant capitalize">{data.full}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {related.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">Related guides</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {related.map((rel) => (
                  <Link
                    key={rel.slug}
                    to={`/learn/${rel.slug}`}
                    className="card-lift group flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-warm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <GraduationCap size={16} className="text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-on-surface leading-snug group-hover:text-primary transition-colors">
                        {rel.title}
                      </span>
                      <span className="block text-xs text-on-surface-variant">{rel.category} · {rel.minutes} min</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Reveal>
      </main>
    </div>
  );
}
