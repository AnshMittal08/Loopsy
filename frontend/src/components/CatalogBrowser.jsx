import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Search, SearchX, SlidersHorizontal, X, Check, ChevronDown, BadgeCheck, Sparkles } from 'lucide-react';
import { SkeletonTemplateCard } from './Skeleton';
import { Reveal, RevealGroup, RevealItem } from './motion/Reveal';
import TiltCard from './motion/TiltCard';
import VerifiedBadge from './VerifiedBadge';
import { getPatternTheme } from '../lib/patternThemes';
import { SPRING } from '../lib/motionTokens';
import { bucketTime, TIME_BUCKETS, timeBucketLabel } from '../lib/timeBucket';

/* ── Card image (moved here from Home — only the catalog uses it) ── */
function TemplateCardImage({ imageUrl, category, title, compact = false }) {
  const theme = getPatternTheme(category);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const Icon = theme.icon;

  if (imageUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden rounded-t-2xl bg-gradient-to-br ${theme.accent} ${compact ? 'h-48' : 'h-full min-h-[320px]'}`}>
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100 group-hover:scale-[1.06]' : 'opacity-0 scale-105'}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-[11px] font-semibold text-on-surface backdrop-blur-sm">
            <Icon size={12} />
            {category}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-t-2xl bg-gradient-to-br ${theme.accent} ${compact ? 'h-48' : 'h-full min-h-[320px]'}`}>
      <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl ${theme.orb}`} />
      <div className="absolute inset-x-6 bottom-6 top-6 rounded-xl border border-white/50 bg-white/30 backdrop-blur-sm" />
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
        <div className="max-w-[70%] rounded-xl bg-surface-container-lowest/85 px-3 py-2.5 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{category || 'Custom'}</p>
          <h3 className="mt-0.5 text-base font-bold text-on-surface leading-snug">{title}</h3>
        </div>
        <div className="rounded-full bg-surface-container-lowest/85 p-2.5 shadow-warm">
          <Icon size={18} className="text-on-surface" />
        </div>
      </div>
    </div>
  );
}

/* ── Facet value pill with a live count ── */
function FacetChip({ active, count, disabled, onClick, children }) {
  return (
    <Motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.93 }}
      animate={{ scale: active ? 1.03 : 1 }}
      transition={SPRING.bouncy}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-primary text-on-primary shadow-warm'
          : disabled
            ? 'cursor-not-allowed bg-surface-container-low/60 text-on-surface-variant/40'
            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
      }`}
    >
      {active && <Check size={13} aria-hidden="true" />}
      {children}
      <span
        className={`text-[11px] font-semibold tabular-nums ${
          active ? 'text-on-primary/85' : 'text-on-surface-variant/80'
        }`}
      >
        {count}
      </span>
    </Motion.button>
  );
}

/* ── A labeled facet group (a row of FacetChips) ── */
function Facet({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/80">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const DIFFICULTY_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2 };

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'az', label: 'A–Z' },
  { id: 'difficulty', label: 'Difficulty (easy→hard)' },
  { id: 'quickest', label: 'Quickest first' },
];

function difficultyRank(d) {
  return DIFFICULTY_ORDER[d] ?? 99;
}

// Match a user's stored skill level ('beginner') to a template difficulty ('Beginner').
function matchesSkill(template, skillLevel) {
  if (!skillLevel) return false;
  return (template.difficulty || '').toLowerCase() === String(skillLevel).toLowerCase();
}

export default function CatalogBrowser({ templates = [], loading = false, user = null }) {
  const skillLevel = user?.skillLevel;

  const [search, setSearch] = useState('');
  // Multi-select facets are Sets of selected values.
  const [difficulties, setDifficulties] = useState(() => new Set());
  const [categories, setCategories] = useState(() => new Set());
  const [yarnWeights, setYarnWeights] = useState(() => new Set());
  const [hookSizes, setHookSizes] = useState(() => new Set());
  const [timeBuckets, setTimeBuckets] = useState(() => new Set());
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [facetsOpen, setFacetsOpen] = useState(false); // mobile disclosure

  // Available facet values, derived from the data (order preserved/sorted sensibly).
  const facetValues = useMemo(() => {
    const diffSet = new Set();
    const catSet = new Set();
    const yarnSet = new Set();
    const hookSet = new Set();
    for (const t of templates) {
      if (t.difficulty) diffSet.add(t.difficulty);
      if (t.category) catSet.add(t.category);
      if (t.yarnWeight) yarnSet.add(t.yarnWeight);
      if (t.hookSize) hookSet.add(t.hookSize);
    }
    const diff = [...diffSet].sort((a, b) => difficultyRank(a) - difficultyRank(b));
    const cat = [...catSet].sort((a, b) => a.localeCompare(b));
    const yarn = [...yarnSet].sort((a, b) => a.localeCompare(b));
    // Hook sizes sort numerically ("3.5 mm" < "5.0 mm").
    const hook = [...hookSet].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
    // Only show time buckets that actually occur.
    const presentBuckets = new Set(templates.map((t) => bucketTime(t.timeEstimate)));
    const time = TIME_BUCKETS.filter((b) => presentBuckets.has(b.id));
    return { diff, cat, yarn, hook, time };
  }, [templates]);

  // Text search is applied first; all facet counts/results respect it.
  const searchMatched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(query))
    );
  }, [templates, search]);

  // Predicate factory: does a template pass every facet EXCEPT the named one?
  // Used both for the final result and for per-facet counts (count = matches
  // given all OTHER active facets).
  const passesExcept = useMemo(() => {
    const test = (t, skip) => {
      if (skip !== 'difficulty' && difficulties.size && !difficulties.has(t.difficulty)) return false;
      if (skip !== 'category' && categories.size && !categories.has(t.category)) return false;
      if (skip !== 'yarn' && yarnWeights.size && !yarnWeights.has(t.yarnWeight)) return false;
      if (skip !== 'hook' && hookSizes.size && !hookSizes.has(t.hookSize)) return false;
      if (skip !== 'time' && timeBuckets.size && !timeBuckets.has(bucketTime(t.timeEstimate))) return false;
      if (skip !== 'verified' && verifiedOnly && !t.verified) return false;
      return true;
    };
    return test;
  }, [difficulties, categories, yarnWeights, hookSizes, timeBuckets, verifiedOnly]);

  const filtered = useMemo(
    () => searchMatched.filter((t) => passesExcept(t, null)),
    [searchMatched, passesExcept]
  );

  // Per-value counts for each facet — computed against the OTHER active facets.
  const counts = useMemo(() => {
    const tally = (skip, keyFn) => {
      const map = new Map();
      for (const t of searchMatched) {
        if (!passesExcept(t, skip)) continue;
        const key = keyFn(t);
        if (key == null) continue;
        map.set(key, (map.get(key) || 0) + 1);
      }
      return map;
    };
    return {
      difficulty: tally('difficulty', (t) => t.difficulty),
      category: tally('category', (t) => t.category),
      yarn: tally('yarn', (t) => t.yarnWeight),
      hook: tally('hook', (t) => t.hookSize),
      time: tally('time', (t) => bucketTime(t.timeEstimate)),
      verified: searchMatched.filter((t) => passesExcept(t, 'verified') && t.verified).length,
    };
  }, [searchMatched, passesExcept]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
    if (sort === 'az') {
      arr.sort(byName);
    } else if (sort === 'difficulty') {
      arr.sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty) || byName(a, b));
    } else if (sort === 'quickest') {
      arr.sort((a, b) => {
        const order = { quick: 0, afternoon: 1, bigger: 2 };
        return order[bucketTime(a.timeEstimate)] - order[bucketTime(b.timeEstimate)] || byName(a, b);
      });
    } else {
      // recommended: skill-matched first (when signed in), else beginner-first, then name.
      arr.sort((a, b) => {
        if (skillLevel) {
          const am = matchesSkill(a, skillLevel) ? 0 : 1;
          const bm = matchesSkill(b, skillLevel) ? 0 : 1;
          if (am !== bm) return am - bm;
        }
        return difficultyRank(a.difficulty) - difficultyRank(b.difficulty) || byName(a, b);
      });
    }
    return arr;
  }, [filtered, sort, skillLevel]);

  // Toggle helper for Set-based facets.
  const toggle = (setter) => (value) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  const toggleDifficulty = toggle(setDifficulties);
  const toggleCategory = toggle(setCategories);
  const toggleYarn = toggle(setYarnWeights);
  const toggleHook = toggle(setHookSizes);
  const toggleTime = toggle(setTimeBuckets);

  // Active filter chips (for the summary row + clear-all).
  const activeChips = [
    ...[...difficulties].map((v) => ({ key: `d:${v}`, label: v, clear: () => toggleDifficulty(v) })),
    ...[...categories].map((v) => ({ key: `c:${v}`, label: v, clear: () => toggleCategory(v) })),
    ...[...yarnWeights].map((v) => ({ key: `y:${v}`, label: v, clear: () => toggleYarn(v) })),
    ...[...hookSizes].map((v) => ({ key: `h:${v}`, label: v, clear: () => toggleHook(v) })),
    ...[...timeBuckets].map((v) => ({ key: `t:${v}`, label: timeBucketLabel(v), clear: () => toggleTime(v) })),
    ...(verifiedOnly ? [{ key: 'verified', label: 'Verified math', clear: () => setVerifiedOnly(false) }] : []),
  ];
  const hasActiveFilters = activeChips.length > 0 || search.trim().length > 0;

  const clearAll = () => {
    setSearch('');
    setDifficulties(new Set());
    setCategories(new Set());
    setYarnWeights(new Set());
    setHookSizes(new Set());
    setTimeBuckets(new Set());
    setVerifiedOnly(false);
  };

  const showSkillLead = Boolean(skillLevel) && sort === 'recommended' && !hasActiveFilters;

  return (
    <section id="discover" className="mt-8">
      <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Discover</p>
          <h2 className="font-display mt-1.5 text-3xl font-bold tracking-tight text-on-surface">Pattern library</h2>
          <p className="mt-2 max-w-xl text-sm text-on-surface-variant leading-relaxed">
            Filter by difficulty, materials, or time, then customize a template or let AI create something new.
          </p>
        </div>
        <div className="w-full max-w-sm focus-within:max-w-md transition-all duration-300">
          <label htmlFor="search" className="sr-only">Search patterns</label>
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              id="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patterns, tags…"
              className="w-full rounded-full bg-surface-container-lowest border border-outline-variant/30 pl-10 pr-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>
      </Reveal>

      {/* ── Filter rail ── */}
      <div className="mt-6 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/60 p-4 sm:p-5 shadow-warm">
        {/* Mobile disclosure toggle */}
        <button
          type="button"
          onClick={() => setFacetsOpen((o) => !o)}
          aria-expanded={facetsOpen}
          className="flex w-full items-center justify-between lg:hidden"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface">
            <SlidersHorizontal size={16} className="text-primary" />
            Filters
            {activeChips.length > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-on-primary">{activeChips.length}</span>
            )}
          </span>
          <ChevronDown size={18} className={`text-on-surface-variant transition-transform ${facetsOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${facetsOpen ? 'mt-4 grid' : 'hidden'} gap-5 lg:mt-0 lg:grid`}>
          <Facet label="Difficulty">
            {facetValues.diff.map((d) => (
              <FacetChip
                key={d}
                active={difficulties.has(d)}
                count={counts.difficulty.get(d) || 0}
                disabled={!difficulties.has(d) && !(counts.difficulty.get(d) > 0)}
                onClick={() => toggleDifficulty(d)}
              >
                {d}
              </FacetChip>
            ))}
          </Facet>

          <Facet label="Category">
            {facetValues.cat.map((c) => (
              <FacetChip
                key={c}
                active={categories.has(c)}
                count={counts.category.get(c) || 0}
                disabled={!categories.has(c) && !(counts.category.get(c) > 0)}
                onClick={() => toggleCategory(c)}
              >
                {c}
              </FacetChip>
            ))}
          </Facet>

          <Facet label="Time">
            {facetValues.time.map((b) => (
              <FacetChip
                key={b.id}
                active={timeBuckets.has(b.id)}
                count={counts.time.get(b.id) || 0}
                disabled={!timeBuckets.has(b.id) && !(counts.time.get(b.id) > 0)}
                onClick={() => toggleTime(b.id)}
              >
                {b.label} <span className="text-[10px] opacity-70">{b.hint}</span>
              </FacetChip>
            ))}
          </Facet>

          <div className="grid gap-5 sm:grid-cols-2">
            <Facet label="Yarn weight">
              {facetValues.yarn.map((y) => (
                <FacetChip
                  key={y}
                  active={yarnWeights.has(y)}
                  count={counts.yarn.get(y) || 0}
                  disabled={!yarnWeights.has(y) && !(counts.yarn.get(y) > 0)}
                  onClick={() => toggleYarn(y)}
                >
                  {y}
                </FacetChip>
              ))}
            </Facet>

            <Facet label="Hook size">
              {facetValues.hook.map((h) => (
                <FacetChip
                  key={h}
                  active={hookSizes.has(h)}
                  count={counts.hook.get(h) || 0}
                  disabled={!hookSizes.has(h) && !(counts.hook.get(h) > 0)}
                  onClick={() => toggleHook(h)}
                >
                  {h}
                </FacetChip>
              ))}
            </Facet>
          </div>

          {/* Verified toggle + sort */}
          <div className="flex flex-col gap-3 border-t border-outline-variant/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Motion.button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              whileTap={{ scale: 0.96 }}
              aria-pressed={verifiedOnly}
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                verifiedOnly
                  ? 'bg-secondary-container text-on-secondary-container shadow-warm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <BadgeCheck size={15} aria-hidden="true" />
              Verified math only
              <span className={`text-[11px] tabular-nums ${verifiedOnly ? 'text-on-secondary-container/85' : 'text-on-surface-variant/80'}`}>
                {counts.verified}
              </span>
            </Motion.button>

            <label className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="font-medium">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5 text-sm font-medium text-on-surface outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* ── Active filters + result count ── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-on-surface">
          {loading ? 'Loading…' : `${sorted.length} ${sorted.length === 1 ? 'pattern' : 'patterns'}`}
        </span>
        {activeChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.clear}
            className="group inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            {chip.label}
            <X size={12} className="opacity-70 group-hover:opacity-100" />
          </button>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-[12px] font-semibold text-on-surface-variant underline-offset-2 hover:text-on-surface hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {showSkillLead && (
        <Reveal className="mt-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary-container/40 px-3.5 py-1.5 text-xs font-semibold text-on-secondary-container">
          <Sparkles size={13} className="text-secondary" />
          Picked for your level — {skillLevel} patterns first
        </Reveal>
      )}

      {loading && (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <SkeletonTemplateCard key={i} />)}
        </div>
      )}

      {!loading && (
        <RevealGroup stagger={0.05} className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((template) => {
            const picked = showSkillLead && matchesSkill(template, skillLevel);
            return (
              <RevealItem key={template.id} className="h-full">
                <TiltCard
                  className={`group h-full overflow-hidden rounded-2xl bg-surface-container-lowest border shadow-warm transition-shadow duration-300 hover:shadow-warm-lg ${
                    picked ? 'border-secondary/40 ring-1 ring-secondary/30' : 'border-outline-variant/20'
                  }`}
                >
                  <TemplateCardImage
                    imageUrl={template.imageUrl}
                    category={template.category}
                    title={template.name}
                    compact
                  />
                  <div className="p-5">
                    {picked && (
                      <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container">
                        <Sparkles size={10} /> For your level
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{template.difficulty}</span>
                      <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-on-secondary-container">{template.category}</span>
                      <VerifiedBadge pattern={template} compact />
                    </div>
                    <h3 className="mt-3 font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">{template.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant line-clamp-2">{template.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                      <div><span className="font-semibold text-on-surface">Hook </span>{template.hookSize}</div>
                      <div><span className="font-semibold text-on-surface">Yarn </span>{template.yarnWeight}</div>
                      <div><span className="font-semibold text-on-surface">Time </span>{template.timeEstimate}</div>
                      <div><span className="font-semibold text-on-surface">Size </span>{template.finishedSize}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(template.tags || []).slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex gap-2.5">
                      <Link to={`/create/${template.id}`} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
                        Customize
                      </Link>
                      <Link to={`/templates/${template.id}`} className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
                        Details
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              </RevealItem>
            );
          })}
        </RevealGroup>
      )}

      {!loading && sorted.length === 0 && (
        <div className="mt-10 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-12 text-center shadow-warm">
          <SearchX size={36} className="text-on-surface-variant mb-3 mx-auto" />
          <p className="font-semibold text-on-surface">No patterns matched.</p>
          <p className="mt-1.5 text-sm text-on-surface-variant">Try clearing a filter or use AI generation for a custom idea.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}
