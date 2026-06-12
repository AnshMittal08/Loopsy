// ---------------------------------------------------------------------------
// Gauge tables — stitches and rows per 10 cm in single crochet, measured at
// standard tension on the listed hook. These numbers drive every shape
// generator: stitch counts are COMPUTED from real-world dimensions, never
// guessed.
// ---------------------------------------------------------------------------

const GAUGE_BY_WEIGHT = {
  lace: { sts: 32, rows: 38, hook: '2.25 mm' },
  fingering: { sts: 28, rows: 34, hook: '3.0 mm' },
  sport: { sts: 24, rows: 30, hook: '3.5 mm' },
  dk: { sts: 22, rows: 26, hook: '4.0 mm' },
  worsted: { sts: 18, rows: 22, hook: '5.0 mm' },
  aran: { sts: 16, rows: 20, hook: '5.5 mm' },
  bulky: { sts: 13, rows: 16, hook: '6.5 mm' },
  'super bulky': { sts: 9, rows: 11, hook: '9.0 mm' },
};

// Amigurumi is worked noticeably tighter on a smaller hook so stuffing never
// shows through the fabric.
const TIGHT_HOOK_BY_WEIGHT = {
  lace: '1.75 mm',
  fingering: '2.25 mm',
  sport: '2.75 mm',
  dk: '3.5 mm',
  worsted: '4.0 mm',
  aran: '4.5 mm',
  bulky: '5.5 mm',
  'super bulky': '8.0 mm',
};

// Row height of common stitches relative to single crochet.
const STITCH_HEIGHT_FACTOR = {
  sc: 1.0,
  hdc: 1.4,
  dc: 1.9,
};

/**
 * Map free-text yarn weight ("DK or Cotton", "Worsted", "Chunky") to a
 * gauge-table key. Defaults to worsted, the most common weight.
 */
function normalizeYarnWeight(raw) {
  const text = String(raw || '').toLowerCase();
  if (text.includes('lace') || text.includes('thread')) return 'lace';
  if (text.includes('fingering') || text.includes('sock') || text.includes('super fine')) return 'fingering';
  if (text.includes('sport') || text.includes('baby')) return 'sport';
  if (text.includes('dk') || text.includes('double knit') || text.includes('light worsted')) return 'dk';
  if (text.includes('super bulky') || text.includes('jumbo') || text.includes('roving')) return 'super bulky';
  if (text.includes('bulky') || text.includes('chunky')) return 'bulky';
  if (text.includes('aran') || text.includes('heavy worsted')) return 'aran';
  if (text.includes('worsted') || text.includes('medium')) return 'worsted';
  if (text.includes('cotton')) return 'dk'; // craft cotton crochets like DK
  return 'worsted';
}

/**
 * Resolve a working gauge for a yarn weight.
 *
 * @param {string} yarnWeight free-text yarn weight
 * @param {{ tight?: boolean }} options tight = amigurumi tension (~15% more
 *   stitches per cm on a smaller hook)
 */
function resolveGauge(yarnWeight, { tight = false } = {}) {
  const key = normalizeYarnWeight(yarnWeight);
  const base = GAUGE_BY_WEIGHT[key];
  const factor = tight ? 1.15 : 1.0;

  return {
    yarnWeight: key,
    tight,
    hook: tight ? TIGHT_HOOK_BY_WEIGHT[key] : base.hook,
    stsPer10Cm: base.sts * factor,
    rowsPer10Cm: base.rows * factor,
    stsPerCm: (base.sts * factor) / 10,
    rowsPerCm: (base.rows * factor) / 10,
  };
}

/** Row height in cm for a stitch type at a given gauge. */
function rowHeightCm(gauge, stitch = 'sc') {
  const factor = STITCH_HEIGHT_FACTOR[stitch] ?? 1.0;
  return factor / gauge.rowsPerCm;
}

module.exports = {
  GAUGE_BY_WEIGHT,
  STITCH_HEIGHT_FACTOR,
  normalizeYarnWeight,
  resolveGauge,
  rowHeightCm,
};
