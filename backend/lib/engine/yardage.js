// ---------------------------------------------------------------------------
// Yardage estimation — how much yarn a pattern actually needs.
//
// Same philosophy as the rest of the engine: computed from the stitch counts
// the generators emit, never guessed by an LLM. The per-stitch model is
// calibrated to published consumption tables (worsted sc ≈ 5 cm of yarn at
// standard tension) and scales with the gauge, so finer yarn = less per
// stitch, tighter amigurumi gauge = proportionally less.
//
// Estimates are labelled "about" and carry a 15% buffer for tails, tension
// variance and weaving in ends — honest numbers a maker can shop with.
// ---------------------------------------------------------------------------

// Yarn length per single crochet ≈ factor × stitch width (1/stsPerCm).
// Calibration: worsted standard gauge is 1.8 sts/cm → width 0.56 cm →
// 9 × 0.56 ≈ 5 cm per sc, matching published estimates.
const SC_LENGTH_FACTOR = 9;

// Taller stitches consume more yarn each (but fewer per cm of fabric).
const STITCH_YARN_FACTOR = { sc: 1.0, hdc: 1.35, dc: 1.75 };

// A chain is much shorter than a worked stitch.
const CHAIN_FACTOR = 0.6;

// Count-neutral textures still consume extra yarn per textured round.
const TEXTURE_YARN_FACTOR = { bobble: 1.25, popcorn: 1.25, shell: 1.1, ribbing: 1.0 };

// Meters per gram at standard put-up, by normalized yarn-weight key.
const METERS_PER_GRAM = {
  lace: 6.0,
  fingering: 4.0,
  sport: 3.0,
  dk: 2.5,
  worsted: 2.0,
  aran: 1.7,
  bulky: 1.35,
  'super bulky': 0.8,
};

const WASTE_BUFFER = 1.15;

/**
 * Estimate the yarn one generated part consumes.
 *
 * @param {{rows: Array}} generated a SHAPE_GENERATORS result (rows carry counts)
 * @param {object} gauge resolved gauge ({ stsPerCm, weightKey })
 * @param {string} stitch 'sc' | 'hdc' | 'dc'
 * @param {{texture?: string|null, quantity?: number}} opts
 * @returns {{ meters: number, grams: number, stitches: number }}
 */
function estimatePartYarn(generated, gauge, stitch = 'sc', { texture = null, quantity = 1 } = {}) {
  const stitchWidthCm = 1 / gauge.stsPerCm;
  const perStitchCm = SC_LENGTH_FACTOR * stitchWidthCm * (STITCH_YARN_FACTOR[stitch] || 1);
  const textureFactor = TEXTURE_YARN_FACTOR[texture] || 1;

  let cm = 0;
  let stitches = 0;
  for (const row of generated.rows || []) {
    if (typeof row.count !== 'number') continue;
    const isChainRow = /^\s*chain\s+\d+/i.test(row.instruction || '') && /\(\s*\d+\s*chains\s*\)/i.test(row.instruction || '');
    if (isChainRow) {
      cm += row.count * perStitchCm * CHAIN_FACTOR;
      continue;
    }
    const rounds = Math.max(1, Number(row.rounds) || 1);
    stitches += row.count * rounds;
    cm += row.count * rounds * perStitchCm;
  }
  cm *= textureFactor * WASTE_BUFFER * Math.max(1, quantity);
  stitches *= Math.max(1, quantity);

  const meters = cm / 100;
  const mpg = METERS_PER_GRAM[gauge.yarnWeight] || METERS_PER_GRAM.worsted;
  return { meters, grams: meters / mpg, stitches };
}

const round5 = (n) => Math.max(5, Math.ceil(n / 5) * 5);

/** "about 85 m (34 g)" — shop-ready, honestly rounded up. */
function formatYarnAmount({ meters, grams }) {
  return `about ${round5(meters)} m (${Math.max(5, Math.ceil(grams / 5) * 5)} g)`;
}

module.exports = { estimatePartYarn, formatYarnAmount, METERS_PER_GRAM, STITCH_YARN_FACTOR };
