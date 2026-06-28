import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, Sparkles, Shapes, BookOpen, User, CornerDownLeft, GraduationCap } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { OPEN_EVENT } from '../lib/commandPalette';
import { searchGuides } from '../lib/learnContent';

// Static quick-nav actions, always available.
const ACTIONS = [
  { id: 'a-explore', label: 'Explore templates', to: '/', icon: Compass },
  { id: 'a-create', label: 'Create a pattern', to: '/create', icon: Sparkles },
  { id: 'a-design', label: 'Open the Design Canvas', to: '/design', icon: Shapes },
  { id: 'a-tracker', label: 'My projects', to: '/tracker', icon: BookOpen },
  { id: 'a-learn', label: 'Learn to crochet', to: '/learn', icon: GraduationCap },
  { id: 'a-account', label: 'Account', to: '/account', icon: User },
];

const EMPTY = { templates: [], patterns: [], designs: [] };

// Global ⌘K / Ctrl-K palette: quick navigation + live search across templates,
// the caller's patterns and designs (via /api/search).
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(EMPTY);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const trapRef = useFocusTrap(open);
  const reqId = useRef(0);

  const close = () => { setOpen(false); setQuery(''); setResults(EMPTY); setActive(0); };

  // Toggle on ⌘K / Ctrl-K; close on Escape. (setState lives in the handler,
  // not the effect body — lint-safe.)
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        close();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Allow opening from a nav button (custom event).
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Focus the input when opening (DOM call, not setState).
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // Debounced search; results are set only inside the async callback.
  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (q.length < 2) return undefined; // rendering derives empty results for short queries
    const my = ++reqId.current;
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => { if (!cancelled && my === reqId.current) { setResults(data); setActive(0); } })
        .catch(() => {});
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open]);

  if (!open) return null;

  const ql = query.trim().toLowerCase();
  const shown = ql.length >= 2 ? results : EMPTY;
  const actions = ql ? ACTIONS.filter((a) => a.label.toLowerCase().includes(ql)) : ACTIONS;
  // Guides are bundled client-side; search + cap them so the list stays tidy.
  const guideHits = ql.length >= 2 ? searchGuides(ql).slice(0, 4) : [];
  const items = [
    ...actions.map((a) => ({ key: a.id, label: a.label, to: a.to, icon: a.icon })),
    ...shown.templates.map((t) => ({ key: `t-${t.id}`, label: t.name, sub: `${t.difficulty} · ${t.category}`, to: `/templates/${t.id}`, kind: 'Template' })),
    ...shown.patterns.map((p) => ({ key: `p-${p.id}`, label: p.title, to: `/tracker/${p.id}`, kind: 'Pattern' })),
    ...shown.designs.map((d) => ({ key: `d-${d.id}`, label: d.name, to: `/d/${d.id}`, kind: 'Design' })),
    ...guideHits.map((g) => ({ key: `g-${g.slug}`, label: g.title, sub: `${g.minutes} min read`, to: `/learn/${g.slug}`, kind: 'Learn' })),
  ];
  const go = (item) => { if (item) { close(); navigate(item.to); } };

  function onListKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" onClick={close}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onListKey}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface-container-lowest shadow-warm-xl ring-1 ring-outline-variant/20 outline-none"
      >
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 px-4">
          <Search size={18} className="shrink-0 text-on-surface-variant" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            aria-label="Command palette search"
            className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-on-surface-variant"
          />
          <kbd className="hidden rounded border border-outline-variant/30 px-1.5 py-0.5 text-[10px] text-on-surface-variant sm:block">ESC</kbd>
        </div>

        <ul className="max-h-[55vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-on-surface-variant">No matches{query ? ` for “${query}”` : ''}.</li>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${i === active ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container-low'}`}
                >
                  {Icon ? <Icon size={15} className="shrink-0" /> : <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">{item.kind}</span>}
                  <span className="min-w-0 flex-1 truncate">{item.label}{item.sub && <span className="ml-2 text-xs text-on-surface-variant">{item.sub}</span>}</span>
                  {i === active && <CornerDownLeft size={13} className="shrink-0 text-on-surface-variant" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}
