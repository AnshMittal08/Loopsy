// ---------------------------------------------------------------------------
// Design Spec — the JSON contract between every front door (text prompt,
// photo analysis, design canvas) and the pattern compiler.
//
// {
//   name: "Bee Amigurumi",
//   category: "Amigurumi",
//   yarnWeight: "DK",
//   parts: [
//     { name: "Head", shape: "sphere", dimensions: { diameterCm: 6 },
//       color: "yellow", stitch: "sc", quantity: 1 }
//   ],
//   assembly: ["Sew the head to the body…"],
//   embellishments: ["Embroider a smile with black yarn"],
//   notes: ["…"]
// }
// ---------------------------------------------------------------------------

const SUPPORTED_SHAPES = [
  'sphere',
  'ellipsoid',
  'hemisphere',
  'tube',
  'cone',
  'flatPanel',
  'hatCrown',
  'grannySquare',
  'revolve',
  // E1 expansion — flat motifs + tapered forms
  'flatCircle',
  'flatHexagon',
  'taperedTube',
  'triangle',
  'star',
  'heart',
  // E2 expansion — continuous split-limb construction
  'splitLimbBody',
  // E3 expansion — sized garments
  'raglanSweater',
  'sock',
  'mitten',
];

const SUPPORTED_STITCHES = ['sc', 'hdc', 'dc'];

// E2 — count-neutral stitch textures a part may carry.
const SUPPORTED_TEXTURES = ['bobble', 'popcorn', 'shell', 'ribbing'];

const REQUIRED_DIMENSIONS = {
  sphere: ['diameterCm'],
  ellipsoid: ['diameterCm', 'heightCm'],
  hemisphere: ['diameterCm'],
  tube: [], // diameterCm or circumferenceCm + heightCm (checked specially)
  cone: ['baseDiameterCm', 'heightCm'],
  flatPanel: ['widthCm', 'heightCm'],
  hatCrown: [], // size keyword, defaulted
  grannySquare: [], // sideCm or rounds, defaulted
  revolve: ['heightCm'], // plus a profile array (validated specially)
  flatCircle: ['diameterCm'],
  flatHexagon: ['diameterCm'],
  taperedTube: ['bottomDiameterCm', 'topDiameterCm', 'heightCm'],
  triangle: ['baseCm'],
  star: ['sizeCm'],
  heart: ['widthCm'],
  splitLimbBody: ['limbDiameterCm', 'limbHeightCm', 'bodyDiameterCm', 'bodyHeightCm'],
  raglanSweater: [], // size keyword, defaulted
  sock: [], // size keyword, defaulted
  mitten: [], // size keyword, defaulted
};

/**
 * Normalize a raw spec (from Claude or the canvas) into a canonical shape.
 * Unknown fields are dropped; defaults are filled in.
 */
function normalizeDesignSpec(raw = {}) {
  const parts = Array.isArray(raw.parts) ? raw.parts : [];
  return {
    name: String(raw.name || 'Custom Design').slice(0, 120),
    category: String(raw.category || 'Custom'),
    yarnWeight: String(raw.yarnWeight || 'Worsted'),
    parts: parts.map((part, index) => {
      const normalized = {
        name: String(part.name || `Part ${index + 1}`).slice(0, 60),
        shape: String(part.shape || ''),
        dimensions: part.dimensions && typeof part.dimensions === 'object' ? part.dimensions : {},
        color: part.color ? String(part.color) : null,
        stitch: SUPPORTED_STITCHES.includes(part.stitch) ? part.stitch : null,
        // Count-neutral surface texture; invalid values degrade to plain fabric.
        texture: SUPPORTED_TEXTURES.includes(part.texture) ? part.texture : null,
        quantity: Math.max(1, Math.min(12, Number(part.quantity) || 1)),
      };
      // Optional stripe plan: cycle `colors` every `stripeRounds` rounds. Colors
      // only annotate which yarn each round uses — they never change the stitch
      // arithmetic, so the validator moat is unaffected. Dropped if malformed.
      const plan = normalizeColorPlan(part.colorPlan);
      if (plan) normalized.colorPlan = plan;
      // Preserve canvas layout (x, y) when present — the compiler ignores it,
      // but designs persist it so the preview and share card place parts where
      // the maker put them.
      const l = part.layout;
      if (l && Number.isFinite(Number(l.x)) && Number.isFinite(Number(l.y))) {
        normalized.layout = { x: Number(l.x), y: Number(l.y) };
      }
      if (part.face === true) normalized.face = true;
      return normalized;
    }),
    // Optional measured swatch: { stsPer10Cm, rowsPer10Cm } — the engine
    // re-scales every count to the maker's real tension. Dropped if malformed.
    gauge: normalizeCustomGauge(raw.gauge),
    assembly: Array.isArray(raw.assembly) ? raw.assembly.map(String) : [],
    embellishments: Array.isArray(raw.embellishments) ? raw.embellishments.map(String) : [],
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
  };
}

/**
 * Normalize an optional stripe plan. Returns null if absent/malformed (so a bad
 * plan simply degrades to the part's solid `color`, never breaks compilation).
 * @returns {{ colors: string[], stripeRounds: number } | null}
 */
function normalizeColorPlan(plan) {
  if (!plan || typeof plan !== 'object') return null;
  const colors = Array.isArray(plan.colors)
    ? plan.colors.map((c) => (c == null ? '' : String(c))).filter(Boolean).slice(0, 6)
    : [];
  if (colors.length < 2) return null; // a single colour isn't a stripe
  const stripeRounds = Math.max(1, Math.min(50, Math.round(Number(plan.stripeRounds) || 1)));
  return { colors, stripeRounds };
}

/** Normalize an optional measured swatch; null when absent or malformed. */
function normalizeCustomGauge(g) {
  if (!g || typeof g !== 'object') return null;
  const sts = Number(g.stsPer10Cm);
  const rows = Number(g.rowsPer10Cm);
  const out = {};
  if (Number.isFinite(sts) && sts >= 4 && sts <= 60) out.stsPer10Cm = sts;
  if (Number.isFinite(rows) && rows >= 4 && rows <= 70) out.rowsPer10Cm = rows;
  return Object.keys(out).length ? out : null;
}

/**
 * Validate a normalized spec against the compiler's vocabulary.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDesignSpec(spec) {
  const errors = [];

  if (!spec.parts.length) {
    errors.push('Spec has no parts.');
  }

  for (const part of spec.parts) {
    if (!SUPPORTED_SHAPES.includes(part.shape)) {
      errors.push(`Part "${part.name}": shape "${part.shape}" is not in the compiler vocabulary.`);
      continue;
    }
    for (const dim of REQUIRED_DIMENSIONS[part.shape]) {
      const value = Number(part.dimensions[dim]);
      if (!Number.isFinite(value) || value <= 0) {
        errors.push(`Part "${part.name}" (${part.shape}): missing or invalid dimension "${dim}".`);
      }
    }
    if (part.shape === 'tube') {
      const d = Number(part.dimensions.diameterCm);
      const c = Number(part.dimensions.circumferenceCm);
      const h = Number(part.dimensions.heightCm);
      if (!((d > 0 || c > 0) && h > 0)) {
        errors.push(`Part "${part.name}" (tube): needs heightCm plus diameterCm or circumferenceCm.`);
      }
    }
    // Sanity bounds: nothing under 1cm or over 200cm.
    for (const [key, rawValue] of Object.entries(part.dimensions)) {
      const value = Number(rawValue);
      if (Number.isFinite(value) && (value < 0.5 || value > 200)) {
        errors.push(`Part "${part.name}": dimension ${key}=${value}cm is out of the supported 0.5–200cm range.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  SUPPORTED_SHAPES,
  SUPPORTED_STITCHES,
  SUPPORTED_TEXTURES,
  normalizeDesignSpec,
  normalizeColorPlan,
  validateDesignSpec,
};
