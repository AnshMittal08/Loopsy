// ===========================================================================
// Randomized accuracy fuzzing — the combinations nobody hand-writes.
//
// A seeded PRNG (fixed seed → reproducible CI) generates hundreds of random
// Design Specs across every shape, garment size, texture, stripe plan, yarn
// weight, stitch and custom gauge, then demands that BOTH verifiers agree
// with the engine on every single one:
//   - lib/engine/validator.js re-derives every count (0 issues, always)
//   - the independent first-principles verifier finds 0 law violations
// plus cross-cutting invariants: yardage is positive and per-colour splits
// sum to the total; every part reports its own meters.
//
// If this suite ever fails, print the seed + case index it reports and the
// exact failing spec can be regenerated deterministically.
// ===========================================================================

const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = path.join(os.tmpdir(), `loopsy-fuzz-${process.pid}-${Date.now()}.db`);

const { compileDesignSpec } = require('../lib/engine/compiler');
const { validatePattern } = require('../lib/engine/validator');
const { verifyPattern } = require('./helpers/independentVerifier');

const SEED = 0x100571; // fixed: failures must be reproducible
const CASES = 400;

// mulberry32 — tiny, deterministic PRNG.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const between = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 2) / 2; // 0.5cm steps
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const maybe = (p) => rand() < p;

const YARNS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky', 'Super Bulky', 'Cotton'];
const STITCHES = [null, 'sc', 'hdc', 'dc'];
const TEXTURES = [null, null, null, 'bobble', 'popcorn', 'shell', 'ribbing'];
const COLORS = ['coral', 'teal', 'cream', 'mustard', '#8B5A2B', '#334455', 'sage', 'blush'];

// Per-shape random dimension factories. Sizes stay in a realistic band so a
// single case can't explode into thousands of rows (bounds cases get their
// own explicit entries at the end).
const SHAPE_DIMS = {
  sphere: () => ({ diameterCm: between(2, 20) }),
  ellipsoid: () => ({ diameterCm: between(2, 16), heightCm: between(3, 24) }),
  hemisphere: () => ({ diameterCm: between(2, 20) }),
  tube: () => ({ diameterCm: between(1.5, 12), heightCm: between(2, 25), ...(maybe(0.4) ? { closedBottom: false } : {}) }),
  cone: () => ({ baseDiameterCm: between(2, 14), heightCm: between(2, 20) }),
  flatPanel: () => ({ widthCm: between(2, 30), heightCm: between(2, 30) }),
  grannySquare: () => ({ sideCm: between(5, 30) }),
  hatCrown: () => ({ size: pick(['baby', 'toddler', 'child', 'teen', 'adult-s', 'adult-m', 'adult-l']) }),
  revolve: () => {
    const n = 3 + Math.floor(rand() * 4);
    const profile = Array.from({ length: n }, (_, i) => ({
      t: i / (n - 1),
      r: between(0.3, 5),
    }));
    return { heightCm: between(5, 18), profile };
  },
  flatCircle: () => ({ diameterCm: between(3, 25) }),
  flatHexagon: () => ({ diameterCm: between(4, 25) }),
  taperedTube: () => ({ bottomDiameterCm: between(1.5, 12), topDiameterCm: between(1.5, 12), heightCm: between(2, 20) }),
  triangle: () => ({ baseCm: between(3, 20) }),
  star: () => ({ sizeCm: between(4, 14) }),
  heart: () => ({ widthCm: between(4, 16) }),
  splitLimbBody: () => ({ limbDiameterCm: between(1.5, 6), limbHeightCm: between(2, 10), bodyDiameterCm: between(4, 14), bodyHeightCm: between(3, 12) }),
  raglanSweater: () => ({ size: pick(['baby', 'child', 'adult-s', 'adult-m', 'adult-l', 'adult-xl']) }),
  sock: () => ({ size: pick(['child', 'adult-s', 'adult-m', 'adult-l']) }),
  mitten: () => ({ size: pick(['child', 'adult-s', 'adult-m', 'adult-l']) }),
};
const SHAPES = Object.keys(SHAPE_DIMS);

function randomPart(i) {
  const shape = pick(SHAPES);
  const part = {
    name: `Part ${i + 1}`,
    shape,
    dimensions: SHAPE_DIMS[shape](),
    quantity: maybe(0.2) ? 1 + Math.floor(rand() * 5) : 1,
  };
  const stitch = pick(STITCHES);
  if (stitch) part.stitch = stitch;
  const texture = pick(TEXTURES);
  if (texture) part.texture = texture;
  if (maybe(0.2)) {
    part.colorPlan = {
      colors: Array.from({ length: 2 + Math.floor(rand() * 3) }, () => pick(COLORS)),
      stripeRounds: 1 + Math.floor(rand() * 4),
    };
  } else if (maybe(0.7)) {
    part.color = pick(COLORS);
  }
  return part;
}

function randomSpec(caseIdx) {
  const spec = {
    name: `Fuzz case ${caseIdx}`,
    category: pick(['Amigurumi', 'Wearable', 'Accessory', 'Home Decor', 'Custom']),
    yarnWeight: pick(YARNS),
    parts: Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, i) => randomPart(i)),
  };
  if (maybe(0.3)) {
    spec.gauge = {
      ...(maybe(0.9) ? { stsPer10Cm: between(6, 40) } : {}),
      ...(maybe(0.5) ? { rowsPer10Cm: between(6, 45) } : {}),
    };
  }
  return spec;
}

test(`fuzz: ${CASES} random specs — engine, validator and independent verifier all agree (seed 0x${SEED.toString(16)})`, () => {
  let dualCounted = 0;
  let dualProven = 0;

  for (let c = 0; c < CASES; c++) {
    const spec = randomSpec(c);
    const compiled = compileDesignSpec(spec);
    assert.ok(compiled.ok, `case ${c}: compile failed: ${JSON.stringify(compiled.errors)}\nspec: ${JSON.stringify(spec)}`);

    // Verifier 1: the engine's own validator must re-derive every count.
    const v = validatePattern(compiled.steps);
    assert.equal(
      v.issues.length, 0,
      `case ${c}: validator issues: ${JSON.stringify(v.issues)}\nspec: ${JSON.stringify(spec)}`
    );

    // Verifier 2: the independent first-principles verifier must find no
    // feasibility/honesty violations.
    const iv = verifyPattern(compiled.steps.map((s) => ({ instruction: s.instruction })), `case ${c}`);
    assert.equal(
      iv.findings.length, 0,
      `case ${c}: independent findings: ${JSON.stringify(iv.findings)}\nspec: ${JSON.stringify(spec)}`
    );
    dualCounted += iv.counted;
    dualProven += iv.proven;

    // Invariants: yardage must be positive, shoppable, and self-consistent.
    const y = compiled.yardage;
    assert.ok(y.totalMeters > 0, `case ${c}: non-positive yardage`);
    assert.ok(y.totalGrams > 0, `case ${c}: non-positive grams`);
    const colorSum = y.perColor.reduce((s, x) => s + x.meters, 0);
    assert.ok(Math.abs(colorSum - y.totalMeters) <= Math.max(2, y.perColor.length), `case ${c}: per-colour split (${colorSum}) drifts from total (${y.totalMeters})`);
    for (const p of compiled.parts) {
      assert.ok(p.yarnMeters >= 0, `case ${c}: part ${p.name} negative yarn`);
    }
  }

  // Corpus-level coverage floor: the independent verifier must PROVE (not
  // just fail-to-contradict) a healthy majority of counted rounds, so a
  // future engine change can't hide behind unparseable phrasing.
  const coverage = dualProven / Math.max(1, dualCounted);
  assert.ok(
    coverage >= 0.6,
    `independent coverage across fuzz corpus fell to ${(coverage * 100).toFixed(1)}% (${dualProven}/${dualCounted})`
  );
});

test('fuzz bounds: extreme-but-legal dimensions still verify', () => {
  const cases = [
    { name: 'Tiny ball', shape: 'sphere', dimensions: { diameterCm: 0.6 } },
    { name: 'Big ball', shape: 'sphere', dimensions: { diameterCm: 38 } },
    { name: 'Needle tube', shape: 'tube', dimensions: { diameterCm: 0.8, heightCm: 60 } },
    { name: 'Pancake', shape: 'ellipsoid', dimensions: { diameterCm: 30, heightCm: 2 } },
    { name: 'Wide hex', shape: 'flatHexagon', dimensions: { diameterCm: 60 } },
    { name: 'Sliver panel', shape: 'flatPanel', dimensions: { widthCm: 0.9, heightCm: 50 } },
    { name: 'Stumpy limbs', shape: 'splitLimbBody', dimensions: { limbDiameterCm: 0.8, limbHeightCm: 0.8, bodyDiameterCm: 3, bodyHeightCm: 2 } },
    { name: 'Chunky taper', shape: 'taperedTube', dimensions: { bottomDiameterCm: 30, topDiameterCm: 0.8, heightCm: 4 } },
  ];
  for (const part of cases) {
    const compiled = compileDesignSpec({ name: part.name, category: 'Custom', yarnWeight: 'Worsted', parts: [part] });
    assert.ok(compiled.ok, `${part.name}: ${JSON.stringify(compiled.errors)}`);
    const v = validatePattern(compiled.steps);
    assert.equal(v.issues.length, 0, `${part.name}: ${JSON.stringify(v.issues)}`);
    const iv = verifyPattern(compiled.steps.map((s) => ({ instruction: s.instruction })), part.name);
    assert.equal(iv.findings.length, 0, `${part.name}: ${JSON.stringify(iv.findings)}`);
  }
});

test('validator exposes quantitative coverage alongside the verdict', () => {
  const { compileDesignSpec: compile } = require('../lib/engine/compiler');
  const compiled = compile({
    name: 'Coverage probe', category: 'Amigurumi', yarnWeight: 'DK',
    parts: [{ name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 8 } }],
  });
  const v = validatePattern(compiled.steps);
  assert.ok(v.verified);
  assert.ok(typeof v.coverage === 'number' && v.coverage > 0 && v.coverage <= 1, 'coverage is a 0..1 ratio');
  assert.ok(v.coverage >= 0.6, 'badge implies at least the coverage floor');
  assert.equal(Math.round(v.coverage * v.countedSteps), v.checkedSteps, 'coverage = checked/counted');
});
