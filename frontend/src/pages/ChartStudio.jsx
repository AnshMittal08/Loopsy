import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { ArrowLeft, Sparkles, Paintbrush, Eraser, PaintBucket, Pipette, FlipHorizontal2, Circle, CircleDot, Star, Trash2, Shapes, Grid3x3, Square, Undo2, Redo2 } from 'lucide-react';
import { ThreadSpinner } from '../components/motion/Thread';
import OnboardingCard from '../components/OnboardingCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { hexOf } from '../lib/yarnColors';
import ColorPicker from '../components/ColorPicker';
import { PRESETS } from '../lib/chartPresets';
import { readGenerationStream } from '../lib/generationStream';
import { fireConfetti } from '../lib/confetti';

const SIZES = [12, 16, 20, 24, 32];
const BG = 'cream';

const makeGrid = (cols, rows, fill = BG) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));

// ── Rasterisers for stamps ──────────────────────────────────────────
function stampCircle(grid, color, ring) {
  const rows = grid.length, cols = grid[0].length;
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const R = Math.min(cx, cy) * 0.92;
  const next = grid.map((r) => [...r]);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.hypot(c - cx, r - cy);
    if (ring ? Math.abs(d - R) <= 0.9 : d <= R) next[r][c] = color;
  }
  return next;
}
function stampStar(grid, color) {
  const rows = grid.length, cols = grid[0].length;
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const R = Math.min(cx, cy) * 0.95, r2 = R * 0.42;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r2;
    pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
  }
  const inside = (x, y) => {
    let win = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) win = !win;
    }
    return win;
  };
  const next = grid.map((r) => [...r]);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (inside(c, r)) next[r][c] = color;
  return next;
}
function floodFill(grid, r, c, color) {
  const rows = grid.length, cols = grid[0].length;
  const target = grid[r][c];
  if (target === color) return grid;
  const next = grid.map((row) => [...row]);
  const stack = [[r, c]];
  while (stack.length) {
    const [y, x] = stack.pop();
    if (y < 0 || x < 0 || y >= rows || x >= cols || next[y][x] !== target) continue;
    next[y][x] = color;
    stack.push([y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]);
  }
  return next;
}

export default function ChartStudio({ onMode }) {
  const navigate = useNavigate();
  const [name, setName] = useState('My Chart');
  const [size, setSize] = useState(16);
  const [grid, setGrid] = useState(() => makeGrid(16, 16));
  const [color, setColor] = useState('coral');
  const [recents, setRecents] = useState([]);
  const addRecent = (hex) => setRecents((r) => [hex, ...r.filter((x) => x !== hex)].slice(0, 8));
  const [tool, setTool] = useState('paint'); // paint | erase | fill | pick
  const [mirror, setMirror] = useState(false);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [construction, setConstruction] = useState('flat'); // 'flat' | 'round'
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const painting = useRef(false);

  // ── Undo / redo ── snapshots of { grid, size }; one step per paint stroke.
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHist = () => { setCanUndo(undoStack.current.length > 0); setCanRedo(redoStack.current.length > 0); };
  const pushHistory = () => {
    undoStack.current.push({ grid: grid.map((r) => [...r]), size });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
    syncHist();
  };
  const undo = () => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    redoStack.current.push({ grid: grid.map((r) => [...r]), size });
    setGrid(snap.grid); setSize(snap.size);
    syncHist();
  };
  const redo = () => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    undoStack.current.push({ grid: grid.map((r) => [...r]), size });
    setGrid(snap.grid); setSize(snap.size);
    syncHist();
  };
  // Keyboard ⌘Z / ⌘⇧Z — the listener reads fresh closures through a ref.
  const histRef = useRef(null);
  useEffect(() => { histRef.current = { undo, redo }; });
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) histRef.current?.redo(); else histRef.current?.undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        histRef.current?.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Destructive actions (clear, resize) confirm when the canvas has content.
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'clear' } | { type: 'resize', n }

  const rows = grid.length, cols = grid[0].length;
  const usedColors = useMemo(() => [...new Set(grid.flat())], [grid]);

  const hasContent = useMemo(() => grid.some((row) => row.some((c) => c !== BG)), [grid]);

  const doResize = (n) => { pushHistory(); setSize(n); setGrid(makeGrid(n, n)); };
  const resize = (n) => { if (hasContent) setConfirmAction({ type: 'resize', n }); else doResize(n); };
  const doClear = () => { pushHistory(); setGrid(makeGrid(cols, rows)); };

  const applyPreset = (p) => {
    pushHistory();
    setGrid(p.build(cols, rows));
    if (p.construction) setConstruction(p.construction);
    setName(p.label === 'Cap shield' ? 'Captain America Shield' : p.label);
  };

  const paintCell = useCallback((r, c) => {
    setGrid((g) => {
      if (tool === 'pick') { setColor(g[r][c]); return g; }
      if (tool === 'fill') return floodFill(g, r, c, tool === 'erase' ? BG : color);
      const val = tool === 'erase' ? BG : color;
      const next = g.map((row) => [...row]);
      next[r][c] = val;
      if (mirror) next[r][cols - 1 - c] = val;
      return next;
    });
  }, [tool, color, mirror, cols]);

  const generate = async () => {
    setBusy(true); setError(null); setStatus('Reading your chart…');
    try {
      const res = await fetch('/api/ai/generate-chart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, yarnWeight: 'Worsted', cols, rows, grid, difficulty, construction, stream: true }),
      });
      const ct = res.headers.get('content-type') || '';
      let pattern;
      if (ct.includes('text/event-stream')) pattern = await readGenerationStream(res, { onStatus: (s) => setStatus(s.message) });
      else { pattern = await res.json(); if (!res.ok) throw new Error(pattern.error || 'Failed to generate the chart'); }
      const pr = await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patternId: pattern.id }) });
      if (!pr.ok) throw new Error('Failed to start tracking');
      fireConfetti({ count: 90 });
      navigate(`/tracker/${pattern.id}`);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const TOOLS = [
    { id: 'paint', label: 'Paint' },
    { id: 'fill', label: 'Fill' },
    { id: 'erase', label: 'Erase' },
    { id: 'pick', label: 'Pick' },
  ];
  const toolIcon = (id) => (id === 'paint' ? <Paintbrush size={14} /> : id === 'fill' ? <PaintBucket size={14} /> : id === 'erase' ? <Eraser size={14} /> : <Pipette size={14} />);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-dim text-on-surface md:h-dvh md:overflow-hidden"
      onPointerUp={() => { painting.current = false; }} onPointerLeave={() => { painting.current = false; }}>
      <OnboardingCard
        storageKey="loopsy_onboard_draw"
        title="Draw a pattern in 3 steps"
        steps={[
          { title: 'Pick a template or paint', body: 'try the Cap shield, or paint any picture on the grid with the colour tools.' },
          { title: 'Flat or Round 3D', body: 'a flat blanket/appliqué, or worked in the round into a real disc like a shield.' },
          { title: 'Generate', body: 'get an exact colourwork pattern — every square is one stitch, counts verified.' },
        ]}
      />
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant/15 bg-surface-container-lowest px-3 md:gap-3 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <Link to="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"><ArrowLeft size={18} /></Link>
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Chart name"
            className="w-full min-w-0 sm:w-52 rounded-md bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:bg-surface-container-low focus:bg-surface-container-low focus:ring-2 focus:ring-primary/30 transition-colors" />
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" aria-label="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors disabled:opacity-35 disabled:hover:bg-transparent"><Undo2 size={15} /></button>
          <button onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" aria-label="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors disabled:opacity-35 disabled:hover:bg-transparent"><Redo2 size={15} /></button>
          {confirmAction && (
            <ConfirmDialog
              title={confirmAction.type === 'clear' ? 'Clear the whole chart?' : `Resize to ${confirmAction.n}×${confirmAction.n}?`}
              body={confirmAction.type === 'clear'
                ? 'Every painted cell is wiped. You can undo this.'
                : 'Resizing starts a fresh grid — your current drawing is wiped. You can undo this.'}
              confirmLabel={confirmAction.type === 'clear' ? 'Clear' : 'Resize'}
              onConfirm={() => { const a = confirmAction; setConfirmAction(null); if (a.type === 'clear') doClear(); else doResize(a.n); }}
              onCancel={() => setConfirmAction(null)}
            />
          )}
          {/* Build / Draw mode toggle */}
          <div className="flex rounded-full bg-surface-container-low p-0.5">
            <button onClick={() => onMode('build')} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors sm:px-3" aria-label="Build 3D mode"><Shapes size={13} /><span className="hidden sm:inline">Build 3D</span></button>
            <button className="flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1.5 text-xs font-semibold text-on-primary sm:px-3" aria-label="Draw mode"><Grid3x3 size={13} /><span className="hidden sm:inline">Draw</span></button>
          </div>
          <button onClick={generate} disabled={busy}
            className="shine-sweep inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-50">
            {busy ? <ThreadSpinner size={15} className="text-on-primary" /> : <Sparkles size={15} />}
            <span className="hidden sm:inline">{busy ? (status || 'Charting…') : 'Generate pattern'}</span>
            <span className="sm:hidden">Make</span>
          </button>
        </div>
      </header>

      {error && <div className="shrink-0 bg-error-container px-4 py-2 text-center text-sm text-on-error-container">{error}</div>}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left: colors + tools */}
        <aside className="shrink-0 border-b md:border-b-0 md:border-r border-outline-variant/15 bg-surface-container-lowest p-3 md:w-56 md:overflow-y-auto">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Start from a template</p>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="rounded-lg border border-outline-variant/20 px-2 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-low hover:text-on-surface transition-colors">
                {p.label}
              </button>
            ))}
          </div>

          <div className="my-3 border-t border-outline-variant/15" />
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Yarn colors</p>
            <span className="h-4 w-4 rounded-full border border-outline-variant/40" style={{ backgroundColor: hexOf(color) }} title="Current colour" />
          </div>
          <ColorPicker value={color} onChange={(c) => { setColor(c); setTool('paint'); }} recents={recents} onAddRecent={addRecent} size={30} columns={5} />

          <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Tools</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TOOLS.map(({ id, label }) => (
              <button key={id} onClick={() => setTool(id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${tool === id ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>
                {toolIcon(id)}{label}
              </button>
            ))}
            <button onClick={() => setMirror((m) => !m)}
              className={`col-span-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${mirror ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>
              <FlipHorizontal2 size={14} />Mirror {mirror ? 'on' : 'off'}
            </button>
          </div>

          <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Stamps</p>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => { pushHistory(); setGrid((g) => stampCircle(g, color, false)); }} className="flex flex-col items-center gap-0.5 rounded-lg border border-outline-variant/20 py-2 text-[10px] font-semibold hover:bg-surface-container-low transition-colors"><Circle size={16} />Disc</button>
            <button onClick={() => { pushHistory(); setGrid((g) => stampCircle(g, color, true)); }} className="flex flex-col items-center gap-0.5 rounded-lg border border-outline-variant/20 py-2 text-[10px] font-semibold hover:bg-surface-container-low transition-colors"><CircleDot size={16} />Ring</button>
            <button onClick={() => setGrid((g) => stampStar(g, color))} className="flex flex-col items-center gap-0.5 rounded-lg border border-outline-variant/20 py-2 text-[10px] font-semibold hover:bg-surface-container-low transition-colors"><Star size={16} />Star</button>
          </div>
          <button onClick={() => (hasContent ? setConfirmAction({ type: 'clear' }) : doClear())} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-error/30 px-2.5 py-2 text-xs font-semibold text-error hover:bg-error-container/40 transition-colors"><Trash2 size={13} />Clear all</button>
        </aside>

        {/* Center: the pixel grid */}
        <div className="relative flex min-h-[60vh] flex-1 items-center justify-center overflow-auto p-4 md:min-h-0 md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,_color-mix(in_srgb,var(--on-surface)_8%,transparent)_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Flat / Round construction toggle — floating */}
          <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-surface-container-lowest/90 p-0.5 shadow-warm backdrop-blur">
            <button onClick={() => setConstruction('flat')} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${construction === 'flat' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><Square size={13} />Flat panel</button>
            <button onClick={() => setConstruction('round')} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${construction === 'round' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><Circle size={13} />Round 3D</button>
          </div>

          <div className="relative rounded-2xl bg-surface-container-lowest p-3 shadow-warm-xl ring-1 ring-outline-variant/10">
            <div className="relative" style={{ width: 'min(70vh, 86vw, 520px)', height: 'min(70vh, 86vw, 520px)' }}>
              <div className="grid h-full w-full touch-none select-none gap-px overflow-hidden rounded-lg bg-outline-variant/20"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {grid.map((row, r) => row.map((cell, c) => (
                  <button key={`${r}-${c}`} aria-label={`cell ${r},${c}`}
                    onPointerDown={() => { if (!painting.current && tool !== 'pick') pushHistory(); painting.current = true; paintCell(r, c); }}
                    onPointerEnter={() => { if (painting.current) paintCell(r, c); }}
                    style={{ backgroundColor: hexOf(cell) }} />
                )))}
              </div>
              {construction === 'round' && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <circle cx="50" cy="50" r="49" fill="none" stroke="var(--primary)" strokeWidth="0.6" strokeDasharray="2 1.5" opacity="0.8" />
                </svg>
              )}
            </div>
          </div>

          {/* live info badge */}
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-surface-container-lowest/90 px-4 py-1.5 text-xs font-medium text-on-surface-variant shadow-warm backdrop-blur">
            {cols}×{rows} · {cols * rows} stitches · {usedColors.length} colour{usedColors.length === 1 ? '' : 's'}
            {construction === 'round' && ' · worked in the round'}
          </div>
        </div>

        {/* Right: chart settings */}
        <aside className="shrink-0 border-t md:border-t-0 md:border-l border-outline-variant/15 bg-surface-container-lowest p-4 md:w-64 md:overflow-y-auto">
          <div className="mb-4 rounded-xl bg-tertiary-container/40 border border-tertiary/20 p-3 text-xs leading-relaxed text-on-surface-variant">
            {construction === 'round'
              ? 'Round 3D: your drawing is sampled ring by ring and worked in the round into a disc or dome — like a real shield. Keep the design inside the circle.'
              : 'Flat panel: worked in rows, one stitch per square — for blankets, appliqués, and wall art.'}
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Grid size</p>
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map((n) => (
              <button key={n} onClick={() => resize(n)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${size === n ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>{n}×{n}</button>
            ))}
          </div>

          <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Difficulty</p>
          <div className="flex flex-col gap-1.5">
            {['beginner', 'intermediate', 'advanced'].map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`rounded-lg px-3 py-2 border text-sm font-medium capitalize text-left transition-all ${difficulty === d ? 'bg-primary/8 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>{d}</button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
