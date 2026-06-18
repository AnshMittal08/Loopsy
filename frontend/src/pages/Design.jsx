import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lock, Sparkles, Check, Share2, Plus, Trash2, Copy, ChevronUp, ChevronDown, Shapes, SlidersHorizontal, Minus, Smile } from 'lucide-react';
import { ThreadSpinner } from '../components/motion/Thread';
import CanvasStage from '../components/CanvasStage';
import { PALETTE } from '../lib/yarnColors';
import { SHAPE_KIT, DIM_LABEL, shapeDef } from '../lib/shapeKit';
import { CANVAS, deriveAssembly } from '../lib/assembly';
import { SPRING } from '../lib/motionTokens';
import { readGenerationStream } from '../lib/generationStream';
import { fireConfetti } from '../lib/confetti';
import { useAuth } from '../components/AuthProvider';

let uid = 0;
const nextId = () => `p${Date.now()}_${uid++}`;
const round1 = (n) => Math.round(n * 10) / 10;

// A friendly starter so the canvas isn't empty: a simple two-ball creature.
function starterParts() {
  return [
    { id: nextId(), name: 'Body', shape: 'ellipsoid', dims: { diameterCm: 7, heightCm: 9 }, color: 'violet', quantity: 1, x: CANVAS.w / 2, y: 280 },
    { id: nextId(), name: 'Head', shape: 'sphere', dims: { diameterCm: 6.5 }, color: 'violet', quantity: 1, x: CANVAS.w / 2, y: 150, face: true },
  ];
}

export default function Design() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('My Design');
  const [parts, setParts] = useState(starterParts);
  const [selectedId, setSelectedId] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');
  const [tab, setTab] = useState('elements'); // 'elements' | 'setup'
  const [zoom, setZoom] = useState(1);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState(null);

  const selected = parts.find((p) => p.id === selectedId) || null;

  const updatePart = (id, patch) => setParts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const updateDim = (id, key, value) =>
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, dims: { ...p.dims, [key]: value } } : p)));
  const movePart = useCallback((id, x, y) => setParts((ps) => ps.map((p) => (p.id === id ? { ...p, x, y } : p))), []);

  const addShape = (def) => {
    // Deterministic stagger so new shapes don't stack exactly on top.
    const n = parts.length;
    const p = {
      id: nextId(), name: def.label, shape: def.shape, dims: JSON.parse(JSON.stringify(def.dims)), color: 'coral', quantity: 1,
      x: CANVAS.w / 2 + ((n % 5) - 2) * 18, y: def.shape === 'revolve' ? CANVAS.h / 2 : 90 + (n % 4) * 22,
    };
    setParts((ps) => [...ps, p]);
    setSelectedId(p.id);
  };

  // Reshape a sculpt part's silhouette point (drag handle on the canvas).
  const updateSculpt = useCallback((id, index, patch) => setParts((ps) => ps.map((p) => {
    if (p.id !== id) return p;
    const profile = [...(p.dims.profile || [])].sort((a, b) => a.t - b.t).map((pt, i) => (i === index ? { ...pt, ...patch } : pt));
    return { ...p, dims: { ...p.dims, profile } };
  })), []);
  const duplicatePart = (id) => {
    const src = parts.find((p) => p.id === id);
    if (!src) return;
    const p = { ...src, id: nextId(), x: Math.min(CANVAS.w - 12, src.x + 30), y: Math.min(CANVAS.h - 12, src.y + 24) };
    setParts((ps) => [...ps, p]);
    setSelectedId(p.id);
  };
  const deletePart = (id) => {
    setParts((ps) => ps.filter((p) => p.id !== id));
    setSelectedId(null);
  };
  const reorder = (id, dir) => setParts((ps) => {
    const i = ps.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ps.length) return ps;
    const next = [...ps];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  // Build the Design Spec from the canvas: parts (with layout) + assembly
  // derived from where they sit. The engine still computes every stitch.
  const buildSpec = () => ({
    name: name || 'Custom Design',
    category: 'Amigurumi',
    yarnWeight: 'DK',
    parts: parts.map((p) => {
      const dimensions = p.shape === 'revolve'
        ? { heightCm: round1(p.dims.heightCm), profile: (p.dims.profile || []).map((pt) => ({ t: Math.round(pt.t * 100) / 100, r: round1(pt.r) })) }
        : Object.fromEntries(Object.entries(p.dims).map(([k, v]) => [k, round1(v)]));
      return {
        name: p.name, shape: p.shape, dimensions,
        color: p.color, quantity: p.quantity,
        layout: { x: Math.round(p.x), y: Math.round(p.y) },
        ...(p.face ? { face: true } : {}),
      };
    }),
    assembly: deriveAssembly(parts),
    embellishments: [],
  });

  const shareDesign = async () => {
    setSharing(true); setError(null);
    try {
      const res = await fetch('/api/designs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, spec: buildSpec() }),
      });
      const design = await res.json();
      if (!res.ok) throw new Error(design.error || 'Could not create share link');
      const url = `${window.location.origin}/d/${design.id}`;
      try { await navigator.clipboard.writeText(url); setShareMsg('Link copied!'); }
      catch { setShareMsg('Link ready'); window.prompt('Share this design:', url); }
      setTimeout(() => setShareMsg(null), 2500);
    } catch (e) { setError(e.message); }
    finally { setSharing(false); }
  };

  const generate = async () => {
    if (parts.length === 0) { setError('Add at least one shape to your design.'); return; }
    setBusy(true); setError(null); setStatus('Computing every stitch…');
    try {
      const spec = buildSpec();
      const res = await fetch('/api/ai/generate-from-spec', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, difficulty, stream: true }),
      });
      const ct = res.headers.get('content-type') || '';
      let pattern;
      if (ct.includes('text/event-stream')) {
        pattern = await readGenerationStream(res, { onStatus: (s) => setStatus(s.message) });
      } else {
        pattern = await res.json();
        if (!res.ok) throw new Error(pattern.error || 'Failed to compile the design');
      }
      fetch('/api/designs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, spec }),
      }).then((r) => r.ok && r.json()).then((d) => {
        if (d?.id) fetch(`/api/designs/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patternId: pattern.id }) });
      }).catch(() => {});
      const progressRes = await fetch('/api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patternId: pattern.id }),
      });
      if (!progressRes.ok) throw new Error('Failed to start tracking');
      fireConfetti({ count: 90 });
      navigate(`/tracker/${pattern.id}`);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-surface"><ThreadSpinner size={56} /></div>;
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-on-surface">
        <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"><Lock size={24} className="text-primary" /></div>
          <h1 className="font-display text-2xl font-bold mb-2">Sign in to design</h1>
          <p className="text-sm text-on-surface-variant mb-8">Designs and their patterns are saved to your account.</p>
          <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Go to account</Link>
        </div>
      </div>
    );
  }

  const inspector = !selected ? (
    <div className="flex h-full flex-col items-center justify-center px-5 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low"><SlidersHorizontal size={20} className="text-on-surface-variant" /></div>
      <p className="text-sm font-semibold">Nothing selected</p>
      <p className="mt-1 text-xs text-on-surface-variant">Tap a shape on the canvas to edit its size, colour, and details.</p>
    </div>
  ) : (
    <div className="space-y-5 p-4">
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Part name</p>
        <div className="flex items-center gap-2">
          <input value={selected.name} onChange={(e) => updatePart(selected.id, { name: e.target.value })}
            className="flex-1 rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30" />
          <span className="rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-semibold text-on-secondary-container">{shapeDef(selected.shape)?.label || selected.shape}</span>
        </div>
      </div>

      {selected.shape === 'revolve' && (
        <div className="rounded-lg bg-tertiary-container/40 border border-tertiary/20 px-3 py-2.5 text-xs text-on-surface-variant leading-relaxed">
          <span className="font-semibold text-on-surface">Sculpt mode:</span> drag the dots on the canvas to shape your silhouette. We compute exact stitch counts for whatever you draw.
        </div>
      )}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Size</p>
        {(shapeDef(selected.shape)?.fields || Object.keys(selected.dims)).map((key) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">{DIM_LABEL[key] || key}</span>
              <span className="text-on-surface-variant">{round1(selected.dims[key])} cm</span>
            </div>
            <input type="range" min="2" max="30" step="0.5" value={selected.dims[key]}
              onChange={(e) => updateDim(selected.id, key, parseFloat(e.target.value))} className="w-full accent-primary" />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Yarn color</p>
        <div className="flex flex-wrap gap-1.5">
          {PALETTE.map((p) => (
            <button key={p.name} onClick={() => updatePart(selected.id, { color: p.name })} aria-label={p.name}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${selected.color === p.name ? 'border-on-surface' : 'border-transparent'}`} style={{ backgroundColor: p.hex }} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">Make</span>
        <div className="flex items-center gap-2">
          {[1, 2, 4].map((q) => (
            <button key={q} onClick={() => updatePart(selected.id, { quantity: q })}
              className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors ${selected.quantity === q ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>×{q}</button>
          ))}
        </div>
      </div>

      <button onClick={() => updatePart(selected.id, { face: !selected.face })}
        className="flex w-full items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface-container">
        <span className="flex items-center gap-1.5"><Smile size={14} className="text-primary" />Add a face (eyes)</span>
        <span className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${selected.face ? 'bg-primary' : 'bg-outline-variant/40'}`}>
          <span className={`h-4 w-4 rounded-full bg-white transition-transform ${selected.face ? 'translate-x-4' : ''}`} />
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/15 pt-3">
        <button onClick={() => duplicatePart(selected.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors"><Copy size={13} />Duplicate</button>
        <button onClick={() => deletePart(selected.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-error/30 px-3 py-2 text-xs font-semibold text-error hover:bg-error-container/40 transition-colors"><Trash2 size={13} />Delete</button>
        <button onClick={() => reorder(selected.id, 1)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors"><ChevronUp size={13} />Forward</button>
        <button onClick={() => reorder(selected.id, -1)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors"><ChevronDown size={13} />Back</button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-dim text-on-surface">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-outline-variant/15 bg-surface-container-lowest px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors" aria-label="Exit editor"><ArrowLeft size={18} /></Link>
          <span className="font-display text-base font-bold hidden sm:block">Loopsy</span>
          <span className="text-outline-variant hidden sm:block">/</span>
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Design name"
            className="w-32 sm:w-56 rounded-md bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:bg-surface-container-low focus:bg-surface-container-low focus:ring-2 focus:ring-primary/30 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={shareDesign} disabled={sharing}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-3 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50">
            {shareMsg ? <Check size={14} className="text-secondary" /> : <Share2 size={14} />}<span className="hidden sm:inline">{shareMsg || 'Share'}</span>
          </button>
          <button onClick={generate} disabled={busy}
            className="shine-sweep inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-50">
            {busy ? <ThreadSpinner size={15} className="text-on-primary" /> : <Sparkles size={15} />}
            <span className="hidden sm:inline">{busy ? (status || 'Compiling…') : 'Generate pattern'}</span>
            <span className="sm:hidden">{busy ? '…' : 'Make'}</span>
          </button>
        </div>
      </header>

      {error && <div className="shrink-0 bg-error-container px-4 py-2 text-center text-sm text-on-error-container">{error}</div>}

      {/* Body: left panel · artboard · right inspector */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left panel — elements / setup */}
        <aside className="flex shrink-0 flex-col border-b md:border-b-0 md:border-r border-outline-variant/15 bg-surface-container-lowest md:w-64">
          <div className="flex gap-1 p-2">
            {[{ id: 'elements', label: 'Elements' }, { id: 'setup', label: 'Setup' }].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${tab === id ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                {id === 'elements' ? <Shapes size={14} /> : <SlidersHorizontal size={14} />}{label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 md:max-h-none max-h-56">
            {tab === 'elements' ? (
              <div className="grid grid-cols-2 gap-2">
                {SHAPE_KIT.map((def) => (
                  <Motion.button key={def.id} whileTap={{ scale: 0.95 }} transition={SPRING.snappy} onClick={() => addShape(def)}
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-3 text-left hover:border-primary/40 hover:bg-surface-container-low transition-colors">
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><Plus size={13} className="text-primary" />{def.label}</span>
                    <span className="text-[11px] text-on-surface-variant leading-tight">{def.hint}</span>
                  </Motion.button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Difficulty</p>
                  <div className="flex flex-col gap-1.5">
                    {['beginner', 'intermediate', 'advanced'].map((d) => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className={`rounded-lg px-3 py-2 border text-sm font-medium capitalize text-left transition-all ${difficulty === d ? 'bg-primary/8 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>{d}</button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">Every shape compiles to exact, verified stitch counts. We read your layout to write the assembly steps automatically.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Center desk + artboard */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,_color-mix(in_srgb,var(--on-surface)_8%,transparent)_1px,transparent_1px)] [background-size:24px_24px]" />
          <Motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ transform: `scale(${zoom})` }}
            className="relative origin-center transition-transform"
          >
            <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-warm-xl ring-1 ring-outline-variant/10">
              <div className="relative aspect-[360/460] h-[min(72vh,560px)] bg-gradient-to-b from-surface-container-low to-surface-container">
                <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-yarn-periwinkle/15 blur-3xl blob-drift" />
                <CanvasStage parts={parts} selectedId={selectedId} onSelect={setSelectedId} onMove={movePart} onSculpt={updateSculpt} />
              </div>
            </div>
          </Motion.div>

          {/* Zoom control */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface-container-lowest/90 px-2 py-1 shadow-warm backdrop-blur">
            <button onClick={() => setZoom((z) => Math.max(0.6, round1(z - 0.1)))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors" aria-label="Zoom out"><Minus size={14} /></button>
            <button onClick={() => setZoom(1)} className="min-w-[44px] text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom((z) => Math.min(1.5, round1(z + 0.1)))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors" aria-label="Zoom in"><Plus size={14} /></button>
          </div>
        </div>

        {/* Right inspector */}
        <aside className="shrink-0 overflow-y-auto border-t md:border-t-0 md:border-l border-outline-variant/15 bg-surface-container-lowest md:w-72">
          <div className="border-b border-outline-variant/15 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{selected ? 'Properties' : `${parts.length} part${parts.length === 1 ? '' : 's'}`}</p>
          </div>
          <AnimatePresence mode="wait">
            <Motion.div key={selected?.id || 'none'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="md:h-[calc(100%-49px)]">
              {inspector}
            </Motion.div>
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}
