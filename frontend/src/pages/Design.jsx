import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Menu, ArrowLeft, Lock, Sparkles, Check, Share2, Plus, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { Reveal } from '../components/motion/Reveal';
import { ThreadSpinner } from '../components/motion/Thread';
import Magnetic from '../components/motion/Magnetic';
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
    { id: nextId(), name: 'Body', shape: 'ellipsoid', dims: { diameterCm: 7, heightCm: 9 }, color: 'violet', quantity: 1, x: CANVAS.w / 2, y: 270 },
    { id: nextId(), name: 'Head', shape: 'sphere', dims: { diameterCm: 6.5 }, color: 'violet', quantity: 1, x: CANVAS.w / 2, y: 140 },
  ];
}

export default function Design() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);

  const [name, setName] = useState('My Design');
  const [parts, setParts] = useState(starterParts);
  const [selectedId, setSelectedId] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');

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
      id: nextId(), name: def.label, shape: def.shape, dims: { ...def.dims }, color: 'coral', quantity: 1,
      x: CANVAS.w / 2 + ((n % 5) - 2) * 18, y: 90 + (n % 4) * 22,
    };
    setParts((ps) => [...ps, p]);
    setSelectedId(p.id);
  };
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
    parts: parts.map((p) => ({
      name: p.name, shape: p.shape,
      dimensions: Object.fromEntries(Object.entries(p.dims).map(([k, v]) => [k, round1(v)])),
      color: p.color, quantity: p.quantity,
      layout: { x: Math.round(p.x), y: Math.round(p.y) },
    })),
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
      <div className="flex min-h-screen bg-surface text-on-surface">
        <SideNav />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <Reveal className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"><Lock size={24} className="text-primary" /></div>
            <h1 className="font-display text-2xl font-bold mb-2">Sign in to design</h1>
            <p className="text-sm text-on-surface-variant mb-8">Designs and their patterns are saved to your account.</p>
            <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Go to account</Link>
          </Reveal>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <SideNav />
      <main className="flex-1 overflow-y-auto">
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between px-5 py-4 glass-panel border-b border-outline-variant/15">
          <Link to="/" className="flex items-center gap-1.5 text-on-surface-variant"><ArrowLeft size={19} /><span className="text-sm font-medium">Explore</span></Link>
          <span className="font-display text-lg font-bold">Loopsy</span>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={24} /></button>
          <MobileNav isOpen={mobileOpen} onClose={closeMobileNav} />
        </header>

        <div className="px-6 py-10 md:px-10 md:py-12 lg:px-14">
          <Reveal className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">Design Canvas</p>
            <h1 className="font-display display-wonk text-[2.2rem] md:text-[2.8rem] font-bold leading-tight">Build it from shapes.</h1>
            <p className="mt-3 text-on-surface-variant max-w-2xl">Drop balls, eggs, tubes and cones, drag them where you want, size and colour each one. Every shape compiles to exact stitch counts — and we read your layout to write the assembly steps.</p>
          </Reveal>

          {error && <div className="mb-5 max-w-3xl rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>}

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Canvas */}
            <Reveal className="lg:sticky lg:top-6 self-start">
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm overflow-hidden">
                <div className="relative aspect-[360/460] bg-gradient-to-b from-surface-container-low to-surface-container">
                  <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-yarn-periwinkle/15 blur-3xl blob-drift" />
                  <CanvasStage parts={parts} selectedId={selectedId} onSelect={setSelectedId} onMove={movePart} />
                </div>
                <div className="flex items-center gap-2 border-t border-outline-variant/15 px-4 py-3">
                  <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-transparent text-sm font-semibold outline-none" />
                  <button onClick={shareDesign} disabled={sharing} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50">
                    {shareMsg ? <Check size={13} className="text-secondary" /> : <Share2 size={13} />}{shareMsg || 'Share'}
                  </button>
                </div>
              </div>
              <p className="mt-2 px-1 text-xs text-on-surface-variant">Tip: drag any shape to reposition it. Tap to select and edit.</p>
            </Reveal>

            {/* Controls */}
            <div className="space-y-5">
              {/* Add shapes */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">Add a shape</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SHAPE_KIT.map((def) => (
                    <Motion.button key={def.id} whileTap={{ scale: 0.96 }} transition={SPRING.snappy} onClick={() => addShape(def)}
                      className="flex flex-col items-start gap-0.5 rounded-xl border border-outline-variant/20 px-3 py-2.5 text-left hover:border-primary/40 hover:bg-surface-container-low transition-colors">
                      <span className="flex items-center gap-1.5 text-sm font-semibold"><Plus size={13} className="text-primary" />{def.label}</span>
                      <span className="text-[11px] text-on-surface-variant leading-tight">{def.hint}</span>
                    </Motion.button>
                  ))}
                </div>
              </div>

              {/* Inspector */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5 min-h-[120px]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">
                  {selected ? `Editing: ${selected.name}` : 'Selected part'}
                </h3>
                {!selected ? (
                  <p className="text-sm text-on-surface-variant">Select a shape on the canvas to rename, resize, recolor, or remove it. {parts.length} part{parts.length === 1 ? '' : 's'} so far.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input value={selected.name} onChange={(e) => updatePart(selected.id, { name: e.target.value })}
                        className="flex-1 rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30" />
                      <span className="rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-semibold text-on-secondary-container">{shapeDef(selected.shape)?.label || selected.shape}</span>
                    </div>

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

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold">Make</span>
                      <div className="flex items-center gap-2">
                        {[1, 2, 4].map((q) => (
                          <button key={q} onClick={() => updatePart(selected.id, { quantity: q })}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors ${selected.quantity === q ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>×{q}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold">Yarn color</span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {PALETTE.map((p) => (
                          <button key={p.name} onClick={() => updatePart(selected.id, { color: p.name })} aria-label={p.name}
                            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${selected.color === p.name ? 'border-on-surface' : 'border-transparent'}`} style={{ backgroundColor: p.hex }} />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={() => duplicatePart(selected.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors"><Copy size={13} />Duplicate</button>
                      <button onClick={() => reorder(selected.id, 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors"><ChevronUp size={13} />Forward</button>
                      <button onClick={() => reorder(selected.id, -1)} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors"><ChevronDown size={13} />Back</button>
                      <button onClick={() => deletePart(selected.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error-container/40 transition-colors"><Trash2 size={13} />Delete</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Difficulty + generate */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                  {['beginner', 'intermediate', 'advanced'].map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`rounded-xl px-4 py-2 border text-sm font-medium capitalize transition-all ${difficulty === d ? 'bg-primary/8 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>{d}</button>
                  ))}
                </div>
                <Magnetic>
                  <button onClick={generate} disabled={busy}
                    className="shine-sweep flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md disabled:opacity-50">
                    {busy ? <ThreadSpinner size={18} className="text-on-primary" /> : <Sparkles size={17} />}
                    {busy ? (status || 'Compiling…') : 'Generate verified pattern'}
                  </button>
                </Magnetic>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
