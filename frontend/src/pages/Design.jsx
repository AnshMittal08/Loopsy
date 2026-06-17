import React, { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { Menu, ArrowLeft, Lock, Sparkles, RotateCcw, Check } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileNav from '../components/MobileNav';
import { Reveal } from '../components/motion/Reveal';
import { ThreadSpinner } from '../components/motion/Thread';
import Magnetic from '../components/motion/Magnetic';
import { SPRING } from '../lib/motionTokens';
import { readGenerationStream } from '../lib/generationStream';
import { fireConfetti } from '../lib/confetti';
import { useAuth } from '../components/AuthProvider';

// Yarn palette — names map to swatches; the name is what the pattern records.
const PALETTE = [
  { name: 'coral', hex: '#FF6584' },
  { name: 'marigold', hex: '#FFB02E' },
  { name: 'mint', hex: '#4ECBA0' },
  { name: 'violet', hex: '#8B7CF6' },
  { name: 'rose', hex: '#F472B6' },
  { name: 'cream', hex: '#EFE3C8' },
  { name: 'chocolate', hex: '#8A5A3B' },
  { name: 'charcoal', hex: '#3A3550' },
  { name: 'white', hex: '#F4F4FA' },
];
const hexOf = (name) => (PALETTE.find((p) => p.name === name) || PALETTE[0]).hex;

// Part catalogue — each maps to a compiler shape with base (medium) dimensions
// in cm. `core` parts are always on; others toggle. The spec is computed from
// these bases × the global sliders.
const PARTS = {
  head:   { label: 'Head',   shape: 'sphere',    core: true,  base: { diameterCm: 8 }, quantity: 1, defaultColor: 'cream' },
  body:   { label: 'Body',   shape: 'ellipsoid', core: true,  base: { diameterCm: 7, heightCm: 9 }, quantity: 1, defaultColor: 'cream' },
  muzzle: { label: 'Muzzle', shape: 'sphere',    core: false, base: { diameterCm: 3 }, quantity: 1, defaultColor: 'white' },
  ears:   { label: 'Ears',   shape: 'cone',      core: false, base: { baseDiameterCm: 3, heightCm: 3 }, quantity: 2, defaultColor: 'cream' },
  arms:   { label: 'Arms',   shape: 'tube',      core: false, base: { diameterCm: 2.6, heightCm: 6 }, quantity: 2, defaultColor: 'cream' },
  legs:   { label: 'Legs',   shape: 'tube',      core: false, base: { diameterCm: 3, heightCm: 6 }, quantity: 2, defaultColor: 'cream' },
  tail:   { label: 'Tail',   shape: 'sphere',    core: false, base: { diameterCm: 2.5 }, quantity: 1, defaultColor: 'cream' },
};

const round1 = (n) => Math.round(n * 10) / 10;

/* ── Live creature preview — parts positioned + sized by the config ── */
function CreaturePreview({ enabled, colors, size, ratio, limb }) {
  const headR = 30 * size * ratio;
  const bodyRx = 26 * size;
  const bodyRy = 34 * size;
  const cx = 110;
  const headCy = 70;
  const bodyCy = headCy + headR + bodyRy - 6;
  const limbH = 30 * size * limb;

  const spring = { type: 'spring', stiffness: 200, damping: 18 };

  return (
    <svg viewBox="0 0 220 280" className="h-full w-full">
      {/* soft ground shadow */}
      <ellipse cx={cx} cy={262} rx={bodyRx * 1.1} ry={9} fill="rgba(0,0,0,0.18)" />

      {/* tail */}
      <AnimatePresence>
        {enabled.tail && (
          <Motion.circle
            cx={cx + bodyRx - 4} cy={bodyCy + bodyRy - 14} r={9 * size}
            fill={hexOf(colors.tail)} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}
          />
        )}
      </AnimatePresence>

      {/* legs */}
      <AnimatePresence>
        {enabled.legs && (
          <Motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring}>
            <rect x={cx - bodyRx * 0.55 - 6} y={bodyCy + bodyRy - 8} width={12 * size} height={limbH} rx={6 * size} fill={hexOf(colors.legs)} />
            <rect x={cx + bodyRx * 0.55 - 6} y={bodyCy + bodyRy - 8} width={12 * size} height={limbH} rx={6 * size} fill={hexOf(colors.legs)} />
          </Motion.g>
        )}
      </AnimatePresence>

      {/* arms */}
      <AnimatePresence>
        {enabled.arms && (
          <Motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring}>
            <rect x={cx - bodyRx - 8} y={bodyCy - 8} width={11 * size} height={limbH} rx={5.5 * size} fill={hexOf(colors.arms)} transform={`rotate(18 ${cx - bodyRx} ${bodyCy})`} />
            <rect x={cx + bodyRx - 3} y={bodyCy - 8} width={11 * size} height={limbH} rx={5.5 * size} fill={hexOf(colors.arms)} transform={`rotate(-18 ${cx + bodyRx} ${bodyCy})`} />
          </Motion.g>
        )}
      </AnimatePresence>

      {/* body */}
      <Motion.ellipse cx={cx} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={hexOf(colors.body)} animate={{ rx: bodyRx, ry: bodyRy, cy: bodyCy }} transition={spring} />

      {/* ears */}
      <AnimatePresence>
        {enabled.ears && (
          <Motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
            <circle cx={cx - headR * 0.6} cy={headCy - headR * 0.7} r={10 * size} fill={hexOf(colors.ears)} />
            <circle cx={cx + headR * 0.6} cy={headCy - headR * 0.7} r={10 * size} fill={hexOf(colors.ears)} />
          </Motion.g>
        )}
      </AnimatePresence>

      {/* head */}
      <Motion.circle cx={cx} cy={headCy} r={headR} fill={hexOf(colors.head)} animate={{ r: headR }} transition={spring} />

      {/* eyes */}
      <circle cx={cx - headR * 0.35} cy={headCy - 2} r={3.2} fill="#1A1726" />
      <circle cx={cx + headR * 0.35} cy={headCy - 2} r={3.2} fill="#1A1726" />

      {/* muzzle */}
      <AnimatePresence>
        {enabled.muzzle && (
          <Motion.circle cx={cx} cy={headCy + headR * 0.35} r={11 * size} fill={hexOf(colors.muzzle)} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} />
        )}
      </AnimatePresence>
    </svg>
  );
}

export default function Design() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);

  const [name, setName] = useState('My Creature');
  const [enabled, setEnabled] = useState({ head: true, body: true, muzzle: true, ears: true, arms: true, legs: true, tail: false });
  const [colors, setColors] = useState(
    Object.fromEntries(Object.entries(PARTS).map(([k, p]) => [k, p.defaultColor]))
  );
  const [size, setSize] = useState(1);
  const [ratio, setRatio] = useState(1);   // head/body ratio
  const [limb, setLimb] = useState(1);      // limb length
  const [difficulty, setDifficulty] = useState('beginner');

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  // Compute the Design Spec from the current canvas config.
  const spec = useMemo(() => {
    const parts = [];
    for (const [key, def] of Object.entries(PARTS)) {
      if (!enabled[key]) continue;
      const dims = {};
      for (const [dk, dv] of Object.entries(def.base)) {
        let v = dv * size;
        if (key === 'head') v *= ratio;
        if ((key === 'arms' || key === 'legs') && dk === 'heightCm') v *= limb;
        dims[dk] = round1(v);
      }
      parts.push({ name: def.label, shape: def.shape, dimensions: dims, color: colors[key], quantity: def.quantity });
    }
    return { name: name || 'Custom Creature', category: 'Amigurumi', yarnWeight: 'DK', parts, assembly: [], embellishments: [] };
  }, [enabled, colors, size, ratio, limb, name]);

  const generate = async () => {
    setBusy(true); setError(null); setStatus('Computing every stitch…');
    try {
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

      // Persist the design + link the pattern (best-effort, non-blocking).
      fetch('/api/designs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: spec.name, spec }),
      }).then((r) => r.ok && r.json()).then((d) => {
        if (d?.id) fetch(`/api/designs/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patternId: pattern.id }) });
      }).catch(() => {});

      const progressRes = await fetch('/api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patternId: pattern.id }),
      });
      if (!progressRes.ok) throw new Error('Failed to start tracking');
      fireConfetti({ count: 90 });
      navigate(`/tracker/${pattern.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface"><ThreadSpinner size={56} /></div>;
  }
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

  const partKeys = Object.keys(PARTS);

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

        <div className="px-6 py-10 md:px-12 md:py-14 lg:px-16">
          <Reveal className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">Design Canvas</p>
            <h1 className="font-display display-wonk text-[2.4rem] md:text-[3rem] font-bold leading-tight">Design your own creature.</h1>
            <p className="mt-3 text-on-surface-variant max-w-xl">Assemble parts, tune the proportions, pick your yarn — the math compiles itself into a verified pattern.</p>
          </Reveal>

          {error && (
            <div className="mb-6 max-w-3xl rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            {/* Live preview */}
            <Reveal className="lg:sticky lg:top-8 self-start rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm overflow-hidden">
              <div className="relative aspect-[4/5] bg-gradient-to-b from-surface-container-low to-surface-container">
                <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-yarn-periwinkle/15 blur-3xl blob-drift" />
                <CreaturePreview enabled={enabled} colors={colors} size={size} ratio={ratio} limb={limb} />
              </div>
              <div className="flex items-center gap-2 border-t border-outline-variant/15 px-4 py-3">
                <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-transparent text-sm font-semibold outline-none" />
                <span className="text-xs text-on-surface-variant">{spec.parts.length} parts</span>
              </div>
            </Reveal>

            {/* Controls */}
            <div className="space-y-6">
              {/* Parts */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">Parts</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {partKeys.map((k) => {
                    const def = PARTS[k];
                    const on = enabled[k];
                    return (
                      <Motion.button
                        key={k} whileTap={{ scale: 0.96 }} transition={SPRING.snappy}
                        onClick={() => !def.core && setEnabled((e) => ({ ...e, [k]: !e[k] }))}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                          on ? 'border-primary bg-primary/8 text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'
                        } ${def.core ? 'cursor-default' : ''}`}
                      >
                        <span>{def.label}{def.quantity > 1 ? ` ×${def.quantity}` : ''}</span>
                        {on && <Check size={14} className="shrink-0" />}
                      </Motion.button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">Head and body are always included.</p>
              </div>

              {/* Proportions */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Proportions</h3>
                {[
                  { label: 'Overall size', value: size, set: setSize, min: 0.7, max: 1.5 },
                  { label: 'Head / body ratio', value: ratio, set: setRatio, min: 0.7, max: 1.3 },
                  { label: 'Limb length', value: limb, set: setLimb, min: 0.7, max: 1.4 },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-on-surface">{s.label}</span>
                      <span className="text-on-surface-variant">{Math.round(s.value * 100)}%</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step="0.05" value={s.value}
                      onChange={(e) => s.set(parseFloat(e.target.value))}
                      className="w-full accent-primary" />
                  </div>
                ))}
              </div>

              {/* Colors */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">Yarn colors</h3>
                <div className="space-y-2.5">
                  {partKeys.filter((k) => enabled[k]).map((k) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-on-surface">{PARTS[k].label}</span>
                      <div className="flex gap-1.5">
                        {PALETTE.map((p) => (
                          <button key={p.name} onClick={() => setColors((c) => ({ ...c, [k]: p.name }))}
                            aria-label={p.name}
                            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${colors[k] === p.name ? 'border-on-surface' : 'border-transparent'}`}
                            style={{ backgroundColor: p.hex }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty + generate */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">Difficulty</h3>
                <div className="flex flex-wrap gap-2 mb-5">
                  {['beginner', 'intermediate', 'advanced'].map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`rounded-xl px-4 py-2 border text-sm font-medium capitalize transition-all ${difficulty === d ? 'bg-primary/8 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>
                      {d}
                    </button>
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
