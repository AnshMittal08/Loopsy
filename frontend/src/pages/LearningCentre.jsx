import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  ArrowRight,
  Clock,
  PlayCircle,
  BookOpen,
  Sparkles,
  Check,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import {
  GUIDES,
  LEARN_PATH,
  getGuide,
  searchGuides,
  GUIDE_CATEGORIES,
} from '../lib/learnContent';
import { ABBREVIATIONS } from '../lib/crochetAbbreviations';
import { useAuth } from '../components/AuthProvider';
import { useLearningProgress } from '../lib/useLearningProgress';

function matchesGlossary(entry, q) {
  return [entry.abbr, entry.full, entry.explanation].join(' ').toLowerCase().includes(q);
}

// A technique-guide card with an optional "Read ✓" badge and bookmark toggle.
// The bookmark button sits on top of the card link (which fills the card) so a
// tap on the toggle doesn't navigate.
function GuideCard({ guide, isRead, isBookmarked, showBookmark, onToggleBookmark }) {
  return (
    <div className="card-lift relative h-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-warm">
      <Link to={`/learn/${guide.slug}`} className="flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            {guide.category}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
            <Clock size={11} />
            {guide.minutes} min read
          </span>
          {isRead && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-semibold text-on-secondary-container">
              <Check size={11} />
              Read
            </span>
          )}
        </div>
        <h3 className="font-semibold text-on-surface leading-snug mb-1 pr-8">{guide.title}</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">{guide.summary}</p>
      </Link>
      {showBookmark && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleBookmark(guide.slug);
          }}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this guide'}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isBookmarked
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      )}
    </div>
  );
}

export default function LearningCentre() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const { user } = useAuth();
  const { readSlugs, bookmarkedSlugs, toggleBookmark } = useLearningProgress();

  const readCount = useMemo(
    () => GUIDES.filter((g) => readSlugs.has(g.slug)).length,
    [readSlugs],
  );
  const readPct = GUIDES.length ? Math.round((readCount / GUIDES.length) * 100) : 0;

  // Next sensible unread: first unread in the guided path, then first unread in
  // GUIDES order as a fallback.
  const nextUnread = useMemo(() => {
    for (const lesson of LEARN_PATH) {
      if (lesson.guide && !readSlugs.has(lesson.guide)) {
        const g = getGuide(lesson.guide);
        if (g) return g;
      }
    }
    return GUIDES.find((g) => !readSlugs.has(g.slug)) || null;
  }, [readSlugs]);

  const lessonsDone = useMemo(
    () => LEARN_PATH.filter((l) => readSlugs.has(l.guide)).length,
    [readSlugs],
  );

  const savedGuides = useMemo(
    () =>
      GUIDES.filter((g) => bookmarkedSlugs.has(g.slug)),
    [bookmarkedSlugs],
  );

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

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 pt-24 pb-20 md:px-10 outline-none">
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

        {/* Your progress — personal, only meaningful signed in. Hidden while searching. */}
        {!searching && (
          user ? (
            <Reveal delay={0.05} className="mt-8">
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-warm sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary mb-2">
                    Your progress
                  </p>
                  <p className="font-display text-2xl font-bold text-on-surface leading-none">
                    {readCount}
                    <span className="text-on-surface-variant text-base font-semibold">
                      {' '}of {GUIDES.length}
                    </span>
                  </p>
                  <p className="text-sm text-on-surface-variant mb-3">guides read</p>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
                    role="progressbar"
                    aria-valuenow={readCount}
                    aria-valuemin={0}
                    aria-valuemax={GUIDES.length}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${readPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    {lessonsDone} of {LEARN_PATH.length} lessons in the guided path
                  </p>
                </div>

                {nextUnread ? (
                  <Link
                    to={`/learn/${nextUnread.slug}`}
                    className="card-lift group flex flex-col justify-between rounded-2xl border border-outline-variant/20 bg-primary/[0.06] p-5 shadow-warm sm:col-span-3"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
                        {readCount === 0 ? 'Start learning' : 'Pick up where you left off'}
                      </p>
                      <h3 className="font-semibold text-on-surface leading-snug group-hover:text-primary transition-colors">
                        {nextUnread.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-on-surface-variant">{nextUnread.summary}</p>
                    </div>
                    <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-warm transition-transform group-hover:translate-x-0.5">
                      Continue
                      <ArrowRight size={15} />
                    </span>
                  </Link>
                ) : (
                  <div className="flex flex-col justify-center rounded-2xl border border-outline-variant/20 bg-secondary-container/40 p-5 shadow-warm sm:col-span-3">
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                      <Check size={18} />
                    </span>
                    <h3 className="font-semibold text-on-surface leading-snug">All guides read 🎉</h3>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      You've worked through every technique guide. Revisit any of them anytime.
                    </p>
                  </div>
                )}
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.05} className="mt-8">
              <Link
                to="/account"
                className="card-lift group flex items-center gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-warm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <GraduationCap size={18} className="text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-on-surface leading-snug group-hover:text-primary transition-colors">
                    Sign in to track your progress
                  </span>
                  <span className="block text-sm text-on-surface-variant">
                    Mark guides as read, bookmark favourites, and pick up where you left off.
                  </span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          )
        )}

        {/* Saved guides — only when signed in and any bookmarks exist. */}
        {!searching && user && savedGuides.length > 0 && (
          <Reveal delay={0.05} className="mt-12">
            <div className="flex items-center gap-2 mb-1">
              <BookmarkCheck size={16} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Saved guides</h2>
            </div>
            <p className="text-on-surface-variant text-sm mb-5 max-w-xl">
              The guides you've bookmarked to come back to.
            </p>
            <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedGuides.map((g) => (
                <RevealItem key={g.slug}>
                  <GuideCard
                    guide={g}
                    isRead={readSlugs.has(g.slug)}
                    isBookmarked
                    showBookmark={Boolean(user)}
                    onToggleBookmark={toggleBookmark}
                  />
                </RevealItem>
              ))}
            </RevealGroup>
          </Reveal>
        )}

        {/* Guided path — hidden while searching to keep results focused */}
        {!searching && (
          <Reveal delay={0.05} className="mt-12">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Guided path</h2>
            </div>
            <p className="text-on-surface-variant text-sm mb-1 max-w-xl">
              Six beginner projects in order — each one teaches a new skill.
            </p>
            {user && (
              <p className="text-xs font-semibold text-primary mb-5">
                {lessonsDone} of {LEARN_PATH.length} lessons complete
              </p>
            )}
            <RevealGroup className="grid gap-3 sm:grid-cols-2">
              {LEARN_PATH.map((lesson) => {
                const guide = getGuide(lesson.guide);
                const lessonDone = user && readSlugs.has(lesson.guide);
                return (
                  <RevealItem key={lesson.step}>
                    <div className="card-lift flex h-full flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-warm">
                      <Link to={`/templates/${lesson.templateId}`} className="group flex items-start gap-4">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            lessonDone
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {lessonDone ? <Check size={16} /> : lesson.step}
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
                  <GuideCard
                    guide={g}
                    isRead={readSlugs.has(g.slug)}
                    isBookmarked={bookmarkedSlugs.has(g.slug)}
                    showBookmark={Boolean(user)}
                    onToggleBookmark={toggleBookmark}
                  />
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
      <Footer />
    </div>
  );
}
