// Primitive shapes a maker can drop on the Design Canvas. Each maps to a
// compiler shape, so any arrangement still compiles to verified stitch counts.

export const SHAPE_KIT = [
  { id: 'ball',  label: 'Ball',  shape: 'sphere',     hint: 'heads, berries, snowballs', dims: { diameterCm: 6 },                  fields: ['diameterCm'] },
  { id: 'egg',   label: 'Egg',   shape: 'ellipsoid',  hint: 'bodies, eggs',              dims: { diameterCm: 6, heightCm: 8 },     fields: ['diameterCm', 'heightCm'] },
  { id: 'tube',  label: 'Tube',  shape: 'tube',       hint: 'arms, legs, necks, stems',  dims: { diameterCm: 3, heightCm: 6 },     fields: ['diameterCm', 'heightCm'] },
  { id: 'cone',  label: 'Cone',  shape: 'cone',       hint: 'ears, beaks, hats, horns',  dims: { baseDiameterCm: 4, heightCm: 5 }, fields: ['baseDiameterCm', 'heightCm'] },
  { id: 'bowl',  label: 'Dome',  shape: 'hemisphere', hint: 'shells, caps, cups',        dims: { diameterCm: 6 },                  fields: ['diameterCm'] },
  { id: 'panel', label: 'Panel', shape: 'flatPanel',  hint: 'wings, leaves, scarves',    dims: { widthCm: 4, heightCm: 5 },        fields: ['widthCm', 'heightCm'] },
];

export const DIM_LABEL = {
  diameterCm: 'Diameter',
  heightCm: 'Height',
  widthCm: 'Width',
  baseDiameterCm: 'Base width',
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
    default:
      return { type: 'circle', cx: x, cy: y, r: 18 };
  }
}
