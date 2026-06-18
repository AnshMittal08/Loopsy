// Assembly-from-layout algorithm (M4). Given the parts a maker placed on the
// canvas (each with a position and size), derive plain-English assembly steps:
// which part attaches to which, and where. The stitch MATH stays with the M2
// engine — this only produces the "sew it together" prose, computed from the
// actual geometry rather than guessed.
//
// Approach:
//   1. Anchor = the largest part (usually the body/base).
//   2. Grow a nearest-neighbor tree (Prim-like): every other part attaches to
//      the closest already-placed part.
//   3. For each attachment, translate the relative position into a location
//      phrase ("upper left", "top", "left side") and a cm gap from center.
//   4. Pairs (quantity > 1) get symmetric language.

export const CANVAS = { w: 360, h: 460, px: 7 }; // px per cm — shared by renderers

function radiusPx(p) {
  const d = p.dims || p.dimensions || {};
  const px = CANVAS.px;
  switch (p.shape) {
    case 'sphere':
    case 'hemisphere': return ((d.diameterCm || 4) / 2) * px;
    case 'ellipsoid': return (Math.max(d.diameterCm || 4, d.heightCm || 4) / 2) * px;
    case 'tube': return (Math.max(d.diameterCm || 3, d.heightCm || 5) / 2) * px;
    case 'cone': return (Math.max(d.baseDiameterCm || 4, d.heightCm || 5) / 2) * px;
    case 'flatPanel': return (Math.max(d.widthCm || 4, d.heightCm || 5) / 2) * px;
    case 'revolve': return (Math.max(d.heightCm || 8, ...((d.profile || []).map((p) => p.r * 2))) / 2) * px;
    default: return 4 * px;
  }
}
const area = (p) => radiusPx(p) ** 2;

function locationPhrase(child, parent) {
  const dx = child.x - parent.x;
  const dy = child.y - parent.y; // canvas y grows downward
  const r = radiusPx(parent);
  const v = dy < -0.25 * r ? 'top' : dy > 0.25 * r ? 'bottom' : 'middle';
  const h = dx < -0.25 * r ? 'left' : dx > 0.25 * r ? 'right' : 'center';
  if (v === 'middle' && h === 'center') return 'center';
  if (v === 'middle') return `${h} side`;
  if (h === 'center') return v;
  return `${v === 'top' ? 'upper' : 'lower'} ${h}`;
}

export function deriveAssembly(parts) {
  const ps = (parts || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (ps.length <= 1) return [];

  let anchor = ps[0];
  for (const p of ps) if (area(p) > area(anchor)) anchor = p;

  const placed = new Map([[anchor.id, anchor]]);
  const remaining = ps.filter((p) => p.id !== anchor.id);
  const order = [];
  while (remaining.length) {
    let best = null;
    remaining.forEach((c, i) => {
      for (const parent of placed.values()) {
        const dist = Math.hypot(c.x - parent.x, c.y - parent.y);
        if (!best || dist < best.dist) best = { i, parent, child: c, dist };
      }
    });
    order.push(best);
    placed.set(best.child.id, best.child);
    remaining.splice(best.i, 1);
  }

  const steps = [`Start with the ${anchor.name} as the base.`];
  for (const { child, parent, dist } of order) {
    const loc = locationPhrase(child, parent);
    const gapCm = Math.max(0, Math.round((dist - radiusPx(parent)) / CANVAS.px));
    const where = gapCm <= 0
      ? `directly onto the ${loc} of the ${parent.name}`
      : `to the ${loc} of the ${parent.name}, about ${gapCm} cm from its center`;
    const plural = /s$/i.test(child.name) ? child.name : `${child.name}s`;
    steps.push((child.quantity || 1) > 1
      ? `Attach the ${child.quantity} ${plural} symmetrically ${where}.`
      : `Sew the ${child.name} ${where}.`);
  }
  steps.push('Stuff each rounded piece firmly before closing, then weave in all ends.');
  return steps;
}
