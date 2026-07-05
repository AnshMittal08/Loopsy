import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lock, Sparkles, Check, Share2, Plus, Trash2, Copy, ChevronUp, ChevronDown, Shapes, SlidersHorizontal, Minus, Smile, Grid3x3, Box, Square, Rotate3d, BadgeCheck, Undo2, Redo2, Keyboard, Save, FolderOpen } from 'lucide-react';
import { ThreadSpinner } from '../components/motion/Thread';
import CanvasStage from '../components/CanvasStage';
import ChartStudio from './ChartStudio';

const Design3DPreview = lazy(() => import('../components/three/Design3DPreview'));
import ColorPicker from '../components/ColorPicker';
import CopyLinkDialog from '../components/CopyLinkDialog';
import OnboardingCard from '../components/OnboardingCard';
import ShortcutsHint from '../components/ShortcutsHint';
import { SHAPE_KIT, DIM_LABEL, shapeDef } from '../lib/shapeKit';
import { BUILD_TEMPLATES } from '../lib/buildTemplates';
import { CANVAS, deriveAssembly } from '../lib/assembly';
import { makeSnapshot, HISTORY_LIMIT } from '../lib/designHistory';
import { SPRING } from '../lib/motionTokens';
import { readGenerationStream } from '../lib/generationStream';
import { fireConfetti } from '../lib/confetti';
import { DRAFT_KEY, partsFromSpec, readDraft, writeDraft } from '../lib/designHydrate';
import { useToast } from '../components/Toast';
import { useAuth } from '../components/AuthProvider';

let uid = 0;
const nextId = () => `p${Date.now()}_${uid++}`;
const round1 = (n) => Math.round(n * 10) / 10;

// A friendly starter so the canvas isn't empty: a simple two-ball creature.
function starterParts() {
  return [
    { id: nextId(), name: 'Body', shape: 'ellipsoid', dims: { diameterCm: 7, heightCm: 9 }, color: 'violet', quantity: 1, stitch: 'sc', x: CANVAS.w / 2, y: 280 },
    { id: nextId(), name: 'Head', shape: 'sphere', dims: { diameterCm: 6.5 }, color: 'violet', quantity: 1, stitch: 'sc', x: CANVAS.w / 2, y: 150, face: true },
  ];
}

export default function Design() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id: routeDesignId } = useParams();
  const { showToast } = useToast();

  // Persistence: the saved design this canvas edits (null = unsaved draft).
  const [designId, setDesignId] = useState(routeDesignId || null);
  const [saving, setSaving] = useState(false);
  const hydratedRef = useRef(false);   // gate autosave until initial load is done
  const skipLoadRef = useRef(null);    // avoid re-fetch right after save→navigate

  const [name, setName] = useState('My Design');
  const [parts, setParts] = useState(starterParts);
  const [selectedId, setSelectedId] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');
  const [tab, setTab] = useState('elements'); // 'elements' | 'setup'
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState('build'); // 'build' (3D shapes) | 'draw' (chart)
  const [view, setView] = useState('2d'); // '2d' canvas | '3d' model

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(null); // in-app copy dialog when clipboard is unavailable
  const [shareMsg, setShareMsg] = useState(null);
  const [recents, setRecents] = useState([]);
  const addRecent = (hex) => setRecents((r) => [hex, ...r.filter((x) => x !== hex)].slice(0, 8));
  const [preview, setPreview] = useState(null); // live compile summary
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, partId } right-click menu
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Assembly: auto-derived from layout until the maker takes over. While
  // `assemblyEdited` is false we derive at render/build time (don't store);
  // once edited we persist `assemblySteps` verbatim.
  const [assemblySteps, setAssemblySteps] = useState([]);
  const [assemblyEdited, setAssemblyEdited] = useState(false);
  const [embellishments, setEmbellishments] = useState([]); // [{ id, text }]

  // ── Undo / redo ───────────────────────────────────────────────────────────
  // History is snapshots of the five undoable fields only. The LIVE design
  // state and both stacks live in refs so undo/redo/commit (invoked from a
  // global keydown listener and from buttons) always read FRESH values — no
  // stale closures. `canUndo`/`canRedo` are mirrored into state so the toolbar
  // buttons re-render when a stack becomes (non-)empty.
  //
  // Refs are never read or written during render (React 19 lint forbids it):
  // `liveRef` is synced in a post-render effect, and the stacks are only touched
  // inside event-handler callbacks below.
  const liveRef = useRef({ name, parts, assemblySteps, assemblyEdited, embellishments });
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const coalesceRef = useRef({ kind: null, at: 0 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    liveRef.current = { name, parts, assemblySteps, assemblyEdited, embellishments };
  });

  const syncCanFlags = useCallback(() => {
    setCanUndo(undoRef.current.length > 0);
    setCanRedo(redoRef.current.length > 0);
  }, []);

  // Push the CURRENT state onto the undo stack and clear redo. Call BEFORE a
  // mutation. `coalesceKey` (+ window ms) collapses consecutive same-kind edits
  // (a typing burst or an arrow-nudge burst) into a single undo step.
  const commit = useCallback((coalesceKey = null, windowMs = 600) => {
    if (coalesceKey) {
      const last = coalesceRef.current;
      const now = Date.now();
      coalesceRef.current = { kind: coalesceKey, at: now };
      if (last.kind === coalesceKey && now - last.at < windowMs) return; // same burst → skip
    } else {
      coalesceRef.current = { kind: null, at: 0 };
    }
    undoRef.current.push(makeSnapshot(liveRef.current));
    if (undoRef.current.length > HISTORY_LIMIT) undoRef.current.shift();
    redoRef.current = [];
    syncCanFlags();
  }, [syncCanFlags]);

  // Restore all five undoable fields from a snapshot (deep-cloned at capture).
  const restore = useCallback((snap) => {
    liveRef.current = snap; // keep the live mirror in step for an immediate follow-up undo
    setName(snap.name);
    setParts(snap.parts);
    setAssemblySteps(snap.assemblySteps);
    setAssemblyEdited(snap.assemblyEdited);
    setEmbellishments(snap.embellishments);
    // Selection may now point at a part that no longer exists.
    setSelectedId((cur) => (snap.parts.some((p) => p.id === cur) ? cur : null));
    coalesceRef.current = { kind: null, at: 0 };
  }, []);

  const undo = useCallback(() => {
    if (undoRef.current.length === 0) return;
    redoRef.current.push(makeSnapshot(liveRef.current));
    restore(undoRef.current.pop());
    syncCanFlags();
  }, [restore, syncCanFlags]);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    undoRef.current.push(makeSnapshot(liveRef.current));
    restore(redoRef.current.pop());
    syncCanFlags();
  }, [restore, syncCanFlags]);

  // Apply five undoable fields from a draft/spec source, resetting history.
  const applyDesignState = ({ name: n, parts: ps, assemblySteps: as, assemblyEdited: ae, embellishments: em }) => {
    setName(n || 'My Design');
    setParts(ps || []);
    setAssemblySteps(as || []);
    setAssemblyEdited(Boolean(ae));
    setEmbellishments(em || []);
    setSelectedId(null);
    undoRef.current = [];
    redoRef.current = [];
    syncCanFlags();
  };

  // Initial hydration: open a saved design (/design/:id), or restore the
  // localStorage draft on a fresh canvas. Runs once auth has resolved.
  useEffect(() => {
    if (authLoading || !user) return undefined;
    let cancelled = false;
    (async () => {
      if (routeDesignId && skipLoadRef.current === routeDesignId) {
        skipLoadRef.current = null;
        hydratedRef.current = true;
        return;
      }
      const draft = readDraft();
      if (routeDesignId) {
        try {
          const res = await fetch(`/api/designs/${routeDesignId}`);
          const d = await res.json();
          if (cancelled) return;
          if (!res.ok) throw new Error(d.error || 'Design not found');
          if (d.userId && d.userId !== user.id) { navigate(`/d/${routeDesignId}`, { replace: true }); return; }
          if (draft && draft.designId === routeDesignId && draft.at > Date.parse(d.updatedAt || 0)) {
            applyDesignState(draft);
            showToast('Restored unsaved changes to this design.', 'info');
          } else {
            const spec = d.spec || {};
            applyDesignState({
              name: d.name,
              parts: partsFromSpec(spec),
              assemblySteps: Array.isArray(spec.assembly) && spec.assembly.length ? spec.assembly : [],
              assemblyEdited: Array.isArray(spec.assembly) && spec.assembly.length > 0,
              embellishments: (spec.embellishments || []).map((text) => ({ id: nextId(), text })),
            });
          }
          setDesignId(routeDesignId);
        } catch (e) {
          if (!cancelled) { showToast(e.message, 'error'); navigate('/designs', { replace: true }); return; }
        }
      } else if (draft && !draft.designId && draft.parts.length > 0) {
        applyDesignState(draft);
        showToast('Restored your unsaved draft.', 'info');
      }
      if (!cancelled) hydratedRef.current = true;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeDesignId, user, authLoading]);

  // Autosave: debounce the five undoable fields into localStorage so a refresh
  // or crash never loses work. Server saves happen via the Save button.
  useEffect(() => {
    if (!hydratedRef.current) return undefined;
    const t = setTimeout(() => {
      writeDraft({ designId, name, parts, assemblySteps, assemblyEdited, embellishments });
    }, 600);
    return () => clearTimeout(t);
  }, [designId, name, parts, assemblySteps, assemblyEdited, embellishments]);

  const selected = parts.find((p) => p.id === selectedId) || null;

  // Effective assembly steps shown in the editor: derived (live) until edited.
  const effectiveAssembly = assemblyEdited ? assemblySteps : deriveAssembly(parts);

  // Take over the assembly: snapshot the current derived steps, then mutate them.
  // `coalesceKey` lets per-keystroke textarea edits collapse into one undo step.
  const beginAssemblyEdit = (mutate, coalesceKey = null) => {
    commit(coalesceKey);
    setAssemblySteps((prev) => mutate(assemblyEdited ? prev : deriveAssembly(parts)));
    if (!assemblyEdited) setAssemblyEdited(true);
  };
  const resetAssembly = () => { commit(); setAssemblyEdited(false); setAssemblySteps([]); };

  const updatePart = (id, patch, coalesceKey = null) => {
    commit(coalesceKey);
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };
  const updateDim = (id, key, value) => {
    commit(`dim:${id}:${key}`); // slider drag = one undo step
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, dims: { ...p.dims, [key]: value } } : p)));
  };
  const movePart = useCallback((id, x, y) => setParts((ps) => ps.map((p) => (p.id === id ? { ...p, x, y } : p))), []);
  const resizePart = useCallback((id, dims) => setParts((ps) => ps.map((p) => (p.id === id ? { ...p, dims } : p))), []);

  const addShape = (def) => {
    commit();
    // Deterministic stagger so new shapes don't stack exactly on top.
    const n = parts.length;
    const p = {
      id: nextId(), name: def.label, shape: def.shape, dims: JSON.parse(JSON.stringify(def.dims)), color: 'coral', quantity: 1,
      x: CANVAS.w / 2 + ((n % 5) - 2) * 18, y: def.shape === 'revolve' ? CANVAS.h / 2 : 90 + (n % 4) * 22,
    };
    setParts((ps) => [...ps, p]);
    setSelectedId(p.id);
  };

  const applyTemplate = (t) => {
    commit();
    setParts(t.parts().map((p) => ({ ...p, id: nextId(), dims: JSON.parse(JSON.stringify(p.dims)) })));
    setSelectedId(null);
    setName(t.label);
    setAssemblyEdited(false);
    setAssemblySteps([]);
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
    commit();
    const p = { ...src, id: nextId(), x: Math.min(CANVAS.w - 12, src.x + 30), y: Math.min(CANVAS.h - 12, src.y + 24) };
    setParts((ps) => [...ps, p]);
    setSelectedId(p.id);
  };
  const deletePart = (id) => {
    commit();
    setParts((ps) => ps.filter((p) => p.id !== id));
    setSelectedId(null);
  };
  // Embellishment mutations (commit; edits coalesce per-row so typing is one step).
  const addEmbellishment = () => { commit(); setEmbellishments((list) => [...list, { id: nextId(), text: '' }]); };
  const editEmbellishment = (id, text) => { commit(`emb:${id}`); setEmbellishments((list) => list.map((x) => (x.id === id ? { ...x, text } : x))); };
  const removeEmbellishment = (id) => { commit(); setEmbellishments((list) => list.filter((x) => x.id !== id)); };

  const reorder = (id, dir) => {
    commit();
    setParts((ps) => {
      const i = ps.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ps.length) return ps;
      const next = [...ps];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  // Arrow-key nudge: a burst of presses coalesces into one undo step.
  const nudgePart = (id, dx, dy) => {
    commit(`nudge:${id}`);
    setParts((ps) => ps.map((p) => (p.id === id ? {
      ...p,
      x: Math.max(10, Math.min(CANVAS.w - 10, p.x + dx)),
      y: Math.max(10, Math.min(CANVAS.h - 10, p.y + dy)),
    } : p)));
  };

  // Keep the latest values the global keydown listener needs in a ref, so the
  // listener can be attached once (no re-binding) yet never read stale state.
  // Synced in a post-render effect (refs must not be written during render).
  const kbdRef = useRef(null);
  useEffect(() => {
    kbdRef.current = {
      mode, selectedId, undo, redo,
      deleteSelected: () => { if (selectedId) deletePart(selectedId); },
      duplicateSelected: () => { if (selectedId) duplicatePart(selectedId); },
      nudge: (dx, dy) => { if (selectedId) nudgePart(selectedId, dx, dy); },
      deselect: () => { setSelectedId(null); setCtxMenu(null); },
    };
  });

  useEffect(() => {
    const isTyping = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };
    const onKey = (e) => {
      const h = kbdRef.current;
      if (!h) return;
      const meta = e.metaKey || e.ctrlKey;
      const typing = isTyping(e.target);

      // In draw mode ChartStudio owns all shortcuts (it has its own history).
      if (h.mode !== 'build') return;

      // Undo/redo allowed everywhere except while typing in a text field.
      if (meta && (e.key === 'z' || e.key === 'Z')) {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) h.redo(); else h.undo();
        return;
      }
      if (meta && (e.key === 'y' || e.key === 'Y')) {
        if (typing) return;
        e.preventDefault();
        h.redo();
        return;
      }

      // The rest are build-mode, not-typing canvas shortcuts.
      if (h.mode !== 'build' || typing) return;

      if (meta && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); h.duplicateSelected(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (h.selectedId) { e.preventDefault(); h.deleteSelected(); } return; }
      if (e.key === 'Escape') { h.deselect(); return; }
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') { e.preventDefault(); h.nudge(-step, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); h.nudge(step, 0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); h.nudge(0, -step); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); h.nudge(0, step); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Right-click a part on the canvas → open the context menu at the cursor.
  const openPartMenu = useCallback((part, e) => {
    e.preventDefault();
    setSelectedId(part.id);
    const PAD = 8, MW = 168, MH = 188;
    const x = Math.min(e.clientX, window.innerWidth - MW - PAD);
    const y = Math.min(e.clientY, window.innerHeight - MH - PAD);
    setCtxMenu({ x: Math.max(PAD, x), y: Math.max(PAD, y), partId: part.id });
  }, []);

  // Close the context menu on any outside click or Escape.
  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = () => setCtxMenu(null);
    const onKey = (e) => { if (e.key === 'Escape') setCtxMenu(null); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', onKey); };
  }, [ctxMenu]);

  // Scroll-to-zoom over the artboard. Attached with { passive: false } so we can
  // preventDefault and stop the page from scrolling.
  const artboardRef = useRef(null);
  useEffect(() => {
    const el = artboardRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (view !== '2d') return; // 3D view has its own zoom
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setZoom((z) => Math.max(0.5, Math.min(2, round1(z + delta))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view]);

  // Build the Design Spec from the canvas: parts (with layout) + assembly
  // derived from where they sit. The engine still computes every stitch.
  const buildSpec = useCallback(() => ({
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
        stitch: p.stitch || 'sc',
        layout: { x: Math.round(p.x), y: Math.round(p.y) },
        ...(p.face ? { face: true } : {}),
        ...(p.colorPlan ? { colorPlan: p.colorPlan } : {}),
        ...(p.texture ? { texture: p.texture } : {}),
      };
    }),
    assembly: (assemblyEdited ? assemblySteps : deriveAssembly(parts)).filter((s) => s.trim()),
    embellishments: embellishments.map((e) => e.text).filter((s) => s.trim()),
  }), [parts, name, assemblyEdited, assemblySteps, embellishments]);

  // Live verified-math feedback: debounced compile of the current design so the
  // canvas shows "≈ N stitches · verified ✓" while you work, not only after Generate.
  useEffect(() => {
    if (mode !== 'build') return undefined;
    const id = setTimeout(async () => {
      if (parts.length === 0) { setPreview(null); return; }
      try {
        const res = await fetch('/api/design/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spec: buildSpec() }),
        });
        setPreview(await res.json());
      } catch { setPreview(null); }
    }, 350);
    return () => clearTimeout(id);
  }, [buildSpec, mode, parts.length]);

  // Save the design: PUT in place when it already exists, POST once when new
  // (then adopt the id so every later save updates the same record — no more
  // duplicate designs). Returns the design id, or null on failure.
  const saveDesign = async () => {
    if (parts.length === 0) { setError('Add at least one shape before saving.'); return null; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(designId ? `/api/designs/${designId}` : '/api/designs', {
        method: designId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'My Design', spec: buildSpec() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save the design');
      if (!designId) {
        skipLoadRef.current = d.id;
        setDesignId(d.id);
        navigate(`/design/${d.id}`, { replace: true });
      }
      writeDraft({ designId: d.id, name, parts, assemblySteps, assemblyEdited, embellishments });
      return d.id;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const id = await saveDesign();
    if (id) showToast('Design saved.', 'success');
  };

  const shareDesign = async () => {
    setSharing(true); setError(null);
    try {
      const id = await saveDesign(); // share always reflects the current state
      if (!id) return;
      const url = `${window.location.origin}/d/${id}`;
      try { await navigator.clipboard.writeText(url); setShareMsg('Link copied!'); }
      catch { setShareMsg('Link ready'); setShareUrl(url); }
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
      // Persist THIS design (in place when saved) and link the compiled pattern.
      saveDesign().then((sid) => {
        if (sid) fetch(`/api/designs/${sid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patternId: pattern.id }) }).catch(() => {});
      }).catch(() => {});
      const progressRes = await fetch('/api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patternId: pattern.id }),
      });
      if (!progressRes.ok) throw new Error('Failed to start tracking');
      fireConfetti({ count: 90 });
      navigate(`/tracker/${pattern.id}`);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  if (authLoading) return <div className="flex min-h-dvh items-center justify-center bg-surface"><ThreadSpinner size={56} /></div>;
  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface px-6 text-on-surface">
        <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"><Lock size={24} className="text-primary" /></div>
          <h1 className="font-display text-2xl font-bold mb-2">Sign in to design</h1>
          <p className="text-sm text-on-surface-variant mb-8">Designs and their patterns are saved to your account.</p>
          <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Go to account</Link>
        </div>
      </div>
    );
  }

  if (mode === 'draw') return <ChartStudio onMode={setMode} />;

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
          <input value={selected.name} onChange={(e) => updatePart(selected.id, { name: e.target.value }, `pname:${selected.id}`)}
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
        <ColorPicker value={selected.color} onChange={(c) => updatePart(selected.id, { color: c })} recents={recents} onAddRecent={addRecent} size={28} />
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Stitch</p>
        <div className="grid grid-cols-3 gap-2">
          {[{ id: 'sc', label: 'SC', sub: 'Single' }, { id: 'hdc', label: 'HDC', sub: 'Half double' }, { id: 'dc', label: 'DC', sub: 'Double' }].map((s) => (
            <button key={s.id} onClick={() => updatePart(selected.id, { stitch: s.id })} title={s.sub}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 border transition-colors ${(selected.stitch || 'sc') === s.id ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>
              <span className="text-xs font-semibold">{s.label}</span>
              <span className="text-[9px] leading-none opacity-80">{s.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={() => updatePart(selected.id, { colorPlan: selected.colorPlan ? undefined : { colors: [selected.color || 'coral', 'cream'], stripeRounds: 2 } })}
          className="flex w-full items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface-container">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Stripes</span>
          <span className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${selected.colorPlan ? 'bg-primary' : 'bg-outline-variant/40'}`}>
            <span className={`h-4 w-4 rounded-full bg-white transition-transform ${selected.colorPlan ? 'translate-x-4' : ''}`} />
          </span>
        </button>

        {selected.colorPlan && (
          <div className="space-y-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3">
            <div className="flex flex-wrap items-start gap-2">
              {selected.colorPlan.colors.map((c, i) => (
                <div key={i} className="space-y-1">
                  <ColorPicker
                    value={c}
                    onChange={(nc) => updatePart(selected.id, { colorPlan: { ...selected.colorPlan, colors: selected.colorPlan.colors.map((x, j) => (j === i ? nc : x)) } })}
                    recents={recents} onAddRecent={addRecent} size={24}
                  />
                  {selected.colorPlan.colors.length > 2 && (
                    <button onClick={() => updatePart(selected.id, { colorPlan: { ...selected.colorPlan, colors: selected.colorPlan.colors.filter((_, j) => j !== i) } })}
                      className="w-full text-[10px] font-semibold text-on-surface-variant hover:text-error transition-colors" aria-label={`Remove stripe color ${i + 1}`}>× remove</button>
                  )}
                </div>
              ))}
            </div>
            {selected.colorPlan.colors.length < 6 && (
              <button onClick={() => updatePart(selected.id, { colorPlan: { ...selected.colorPlan, colors: [...selected.colorPlan.colors, 'cream'] } })}
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/30 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"><Plus size={12} />Add color</button>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Stripe height</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updatePart(selected.id, { colorPlan: { ...selected.colorPlan, stripeRounds: Math.max(1, (selected.colorPlan.stripeRounds || 2) - 1) } })}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors" aria-label="Fewer rounds per stripe"><Minus size={12} /></button>
                <span className="min-w-[58px] text-center text-xs font-semibold tabular-nums">{selected.colorPlan.stripeRounds || 2} round{(selected.colorPlan.stripeRounds || 2) === 1 ? '' : 's'}</span>
                <button onClick={() => updatePart(selected.id, { colorPlan: { ...selected.colorPlan, stripeRounds: Math.min(10, (selected.colorPlan.stripeRounds || 2) + 1) } })}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors" aria-label="More rounds per stripe"><Plus size={12} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Texture</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[{ id: null, label: 'Plain' }, { id: 'bobble', label: 'Bobble' }, { id: 'popcorn', label: 'Popcorn' }, { id: 'shell', label: 'Shell' }, { id: 'ribbing', label: 'Ribbed' }].map((t) => (
            <button key={t.label} onClick={() => updatePart(selected.id, { texture: t.id || undefined })}
              className={`rounded-lg px-1 py-1.5 text-[10px] font-semibold border transition-colors ${(selected.texture || null) === t.id ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-on-surface-variant">Textures restyle the plain rounds — stitch counts stay verified.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">Make</span>
        <div className="flex items-center gap-2">
          <button onClick={() => updatePart(selected.id, { quantity: Math.max(1, (selected.quantity || 1) - 1) })}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors" aria-label="Make fewer"><Minus size={12} /></button>
          <span className="min-w-[34px] text-center text-xs font-semibold tabular-nums">×{selected.quantity || 1}</span>
          <button onClick={() => updatePart(selected.id, { quantity: Math.min(6, (selected.quantity || 1) + 1) })}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors" aria-label="Make more"><Plus size={12} /></button>
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
    <div className="flex min-h-dvh flex-col bg-surface-dim text-on-surface md:h-dvh md:overflow-hidden">
      <OnboardingCard
        storageKey="loopsy_onboard_build"
        title="Design it in 3 steps"
        steps={[
          { title: 'Start from a creature or add shapes', body: 'pick Teddy/Bunny/etc., or drop in balls, tubes and cones from the left.' },
          { title: 'Shape it by hand', body: 'drag to move, grab the corner handle to resize, right-click for options, and arrows to nudge. ⌘Z undoes anything. Watch the live “Verified math” count respond.' },
          { title: 'Generate', body: 'turn your design into an exact, stitch-by-stitch pattern — the math is computed, never guessed.' },
        ]}
      />
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant/15 bg-surface-container-lowest px-3 md:gap-3 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <Link to="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors" aria-label="Exit editor"><ArrowLeft size={18} /></Link>
          <span className="font-display text-base font-bold hidden sm:block">Loopsy</span>
          <span className="text-outline-variant hidden sm:block">/</span>
          <input value={name} onChange={(e) => { commit('name', 1500); setName(e.target.value); }} aria-label="Design name"
            className="w-full min-w-0 sm:w-56 rounded-md bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:bg-surface-container-low focus:bg-surface-container-low focus:ring-2 focus:ring-primary/30 transition-colors" />
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Build / Draw mode toggle */}
          <div className="flex rounded-full bg-surface-container-low p-0.5">
            <button className="flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1.5 text-xs font-semibold text-on-primary sm:px-3" aria-label="Build 3D mode"><Shapes size={13} /><span className="hidden sm:inline">Build 3D</span></button>
            <button onClick={() => setMode('draw')} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors sm:px-3" aria-label="Draw mode"><Grid3x3 size={13} /><span className="hidden sm:inline">Draw</span></button>
          </div>
          {/* Undo / redo */}
          <div className="flex items-center rounded-full bg-surface-container-low p-0.5">
            <button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" aria-label="Undo"
              className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-35 disabled:hover:bg-transparent"><Undo2 size={15} /></button>
            <button onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" aria-label="Redo"
              className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-35 disabled:hover:bg-transparent"><Redo2 size={15} /></button>
          </div>
          {/* Keyboard shortcuts */}
          <div className="relative hidden sm:block">
            <button onClick={() => setShortcutsOpen((o) => !o)} title="Keyboard shortcuts" aria-label="Keyboard shortcuts"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${shortcutsOpen ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}><Keyboard size={16} /></button>
            <ShortcutsHint open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
            {shareUrl && <CopyLinkDialog url={shareUrl} title="Share this design" onClose={() => setShareUrl(null)} />}
          </div>
          <Link to="/designs" title="My designs" aria-label="My designs"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors">
            <FolderOpen size={16} />
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-3 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50">
            <Save size={14} /><span className="hidden sm:inline">{saving ? 'Saving…' : designId ? 'Save' : 'Save design'}</span>
          </button>
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
          <div className="p-3 md:flex-1 md:overflow-y-auto">
            {tab === 'elements' ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Start from a creature</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BUILD_TEMPLATES.map((t) => (
                      <button key={t.id} onClick={() => applyTemplate(t)}
                        className="rounded-lg border border-outline-variant/20 px-2 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-low hover:text-on-surface transition-colors">
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-outline-variant/15 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Add a shape</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SHAPE_KIT.map((def) => (
                      <Motion.button key={def.id} whileTap={{ scale: 0.95 }} transition={SPRING.snappy} onClick={() => addShape(def)}
                        className="flex flex-col items-start gap-0.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-3 text-left hover:border-primary/40 hover:bg-surface-container-low transition-colors">
                        <span className="flex items-center gap-1.5 text-sm font-semibold"><Plus size={13} className="text-primary" />{def.label}</span>
                        <span className="text-[11px] text-on-surface-variant leading-tight">{def.hint}</span>
                      </Motion.button>
                    ))}
                  </div>
                </div>
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

                <div className="border-t border-outline-variant/15 pt-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Assembly</p>
                    {assemblyEdited && (
                      <button onClick={resetAssembly} className="text-[10px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Reset to auto</button>
                    )}
                  </div>
                  {!assemblyEdited && (
                    <p className="mb-2 text-[10px] text-on-surface-variant">Auto-derived from your layout. Edit any step to take over.</p>
                  )}
                  <div className="space-y-1.5">
                    {effectiveAssembly.map((step, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <textarea
                          rows={1}
                          value={step}
                          onChange={(e) => beginAssemblyEdit((steps) => steps.map((s, j) => (j === i ? e.target.value : s)), `asm:${i}`)}
                          className="min-h-[34px] flex-1 resize-none rounded-lg bg-surface-container-low px-2 py-1.5 text-[11px] leading-snug outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <button onClick={() => beginAssemblyEdit((steps) => steps.filter((_, j) => j !== i))}
                            className="flex h-4 w-5 items-center justify-center rounded text-on-surface-variant hover:text-error transition-colors" aria-label="Remove step"><Minus size={11} /></button>
                          <button onClick={() => beginAssemblyEdit((steps) => { if (i <= 0) return steps; const n = [...steps]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}
                            className="flex h-4 w-5 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-30" disabled={i === 0} aria-label="Move up"><ChevronUp size={11} /></button>
                          <button onClick={() => beginAssemblyEdit((steps) => { if (i >= steps.length - 1) return steps; const n = [...steps]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}
                            className="flex h-4 w-5 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-30" disabled={i === effectiveAssembly.length - 1} aria-label="Move down"><ChevronDown size={11} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => beginAssemblyEdit((steps) => [...steps, ''])}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-outline-variant/30 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"><Plus size={12} />Add step</button>
                </div>

                <div className="border-t border-outline-variant/15 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Embellishments</p>
                  <p className="mb-2 text-[10px] text-on-surface-variant">Hand-finished touches, e.g. “Embroider a smile in black”.</p>
                  <div className="space-y-1.5">
                    {embellishments.map((e) => (
                      <div key={e.id} className="flex items-start gap-1">
                        <input
                          value={e.text}
                          onChange={(ev) => editEmbellishment(e.id, ev.target.value)}
                          placeholder="Add a finishing touch…"
                          className="flex-1 rounded-lg bg-surface-container-low px-2 py-1.5 text-[11px] leading-snug outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button onClick={() => removeEmbellishment(e.id)}
                          className="flex h-[30px] w-5 shrink-0 items-center justify-center rounded text-on-surface-variant hover:text-error transition-colors" aria-label="Remove embellishment"><Minus size={11} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addEmbellishment}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-outline-variant/30 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"><Plus size={12} />Add embellishment</button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center desk + artboard */}
        <div ref={artboardRef} className="relative flex min-h-[60vh] flex-1 items-center justify-center overflow-auto p-4 md:min-h-0 md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,_color-mix(in_srgb,var(--on-surface)_8%,transparent)_1px,transparent_1px)] [background-size:24px_24px]" />
          <Motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ transform: `scale(${view === '3d' ? 1 : zoom})` }}
            className="relative origin-center transition-transform"
          >
            <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-warm-xl ring-1 ring-outline-variant/10">
              <div className="relative aspect-[360/460] h-[min(52vh,420px)] sm:h-[min(72vh,560px)] bg-gradient-to-b from-surface-container-low to-surface-container">
                <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-yarn-periwinkle/15 blur-3xl blob-drift" />
                {view === '3d' ? (
                  <Suspense fallback={<div className="grid h-full place-items-center"><ThreadSpinner size={56} /></div>}>
                    <Design3DPreview parts={parts} />
                  </Suspense>
                ) : (
                  <CanvasStage parts={parts} selectedId={selectedId} onSelect={setSelectedId} onMove={movePart} onSculpt={updateSculpt} onResize={resizePart} onInteractionStart={commit} onPartContextMenu={openPartMenu} />
                )}
              </div>
            </div>
          </Motion.div>

          {/* 2D / 3D view switch */}
          <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-surface-container-lowest/90 p-0.5 shadow-warm backdrop-blur">
            <button onClick={() => setView('2d')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === '2d' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><Square size={13} />2D</button>
            <button onClick={() => setView('3d')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === '3d' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><Box size={13} />3D</button>
          </div>
          {/* Live verified-math readout — surfaces the moat while designing */}
          {parts.length > 0 && (
            <div className="absolute top-16 left-1/2 z-10 -translate-x-1/2">
              {preview?.ok ? (
                <div className="flex items-center gap-2 rounded-full bg-surface-container-lowest/90 px-3.5 py-1.5 text-xs font-semibold shadow-warm backdrop-blur">
                  <span className="inline-flex items-center gap-1 text-secondary"><BadgeCheck size={14} />Verified math</span>
                  <span className="text-on-surface-variant">·</span>
                  <span className="text-on-surface">≈ {preview.peakStitches} sts · {preview.finishedSize?.replace(/\s*\(.*/, '')}</span>
                </div>
              ) : preview && !preview.ok ? (
                <div className="rounded-full bg-tertiary-container/80 px-3.5 py-1.5 text-xs font-medium text-on-tertiary-container shadow-warm backdrop-blur">
                  Keep going — this shape isn't compilable yet
                </div>
              ) : null}
            </div>
          )}

          {view === '3d' && (
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-container-lowest/90 px-3 py-1.5 text-xs font-medium text-on-surface-variant shadow-warm backdrop-blur">
              <Rotate3d size={13} className="text-primary" />Drag to rotate · scroll to zoom
            </div>
          )}

          {/* Zoom control (2D only) */}
          {view === '2d' && (
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface-container-lowest/90 px-2 py-1 shadow-warm backdrop-blur">
              <button onClick={() => setZoom((z) => Math.max(0.5, round1(z - 0.1)))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors" aria-label="Zoom out"><Minus size={14} /></button>
              <button onClick={() => setZoom(1)} className="min-w-[44px] text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom((z) => Math.min(2, round1(z + 0.1)))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors" aria-label="Zoom in"><Plus size={14} /></button>
            </div>
          )}
        </div>

        {/* Right inspector */}
        <aside className="shrink-0 border-t md:border-t-0 md:border-l border-outline-variant/15 bg-surface-container-lowest md:w-72 md:overflow-y-auto">
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

      {/* Right-click context menu on a part */}
      {ctxMenu && (
        <div
          role="menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          className="fixed z-50 min-w-[160px] overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-1 shadow-warm-xl"
        >
          <button role="menuitem" onClick={() => { duplicatePart(ctxMenu.partId); setCtxMenu(null); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"><Copy size={14} className="text-on-surface-variant" />Duplicate</button>
          <button role="menuitem" onClick={() => { reorder(ctxMenu.partId, 1); setCtxMenu(null); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"><ChevronUp size={14} className="text-on-surface-variant" />Bring forward</button>
          <button role="menuitem" onClick={() => { reorder(ctxMenu.partId, -1); setCtxMenu(null); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"><ChevronDown size={14} className="text-on-surface-variant" />Send back</button>
          <div className="my-1 h-px bg-outline-variant/15" />
          <button role="menuitem" onClick={() => { deletePart(ctxMenu.partId); setCtxMenu(null); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-error hover:bg-error-container/40 transition-colors"><Trash2 size={14} />Delete</button>
        </div>
      )}
    </div>
  );
}
