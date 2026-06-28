import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Search, ArrowRight, Clock, PlayCircle, BookOpen, Sparkles } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import {
  GUIDES,
  LEARN_PATH,
  getGuide,
  searchGuides,
  GUIDE_CATEGORIES,
} from '../lib/learnContent';
import { ABBREVIATIONS } from '../lib/crochetAbbreviations';

function matchesGlossary(entry, q) {
  return [entry.abbr, entry.full, entry.explanation].join(' ').toLowerCase().includes(q);
}

export default function LearningCentre() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const q = query.trim().toLowerCase();
  const searching = q.length >= 2;

  // Guides: filter by search first, then by the (search-cleared) category row.
  const guideHits = useMemo(() => (searching ? searchGuides(q) : GUIDES), [searching, q]);
  const guides = useMemo(
    () => (category === 'All' ? guideHits : guideHits.filter((g) => g.category === category)),
    [guideHits, category],
  );

  // Glossary: local filter over the shared abbreviations source.
  const glossary = useMemo(
    () => (searching ? ABBREVIATIONS.filter((e) => matchesGlossary(e, q)) : ABBREVIATIONS),
    [searching, q],
  );

  const categories = ['All', ...GUIDE_CATEGORIES];

  return (
    <div className="min-h-dvh bg-surface">
      <TopNav />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 pb-20 md:px-10 outline-none">
        <Reveal>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap size={18} className="text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Learning Centre</p>
          </div>
          <h1 className="font-display display-wonk text-[1.9rem] sm:text-[2.4rem] font-bold text-on-surface leading-tight mb-2">
            Learn to crochet.
          </h1>
          <p className="text-on-surface-variant max-w-xl mb-6">
            A guided path from your first chain, technique guides for every step, and a glossary that
            decodes every abbreviation in a Loopsy pattern.
          </p>

          <div className="relative max-w-xl mb-2">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides and stitches…"
              aria-label="Search guides and stitches"
              className="w-full rounded-full border border-outline-variant/30 bg-surface-container-lowest py-3.5 pl-11 pr-4 text-sm shadow-warm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {searching && (
            <p className="text-xs text-on-surface-variant mb-2">
              {guides.length} guide{guides.length === 1 ? '' : 's'} · {glossary.length} stitch
              {glossary.length === 1 ? '' : 'es'} for “{query.trim()}”
            </p>
          )}
        </Reveal>

        {/* Guided path — hidden while searching to keep results focused */}
        {!searching && (
          <Reveal delay={0.05} className="mt-10">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Guided path</h2>
            </div>
            <p className="text-on-surface-variant text-sm mb-5 max-w-xl">
              Six beginner projects in order — each one teaches a new skill.
            </p>
            <RevealGroup className="grid gap-3 sm:grid-cols-2">
              {LEARN_PATH.map((lesson) => {
                const guide = getGuide(lesson.guide);
                return (
                  <RevealItem key={lesson.step}>
                    <div className="card-lift flex h-full flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-warm">
                      <Link to={`/templates/${lesson.templateId}`} className="group flex items-start gap-4">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {lesson.step}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-on-surface leading-snug group-hover:text-primary transition-colors">
                            {lesson.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-on-surface-variant">{lesson.skill}</p>
                        </div>
                        <ArrowRight size={15} className="mt-1 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      {guide && (
                        <Link
                          to={`/learn/${guide.slug}`}
                          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          <GraduationCap size={13} />
                          Learn: {guide.title}
                        </Link>
                      )}
                    </div>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </Reveal>
        )}

        {/* Technique guides */}
        <Reveal delay={0.05} className="mt-12">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Technique guides</h2>
          </div>
          <p className="text-on-surface-variant text-sm mb-5 max-w-xl">
            Short reads on the core skills behind every pattern.
          </p>

          {!searching && (
            <div className="mb-5 flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={active}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-primary text-on-primary shadow-warm'
                        : 'border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          {guides.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No guides match “{query.trim()}”.</p>
          ) : (
            <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <RevealItem key={g.slug}>
                  <Link
                    to={`/learn/${g.slug}`}
                    className="card-lift flex h-full flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-warm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        {g.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                        <Clock size={11} />
                        {g.minutes} min read
                      </span>
                    </div>
                    <h3 className="font-semibold text-on-surface leading-snug mb-1">{g.title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{g.summary}</p>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </Reveal>

        {/* Stitch glossary */}
        <Reveal delay={0.05} className="mt-12">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Stitch glossary</h2>
          </div>
          <p className="text-on-surface-variant text-sm mb-5 max-w-xl">
            Every abbreviation you'll meet in a pattern, in plain language.
          </p>

          {glossary.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No stitches match “{query.trim()}”.</p>
          ) : (
            <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {glossary.map((entry) => (
                <RevealItem key={entry.abbr}>
                  <div className="flex h-full flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-warm">
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-bold text-primary">
                        {entry.abbr}
                      </span>
                      <span className="text-sm font-semibold text-on-surface capitalize">{entry.full}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{entry.explanation}</p>
                    {entry.videoUrl && (
                      <a
                        href={entry.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2.5 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <PlayCircle size={13} />
                        {entry.videoLabel || 'Watch tutorial'}
                      </a>
                    )}
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </Reveal>
      </main>
    </div>
  );
}
