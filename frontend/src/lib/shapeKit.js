// Primitive shapes a maker can drop on the Design Canvas. Each maps to a
// compiler shape, so any arrangement still compiles to verified stitch counts.

// Default silhouette for the Sculpt tool — a friendly gnome/egg the maker
// reshapes by dragging the points on the canvas.
export const DEFAULT_PROFILE = [
  { t: 0, r: 0.6 }, { t: 0.25, r: 2.6 }, { t: 0.55, r: 3 }, { t: 0.8, r: 2 }, { t: 1, r: 0.6 },
];

export const SHAPE_KIT = [
  { id: 'sculpt', label: 'Sculpt', shape: 'revolve', hint: 'draw ANY silhouette', dims: { heightCm: 9, profile: DEFAULT_PROFILE.map((p) => ({ ...p })) }, fields: ['heightCm'] },
  { id: 'ball',  label: 'Ball',  shape: 'sphere',     hint: 'heads, berries, snowballs', dims: { diameterCm: 6 },                  fields: ['diameterCm'] },
  { id: 'egg',   label: 'Egg',   shape: 'ellipsoid',  hint: 'bodies, eggs',              dims: { diameterCm: 6, heightCm: 8 },     fields: ['diameterCm', 'heightCm'] },
  { id: 'tube',  label: 'Tube',  shape: 'tube',       hint: 'arms, legs, necks, stems',  dims: { diameterCm: 3, heightCm: 6 },     fields: ['diameterCm', 'heightCm'] },
  { id: 'cone',  label: 'Cone',  shape: 'cone',       hint: 'ears, beaks, hats, horns',  dims: { baseDiameterCm: 4, heightCm: 5 }, fields: ['baseDiameterCm', 'heightCm'] },
  { id: 'bowl',  label: 'Dome',  shape: 'hemisphere', hint: 'shells, caps, cups',        dims: { diameterCm: 6 },                  fields: ['diameterCm'] },
  { id: 'panel', label: 'Panel', shape: 'flatPanel',  hint: 'wings, leaves, scarves',    dims: { widthCm: 4, heightCm: 5 },        fields: ['widthCm', 'heightCm'] },
  // E1 flat motifs + tapered forms
  { id: 'taper', label: 'Taper', shape: 'taperedTube', hint: 'limbs, horns, planters',   dims: { bottomDiameterCm: 4, topDiameterCm: 2, heightCm: 6 }, fields: ['bottomDiameterCm', 'topDiameterCm', 'heightCm'] },
  { id: 'disc',  label: 'Disc',  shape: 'flatCircle',  hint: 'coasters, bases, cheeks',  dims: { diameterCm: 8 },                  fields: ['diameterCm'] },
  { id: 'hex',   label: 'Hex',   shape: 'flatHexagon', hint: 'trivets, motifs',          dims: { diameterCm: 10 },                 fields: ['diameterCm'] },
  { id: 'tri',   label: 'Triangle', shape: 'triangle', hint: 'bunting, kerchiefs',       dims: { baseCm: 8 },                      fields: ['baseCm'] },
  { id: 'star',  label: 'Star',  shape: 'star',        hint: 'ornaments, appliqués',     dims: { sizeCm: 8 },                      fields: ['sizeCm'] },
  { id: 'heart', label: 'Heart', shape: 'heart',       hint: 'appliqués, garlands',      dims: { widthCm: 7 },                     fields: ['widthCm'] },
  // E2 continuous construction
  { id: 'legs',  label: 'Legs+Body', shape: 'splitLimbBody', hint: 'legs that flow into the body — no sewing', dims: { limbDiameterCm: 3, limbHeightCm: 5, bodyDiameterCm: 8, bodyHeightCm: 7 }, fields: ['limbDiameterCm', 'limbHeightCm', 'bodyDiameterCm', 'bodyHeightCm'] },
];

// Y of a profile point (t∈[0,1], 0 = bottom) for a revolve part centered at cy.
export function profileY(t, cy, heightPx) {
  return cy + heightPx / 2 - t * heightPx;
}

// Build the mirrored silhouette path for a revolve part.
export function revolvePath(part, px) {
  const d = part.dims || part.dimensions || {};
  const prof = [...(d.profile || [])].sort((a, b) => a.t - b.t);
  if (prof.length < 2) return '';
  const H = (d.heightCm || 8) * px;
  const cx = part.x, cy = part.y;
  const right = prof.map((p) => `${(cx + p.r * px).toFixed(1)},${profileY(p.t, cy, H).toFixed(1)}`);
  const left = [...prof].reverse().map((p) => `${(cx - p.r * px).toFixed(1)},${profileY(p.t, cy, H).toFixed(1)}`);
  return `M ${right.join(' L ')} L ${left.join(' L ')} Z`;
}

export const DIM_LABEL = {
  diameterCm: 'Diameter',
  heightCm: 'Height',
  widthCm: 'Width',
  baseDiameterCm: 'Base width',
  bottomDiameterCm: 'Bottom width',
  topDiameterCm: 'Top width',
  baseCm: 'Base',
  sizeCm: 'Size',
  limbDiameterCm: 'Leg width',
  limbHeightCm: 'Leg height',
  bodyDiameterCm: 'Body width',
  bodyHeightCm: 'Body height',
};

export const shapeDef = (shape) => SHAPE_KIT.find((s) => s.shape === shape);

// SVG geometry for a part centered at (x, y), sized by its cm dims × px/cm.
// Returned as an element descriptor the renderer turns into JSX, so the canvas
// editor and the read-only share view stay identical.
export function partGeometry(part, px) {
  const d = part.dims || part.dimensions || {};
  const { x, y } = part;
  switch (part.shape) {
    case 'sphere':
      return { type: 'circle', cx: x, cy: y, r: (d.diameterCm || 6) / 2 * px };
    case 'ellipsoid':
      return { type: 'ellipse', cx: x, cy: y, rx: (d.diameterCm || 6) / 2 * px, ry: (d.heightCm || 8) / 2 * px };
    case 'hemisphere': {
      const r = (d.diameterCm || 6) / 2 * px;
      return { type: 'path', d: `M ${x - r},${y + r * 0.4} A ${r} ${r} 0 0 1 ${x + r},${y + r * 0.4} Z` };
    }
    case 'tube': {
      const w = (d.diameterCm || 3) * px, h = (d.heightCm || 6) * px;
      return { type: 'rect', x: x - w / 2, y: y - h / 2, width: w, height: h, rx: w / 2 };
    }
    case 'cone': {
      const w = (d.baseDiameterCm || 4) * px, h = (d.heightCm || 5) * px;
      return { type: 'polygon', points: `${x},${y - h / 2} ${x + w / 2},${y + h / 2} ${x - w / 2},${y + h / 2}` };
    }
    case 'flatPanel': {
      const w = (d.widthCm || 4) * px, h = (d.heightCm || 5) * px;
      return { type: 'rect', x: x - w / 2, y: y - h / 2, width: w, height: h, rx: Math.min(w, h) * 0.18 };
    }
    case 'revolve':
      return { type: 'path', d: revolvePath(part, px) };
    case 'taperedTube': {
      const bw = (d.bottomDiameterCm || 4) * px, tw = (d.topDiameterCm || 2) * px, h = (d.heightCm || 6) * px;
      return { type: 'polygon', points: `${x - tw / 2},${y - h / 2} ${x + tw / 2},${y - h / 2} ${x + bw / 2},${y + h / 2} ${x - bw / 2},${y + h / 2}` };
    }
    case 'flatCircle':
      return { type: 'circle', cx: x, cy: y, r: (d.diameterCm || 8) / 2 * px };
    case 'flatHexagon': {
      const r = (d.diameterCm || 10) / 2 * px;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
      });
      return { type: 'polygon', points: pts.join(' ') };
    }
    case 'triangle': {
      const b = (d.baseCm || 8) * px, h = b * 0.9;
      return { type: 'polygon', points: `${x},${y - h / 2} ${x + b / 2},${y + h / 2} ${x - b / 2},${y + h / 2}` };
    }
    case 'star': {
      const R = (d.sizeCm || 8) / 2 * px, r = R * 0.45;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? R : r;
        return `${(x + rad * Math.cos(a)).toFixed(1)},${(y + rad * Math.sin(a)).toFixed(1)}`;
      });
      return { type: 'polygon', points: pts.join(' ') };
    }
    case 'heart': {
      const w = (d.widthCm || 7) * px, h = w * 0.95;
      const top = y - h * 0.3, bottom = y + h / 2;
      return {
        type: 'path',
        d: `M ${x},${bottom} C ${x - w * 0.55},${y} ${x - w * 0.5},${top - h * 0.25} ${x},${top} C ${x + w * 0.5},${top - h * 0.25} ${x + w * 0.55},${y} ${x},${bottom} Z`,
      };
    }
    case 'splitLimbBody': {
      // Body ellipse over two leg stubs — reads as "legs flow into body".
      const bw = (d.bodyDiameterCm || 8) * px, bh = (d.bodyHeightCm || 7) * px;
      const lw = (d.limbDiameterCm || 3) * px, lh = (d.limbHeightCm || 5) * px;
      const legY = y + bh / 2, legXOff = Math.min(bw / 2 - lw / 2, lw * 0.9);
      const leg = (cx) => `M ${cx - lw / 2},${legY - lh * 0.15} L ${cx - lw / 2},${legY + lh - lw / 2} A ${lw / 2} ${lw / 2} 0 0 0 ${cx + lw / 2},${legY + lh - lw / 2} L ${cx + lw / 2},${legY - lh * 0.15} Z`;
      return {
        type: 'path',
        d: `M ${x - bw / 2},${y} A ${bw / 2} ${bh / 2} 0 1 1 ${x + bw / 2},${y} A ${bw / 2} ${bh / 2} 0 1 1 ${x - bw / 2},${y} Z ${leg(x - legXOff)} ${leg(x + legXOff)}`,
      };
    }
    default:
      return { type: 'circle', cx: x, cy: y, r: 18 };
  }
}

// Axis-aligned bounding box for a part (for selection outline + eye placement).
export function partBBox(part, px) {
  const d = part.dims || part.dimensions || {};
  const { x, y } = part;
  switch (part.shape) {
    case 'sphere': { const r = (d.diameterCm || 6) / 2 * px; return { x: x - r, y: y - r, w: 2 * r, h: 2 * r }; }
    case 'hemisphere': { const r = (d.diameterCm || 6) / 2 * px; return { x: x - r, y: y - r * 0.6, w: 2 * r, h: r * 1.4 }; }
    case 'ellipsoid': { const rx = (d.diameterCm || 6) / 2 * px, ry = (d.heightCm || 8) / 2 * px; return { x: x - rx, y: y - ry, w: 2 * rx, h: 2 * ry }; }
    case 'tube': { const w = (d.diameterCm || 3) * px, h = (d.heightCm || 6) * px; return { x: x - w / 2, y: y - h / 2, w, h }; }
    case 'cone': { const w = (d.baseDiameterCm || 4) * px, h = (d.heightCm || 5) * px; return { x: x - w / 2, y: y - h / 2, w, h }; }
    case 'flatPanel': { const w = (d.widthCm || 4) * px, h = (d.heightCm || 5) * px; return { x: x - w / 2, y: y - h / 2, w, h }; }
    case 'revolve': {
      const maxR = Math.max(0.5, ...((d.profile || []).map((p) => p.r)));
      const w = maxR * 2 * px, h = (d.heightCm || 8) * px;
      return { x: x - w / 2, y: y - h / 2, w, h };
    }
    case 'taperedTube': {
      const w = Math.max(d.bottomDiameterCm || 4, d.topDiameterCm || 2) * px, h = (d.heightCm || 6) * px;
      return { x: x - w / 2, y: y - h / 2, w, h };
    }
    case 'flatCircle': { const r = (d.diameterCm || 8) / 2 * px; return { x: x - r, y: y - r, w: 2 * r, h: 2 * r }; }
    case 'flatHexagon': { const r = (d.diameterCm || 10) / 2 * px; return { x: x - r, y: y - r, w: 2 * r, h: 2 * r }; }
    case 'triangle': { const b = (d.baseCm || 8) * px, h = b * 0.9; return { x: x - b / 2, y: y - h / 2, w: b, h }; }
    case 'star': { const R = (d.sizeCm || 8) / 2 * px; return { x: x - R, y: y - R, w: 2 * R, h: 2 * R }; }
    case 'heart': { const w = (d.widthCm || 7) * px, h = w * 0.95; return { x: x - w / 2, y: y - h * 0.55, w, h: h * 1.05 }; }
    case 'splitLimbBody': {
      const bw = (d.bodyDiameterCm || 8) * px, bh = (d.bodyHeightCm || 7) * px, lh = (d.limbHeightCm || 5) * px;
      return { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh + lh };
    }
    default: return { x: x - 18, y: y - 18, w: 36, h: 36 };
  }
}
