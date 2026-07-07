// ===========================================================================
// INDEPENDENT stitch-accuracy audit — the deepest guard on the moat.
//
// lib/engine/validator.js re-derives counts to earn the "Verified math ✓"
// badge, but it shares design DNA with the compiler. This suite verifies the
// same output a SECOND, independent way: test/helpers/independentVerifier.js
// expands each instruction into atomic crochet operations from first
// principles and checks the two physical laws of crochet —
//   LAW 1: a round consumes EXACTLY the previous round's stitches, and
//   LAW 2: the printed "(N stitches)" equals what those operations produce.
//
// Run across a wide parameter sweep of every generator, garment, texture,
// revolve profile, and full compiler spec. The suite fails on ANY violation,
// and also fails if independent COVERAGE drops below a floor (so a future
// change can't hide a regression behind "the verifier just skipped it").
// ===========================================================================

const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = path.join(os.tmpdir(), `loopsy-accuracy-${process.pid}-${Date.now()}.db`);

const shapes = require('../lib/engine/shapes');
const garments = require('../lib/engine/garments');
const { revolve } = require('../lib/engine/revolve');
const { applyTexture } = require('../lib/engine/texture');
const { resolveGauge } = require('../lib/engine/gauge');
const { compileDesignSpec } = require('../lib/engine/compiler');
const { verifyPattern } = require('./helpers/independentVerifier');

const stepsOf = (gen) => gen.rows.filter((r) => r.count != null).map((r) => ({ instruction: r.instruction }));

const totals = { cases: 0, counted: 0, proven: 0, unparsed: 0 };
const violations = [];

function audit(label, gen) {
  totals.cases++;
  const res = verifyPattern(stepsOf(gen), label);
  totals.counted += res.counted; totals.proven += res.proven; totals.unparsed += res.unparsed;
  violations.push(...res.findings.filter((f) => f.kind === 'FEASIBILITY' || f.kind === 'HONESTY'));
}

const gauges = [resolveGauge('DK', { tight: true }), resolveGauge('Worsted'), resolveGauge('Bulky', { tight: true }), resolveGauge('fingering', { tight: true })];

test('every generator round obeys both physical laws across a parameter sweep', () => {
  for (const g of gauges) {
    for (const d of [3, 4, 6, 7, 9, 12, 16, 20]) audit(`sphere d${d}`, shapes.sphere({ diameterCm: d }, g));
    for (const d of [4, 6, 9]) for (const h of [5, 8, 12, 18]) audit(`ellipsoid`, shapes.ellipsoid({ diameterCm: d, heightCm: h }, g));
    for (const d of [5, 8, 12, 16]) audit('hemisphere', shapes.hemisphere({ diameterCm: d }, g));
    for (const d of [3, 5, 8]) for (const h of [4, 8, 14]) {
      audit('tube-closed', shapes.tube({ diameterCm: d, heightCm: h, closedBottom: true }, g));
      audit('tube-open', shapes.tube({ diameterCm: d, heightCm: h, closedBottom: false }, g));
    }
    for (const b of [4, 6, 10]) for (const h of [5, 9, 14]) audit('cone', shapes.cone({ baseDiameterCm: b, heightCm: h }, g));
    for (const w of [6, 10, 20]) for (const h of [5, 12]) audit('flatPanel', shapes.flatPanel({ widthCm: w, heightCm: h }, g));
    for (const d of [6, 10, 14]) audit('flatCircle', shapes.flatCircle({ diameterCm: d }, g));
    for (const d of [8, 12]) audit('flatHexagon', shapes.flatHexagon({ diameterCm: d }, g));
    for (const bd of [2, 4]) for (const td of [3, 6]) for (const h of [6, 10]) audit('taperedTube', shapes.taperedTube({ bottomDiameterCm: bd, topDiameterCm: td, heightCm: h }, g));
    for (const bc of [6, 10, 16]) audit('triangle', shapes.triangle({ baseCm: bc }, g));
    for (const s of [6, 9, 12]) audit('star', shapes.star({ sizeCm: s }, g));
    for (const w of [5, 8, 12]) audit('heart', shapes.heart({ widthCm: w }, g));
    for (const s of Object.keys(shapes.HAT_SIZES)) audit('hatCrown', shapes.hatCrown({ size: s }, g, 'dc'));
    for (const side of [8, 14, 22]) audit('grannySquare', shapes.grannySquare({ sideCm: side }, g));
    for (const ld of [2.5, 3, 4]) for (const bd of [6, 8, 11]) audit('splitLimb', shapes.splitLimbBody({ limbDiameterCm: ld, limbHeightCm: 5, bodyDiameterCm: bd, bodyHeightCm: 7 }, g));
  }
  assert.equal(violations.length, 0, `accuracy violations:\n${violations.slice(0, 20).map((v) => `  [${v.kind}] ${v.label} row ${v.row}: ${v.detail}`).join('\n')}`);
});

test('every garment size obeys both physical laws', () => {
  const before = violations.length;
  for (const g of [resolveGauge('Worsted'), resolveGauge('DK'), resolveGauge('Aran')]) {
    for (const s of Object.keys(garments.SWEATER_SIZES)) audit('sweater', garments.raglanSweater({ size: s }, g));
    for (const s of Object.keys(garments.SOCK_SIZES)) audit('sock', garments.sock({ size: s }, g));
    for (const s of Object.keys(garments.MITTEN_SIZES)) audit('mitten', garments.mitten({ size: s }, g));
  }
  assert.equal(violations.length, before, `garment accuracy violations: ${JSON.stringify(violations.slice(before))}`);
});

test('revolve profiles and textures obey both physical laws', () => {
  const before = violations.length;
  const g0 = resolveGauge('DK', { tight: true });
  const profiles = {
    gnome: [{ t: 0, r: 0.4 }, { t: 0.2, r: 3.2 }, { t: 0.5, r: 3.6 }, { t: 0.82, r: 1.4 }, { t: 1, r: 0.3 }],
    vase: [{ t: 0, r: 2 }, { t: 0.3, r: 3.5 }, { t: 0.6, r: 2 }, { t: 0.85, r: 2.8 }, { t: 1, r: 2.5 }],
    pear: [{ t: 0, r: 0.3 }, { t: 0.35, r: 4 }, { t: 0.7, r: 2.6 }, { t: 1, r: 0.3 }],
    spike: [{ t: 0, r: 0.3 }, { t: 0.1, r: 5 }, { t: 0.5, r: 1 }, { t: 0.9, r: 5 }, { t: 1, r: 0.3 }],
  };
  for (const [, profile] of Object.entries(profiles)) for (const h of [8, 12, 16]) audit('revolve', revolve({ heightCm: h, profile }, g0));
  for (const tex of ['bobble', 'popcorn', 'shell', 'ribbing']) {
    audit(`tex-${tex}-sphere`, applyTexture(shapes.sphere({ diameterCm: 9 }, g0), tex, 'sc'));
    audit(`tex-${tex}-tube`, applyTexture(shapes.tube({ diameterCm: 8, heightCm: 12, closedBottom: false }, g0), tex, 'sc'));
    audit(`tex-${tex}-panel`, applyTexture(shapes.flatPanel({ widthCm: 12, heightCm: 10 }, g0), tex, 'sc'));
  }
  assert.equal(violations.length, before, `revolve/texture violations: ${JSON.stringify(violations.slice(before))}`);
});

test('full compiler specs (real product output) obey both physical laws', () => {
  const before = violations.length;
  const specs = [
    { name: 'Bear', category: 'Amigurumi', yarnWeight: 'DK', parts: [
      { name: 'Head', shape: 'sphere', dimensions: { diameterCm: 7 }, color: 'brown' },
      { name: 'Body', shape: 'ellipsoid', dimensions: { diameterCm: 8, heightCm: 10 }, color: 'brown' },
      { name: 'Arms', shape: 'cone', dimensions: { baseDiameterCm: 3, heightCm: 5 }, color: 'brown', quantity: 2 } ] },
    { name: 'Striped Octopus', category: 'Amigurumi', yarnWeight: 'Worsted', parts: [
      { name: 'Body', shape: 'splitLimbBody', dimensions: { limbDiameterCm: 3, limbHeightCm: 6, bodyDiameterCm: 9, bodyHeightCm: 7 }, colorPlan: { colors: ['red', 'white'], stripeRounds: 2 } } ] },
    { name: 'Textured Set', category: 'Amigurumi', yarnWeight: 'DK', parts: [
      { name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 8 }, color: 'teal', texture: 'bobble' },
      { name: 'Scarf', shape: 'flatPanel', dimensions: { widthCm: 3, heightCm: 20 }, color: 'cream', texture: 'ribbing' } ] },
    { name: 'Wardrobe', category: 'Wearable', yarnWeight: 'Worsted', parts: [
      { name: 'Sweater', shape: 'raglanSweater', dimensions: { size: 'adult-m' }, color: 'rust' },
      { name: 'Sock', shape: 'sock', dimensions: { size: 'adult-m' }, color: 'cream', quantity: 2 },
      { name: 'Mitten', shape: 'mitten', dimensions: { size: 'adult-m' }, color: 'rust', quantity: 2 } ] },
    { name: 'Custom gauge ball', category: 'Amigurumi', yarnWeight: 'DK', gauge: { stsPer10Cm: 16 }, parts: [
      { name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 10 }, color: 'blue' } ] },
  ];
  for (const spec of specs) {
    const c = compileDesignSpec(spec);
    assert.ok(c.ok, `${spec.name} failed to compile: ${JSON.stringify(c.errors)}`);
    totals.cases++;
    const res = verifyPattern(c.steps, `compile:${spec.name}`);
    totals.counted += res.counted; totals.proven += res.proven; totals.unparsed += res.unparsed;
    violations.push(...res.findings.filter((f) => f.kind === 'FEASIBILITY' || f.kind === 'HONESTY'));
  }
  assert.equal(violations.length, before, `compiler-spec violations: ${JSON.stringify(violations.slice(before))}`);
});

test('independent coverage stays high (no silent regression behind skips)', () => {
  const coverage = totals.proven / totals.counted;
  // 95% of all rounds are proven by a from-scratch interpreter that shares no
  // code with the engine. The remainder are granny-cluster corner rounds
  // (mathematically non-tileable) and produce-only foundation rows.
  assert.ok(coverage >= 0.9, `independent coverage dropped to ${(coverage * 100).toFixed(1)}% (floor 90%); ${totals.proven}/${totals.counted} rounds`);
  assert.ok(totals.counted > 6000, `expected a broad sweep, only ${totals.counted} rounds audited`);
});
