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
  'hemisphere',
  'tube',
  'cone',
  'flatPanel',
  'hatCrown',
  'grannySquare',
];

const SUPPORTED_STITCHES = ['sc', 'hdc', 'dc'];

const REQUIRED_DIMENSIONS = {
  sphere: ['diameterCm'],
  hemisphere: ['diameterCm'],
  tube: [], // diameterCm or circumferenceCm + heightCm (checked specially)
  cone: ['baseDiameterCm', 'heightCm'],
  flatPanel: ['widthCm', 'heightCm'],
  hatCrown: [], // size keyword, defaulted
  grannySquare: [], // sideCm or rounds, defaulted
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
    parts: parts.map((part, index) => ({
      name: String(part.name || `Part ${index + 1}`).slice(0, 60),
      shape: String(part.shape || ''),
      dimensions: part.dimensions && typeof part.dimensions === 'object' ? part.dimensions : {},
      color: part.color ? String(part.color) : null,
      stitch: SUPPORTED_STITCHES.includes(part.stitch) ? part.stitch : null,
      quantity: Math.max(1, Math.min(12, Number(part.quantity) || 1)),
    })),
    assembly: Array.isArray(raw.assembly) ? raw.assembly.map(String) : [],
    embellishments: Array.isArray(raw.embellishments) ? raw.embellishments.map(String) : [],
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
  };
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
  normalizeDesignSpec,
  validateDesignSpec,
};
