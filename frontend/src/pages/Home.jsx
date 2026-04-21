import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { getPatternTheme } from '../lib/patternThemes';

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// 3D tilt card — tracks mouse position and applies perspective transform
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale3d(1.02,1.02,1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)';
    }
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ transition: 'transform 0.15s ease-out', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

// Template card image — shows real photo with gradient fallback
function TemplateCardImage({ imageUrl, category, title, compact = false }) {
  const theme = getPatternTheme(category);
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${theme.accent} ${compact ? 'h-48' : 'h-full min-h-[340px]'}`}>
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-on-surface">
            <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
            {category}
          </span>
        </div>
      </div>
    );
  }

  // Gradient fallback
  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${theme.accent} ${compact ? 'h-48' : 'h-full min-h-[340px]'}`}>
      <div className={`absolute -top-8 -right-6 h-28 w-28 rounded-full blur-2xl ${theme.orb}`} />
      <div className="absolute inset-x-8 bottom-8 top-8 rounded-[1.25rem] border border-white/50 bg-white/45 backdrop-blur-sm" />
      <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
        <div className="max-w-[70%] rounded-2xl bg-white/75 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">{category || 'Custom'}</p>
          <h3 className="mt-1 text-lg font-black text-on-surface">{title}</h3>
        </div>
        <div className="rounded-full bg-white/80 p-3 text-on-surface shadow-sm">
          <span className="material-symbols-outlined">{theme.icon}</span>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const [templates, setTemplates] = useState([]);
  const [recentPatterns, setRecentPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      try {
        setLoading(true);
        setError(null);

        const [templateData, patternData] = await Promise.all([
          fetchJson('/api/templates'),
          fetchJson('/api/patterns'),
        ]);

        if (cancelled) return;
        setTemplates(templateData);
        setRecentPatterns(patternData.slice(0, 4));
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHome();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(
    () => ['All', ...new Set(templates.map((t) => t.category).filter(Boolean))],
    [templates]
  );

  const difficulties = useMemo(
    () => ['All', ...new Set(templates.map((t) => t.difficulty).filter(Boolean))],
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(query));
      const matchesDifficulty = difficultyFilter === 'All' || t.difficulty === difficultyFilter;
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      return matchesSearch && matchesDifficulty && matchesCategory;
    });
  }, [templates, search, difficultyFilter, categoryFilter]);

  const featuredTemplate = filteredTemplates[0] || templates[0];

  return (
    <>
      <TopNav />
      <main className="w-full max-w-[1440px] mx-auto px-6 pb-24 pt-28 md:px-12">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(199,183,255,0.9),_transparent_38%),linear-gradient(135deg,_#fffdf7_0%,_#f7f1ec_48%,_#eef7f3_100%)] px-8 py-10 shadow-[0_30px_60px_rgba(52,50,51,0.08)] md:px-12 md:py-14">
          {/* Decorative orbs — CSS only, stay in the background */}
          <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-purple-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-48 w-48 rounded-full bg-amber-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -right-8 top-1/4 h-40 w-40 rounded-full bg-teal-100/50 blur-3xl" />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-sm">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                Crochet discovery studio
              </div>
              <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.04em] text-on-surface md:text-7xl">
                Explore patterns, refine ideas, and turn prompts into crochet projects.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
                Browse guided templates, filter by skill level, and keep your latest AI or template-made designs in one working library.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/create" className="rounded-full bg-on-surface px-7 py-4 text-center text-sm font-bold uppercase tracking-[0.14em] text-white transition-transform hover:scale-[1.01]">
                  Start a custom project
                </Link>
                <a href="#discover" className="rounded-full border border-on-surface/10 bg-white/70 px-7 py-4 text-center text-sm font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-white">
                  Explore pattern library
                </a>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Featured project card with image */}
              <div className="overflow-hidden rounded-[1.75rem] bg-white/80 shadow-sm backdrop-blur-sm md:col-span-2">
                {featuredTemplate?.imageUrl && (
                  <div className="relative h-36 w-full overflow-hidden">
                    <img src={featuredTemplate.imageUrl} alt={featuredTemplate.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
                    <span className="absolute left-4 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-on-surface">
                      {featuredTemplate.difficulty} · {featuredTemplate.category}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Featured project</p>
                    <h2 className="mt-1 text-xl font-black text-on-surface">{featuredTemplate?.name || 'Loading…'}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-on-surface-variant line-clamp-2">
                      {featuredTemplate?.description || 'Pulling together your first curated crochet ideas.'}
                    </p>
                  </div>
                  {featuredTemplate && (
                    <Link to={`/create/${featuredTemplate.id}`} className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary">
                      Customize
                    </Link>
                  )}
                </div>
              </div>
              <div className="rounded-[1.75rem] bg-white/70 p-5 shadow-sm">
                <p className="text-sm font-bold text-on-surface-variant">Templates</p>
                <p className="mt-3 text-4xl font-black text-on-surface">{templates.length}</p>
                <p className="mt-2 text-sm text-on-surface-variant">Starter patterns ready to customize.</p>
              </div>
              <div className="rounded-[1.75rem] bg-white/70 p-5 shadow-sm">
                <p className="text-sm font-bold text-on-surface-variant">Your projects</p>
                <p className="mt-3 text-4xl font-black text-on-surface">{recentPatterns.length}</p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {recentPatterns.length > 0 ? 'Continue where you left off.' : 'Create your first pattern.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Discover */}
        <section id="discover" className="mt-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">Discover</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-on-surface">Pattern library</h2>
              <p className="mt-3 max-w-2xl text-on-surface-variant">
                Filter by project type or difficulty, then jump straight into a template or use the AI generator for something new.
              </p>
            </div>
            <div className="w-full max-w-xl rounded-[1.25rem] bg-surface-container-lowest p-3 shadow-sm">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patterns, tags, or project types"
                className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <FilterChip key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>{cat}</FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {difficulties.map((diff) => (
                <FilterChip key={diff} active={difficultyFilter === diff} onClick={() => setDifficultyFilter(diff)}>{diff}</FilterChip>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl bg-error-container px-5 py-4 text-sm text-on-error-container">{error}</div>
          )}

          {loading && (
            <div className="mt-10 rounded-[1.5rem] bg-surface-container-lowest p-10 text-center text-on-surface-variant">
              Loading pattern library...
            </div>
          )}

          {!loading && (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TiltCard key={template.id} className="overflow-hidden rounded-[1.75rem] bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/10">
                  <TemplateCardImage
                    imageUrl={template.imageUrl}
                    category={template.category}
                    title={template.name}
                    compact
                  />
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{template.difficulty}</span>
                      <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">{template.category}</span>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{template.description}</p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-on-surface-variant">
                      <div><p className="font-bold text-on-surface">Hook</p><p>{template.hookSize}</p></div>
                      <div><p className="font-bold text-on-surface">Yarn</p><p>{template.yarnWeight}</p></div>
                      <div><p className="font-bold text-on-surface">Time</p><p>{template.timeEstimate}</p></div>
                      <div><p className="font-bold text-on-surface">Finish</p><p>{template.finishedSize}</p></div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {(template.tags || []).map((tag) => (
                        <span key={tag} className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Link to={`/create/${template.id}`} className="flex-1 rounded-xl bg-on-surface px-4 py-3 text-center text-sm font-bold text-white">
                        Customize
                      </Link>
                      <Link to="/create" className="rounded-xl bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface">
                        AI remix
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              ))}
            </div>
          )}

          {!loading && filteredTemplates.length === 0 && (
            <div className="mt-10 rounded-[1.5rem] bg-surface-container-lowest p-10 text-center">
              <p className="text-lg font-bold text-on-surface">No patterns matched this filter.</p>
              <p className="mt-2 text-sm text-on-surface-variant">Try a broader search or switch to AI generation for a custom idea.</p>
            </div>
          )}
        </section>

        {/* Bottom sections */}
        <section className="mt-20 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] bg-surface-container-lowest p-6 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">Workflow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface">From inspiration to progress tracking</h2>
            <div className="mt-6 space-y-4">
              {[
                'Browse a template by category, difficulty, and materials.',
                'Customize the pattern or ask AI for a new variation.',
                'Track each row and keep project notes visible while you crochet.',
              ].map((step, i) => (
                <div key={step} className="flex gap-4 rounded-2xl bg-surface-container-low p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-on-primary">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">Recent creations</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface">Continue where you left off</h2>
              </div>
              <Link to="/create" className="hidden rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary md:inline-block">
                New project
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {recentPatterns.length === 0 && (
                <div className="rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
                  Generate a pattern to start building your project library.
                </div>
              )}
              {recentPatterns.map((pattern) => (
                <Link key={pattern.id} to={`/tracker/${pattern.id}`} className="flex flex-col gap-4 rounded-2xl bg-surface-container-low p-5 transition-colors hover:bg-surface-container">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-on-surface">{pattern.title}</h3>
                      <p className="text-sm text-on-surface-variant">{pattern.category || 'Custom'} • {pattern.difficulty}</p>
                    </div>
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold text-on-surface-variant">
                      {pattern.timeEstimate || `${pattern.steps?.length ?? 0} steps`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(pattern.tags || []).slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-on-surface-variant">#{tag}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
