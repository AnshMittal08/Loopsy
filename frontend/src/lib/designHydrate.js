import { CANVAS } from './assembly';

// Rehydrate canvas part state from a persisted Design Spec (the inverse of
// Design.jsx's buildSpec). Used when reopening a saved design for editing and
// when restoring an autosaved draft.

export const DRAFT_KEY = 'loopsy:design:draft';

let uid = 0;
const nextId = () => `h${Date.now()}_${uid++}`;

/** Spec parts → canvas part state (ids regenerated; layout falls back to a stagger). */
export function partsFromSpec(spec) {
  const parts = Array.isArray(spec?.parts) ? spec.parts : [];
  return parts.map((p, i) => ({
    id: nextId(),
    name: p.name || `Part ${i + 1}`,
    shape: p.shape,
    dims: { ...(p.dimensions || {}) },
    color: p.color || 'coral',
    quantity: p.quantity || 1,
    stitch: p.stitch || 'sc',
    x: Number.isFinite(Number(p.layout?.x)) ? Number(p.layout.x) : CANVAS.w / 2 + ((i % 5) - 2) * 18,
    y: Number.isFinite(Number(p.layout?.y)) ? Number(p.layout.y) : 90 + (i % 4) * 22,
    ...(p.face ? { face: true } : {}),
    ...(p.colorPlan ? { colorPlan: p.colorPlan } : {}),
  }));
}

export function readDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return d && Array.isArray(d.parts) ? d : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, at: Date.now() })); } catch { /* storage full/blocked */ }
}
