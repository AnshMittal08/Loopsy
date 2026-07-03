const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compileDesignSpec, validatePattern, normalizeDesignSpec, validateDesignSpec } = require('../lib/engine');
const { normalizeColorPlan } = require('../lib/engine/designSpec');
const { colorName } = require('../lib/engine/colorName');

// Pull every "(N stitches)" count out of a compiled step list, in order.
const countsOf = (steps) =>
  steps
    .map((s) => /\((\d+) stitches?\)/.exec(s.instruction))
    .filter(Boolean)
    .map((m) => Number(m[1]));

test('compiles a multi-part amigurumi and the result verifies', () => {
  const c = compileDesignSpec({
    name: 'Bee', category: 'Amigurumi', yarnWeight: 'DK',
    parts: [
      { name: 'Head', shape: 'sphere', dimensions: { diameterCm: 5 }, color: 'yellow' },
      { name: 'Body', shape: 'ellipsoid', dimensions: { diameterCm: 5, heightCm: 8 }, color: 'yellow' },
      { name: 'Wing', shape: 'flatPanel', dimensions: { widthCm: 3, heightCm: 4 }, quantity: 2 },
    ],
    assembly: ['Sew the head to the body.'],
  });
  assert.ok(c.ok);
  const v = validatePattern(c.steps);
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
});

test('per-part stitch, custom assembly, and embellishments compile and verify', () => {
  const c = compileDesignSpec({
    name: 'Mixed', category: 'Amigurumi', yarnWeight: 'Worsted',
    parts: [
      { name: 'Body', shape: 'sphere', dimensions: { diameterCm: 6 }, color: 'teal', stitch: 'hdc' },
      { name: 'Scarf', shape: 'flatPanel', dimensions: { widthCm: 2, heightCm: 12 }, color: 'cream', stitch: 'dc' },
    ],
    assembly: ['Wrap the scarf around the neck and tack in place.'],
    embellishments: ['Embroider two French-knot eyes in black.'],
  });
  assert.ok(c.ok);
  // The maker's assembly + embellishment text is emitted verbatim as steps.
  assert.ok(c.steps.some((s) => /Assembly: Wrap the scarf/.test(s.instruction)));
  assert.ok(c.steps.some((s) => /Embellishment: Embroider two French-knot/.test(s.instruction)));
  // Different stitches render with their full names.
  assert.ok(c.steps.some((s) => /half double crochet/.test(s.instruction)));
  assert.ok(c.steps.some((s) => /double crochet/.test(s.instruction)));
  // The math still verifies independently.
  assert.equal(validatePattern(c.steps).issues.length, 0, JSON.stringify(validatePattern(c.steps).issues));
});

test('rejects an unknown shape', () => {
  const c = compileDesignSpec({ name: 'X', category: 'Custom', yarnWeight: 'DK', parts: [{ name: 'Z', shape: 'dodecahedron', dimensions: {} }] });
  assert.equal(c.ok, false);
});

test('normalizeDesignSpec preserves canvas layout and face', () => {
  const spec = normalizeDesignSpec({ parts: [{ name: 'Head', shape: 'sphere', dimensions: { diameterCm: 6 }, layout: { x: 5, y: 9 }, face: true, junk: 1 }] });
  assert.deepEqual(spec.parts[0].layout, { x: 5, y: 9 });
  assert.equal(spec.parts[0].face, true);
  assert.equal(spec.parts[0].junk, undefined);
});

test('validateDesignSpec catches missing required dimensions', () => {
  const { valid } = validateDesignSpec(normalizeDesignSpec({ parts: [{ name: 'B', shape: 'cone', dimensions: {} }] }));
  assert.equal(valid, false);
});

test('normalizeColorPlan keeps valid stripes and drops malformed ones', () => {
  assert.deepEqual(normalizeColorPlan({ colors: ['red', 'cream'], stripeRounds: 2 }), { colors: ['red', 'cream'], stripeRounds: 2 });
  assert.equal(normalizeColorPlan({ colors: ['red'], stripeRounds: 2 }), null, 'one colour is not a stripe');
  assert.equal(normalizeColorPlan(null), null);
  assert.equal(normalizeColorPlan({ colors: [] }), null);
  // stripeRounds clamps to >=1 and colours cap at 6.
  assert.equal(normalizeColorPlan({ colors: ['a', 'b'], stripeRounds: 0 }).stripeRounds, 1);
  assert.equal(normalizeColorPlan({ colors: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], stripeRounds: 3 }).colors.length, 6);
});

test('a striped part still verifies and never alters the stitch counts', () => {
  const base = { name: 'Body', shape: 'tube', dimensions: { diameterCm: 6, heightCm: 8 }, stitch: 'sc' };
  const plain = compileDesignSpec({ name: 'T', category: 'Amigurumi', yarnWeight: 'DK', parts: [{ ...base, color: 'red' }] });
  const striped = compileDesignSpec({ name: 'T', category: 'Amigurumi', yarnWeight: 'DK', parts: [{ ...base, colorPlan: { colors: ['red', 'cream'], stripeRounds: 2 } }] });

  assert.ok(plain.ok && striped.ok);
  // Counts are computed by geometry, untouched by colour.
  assert.deepEqual(countsOf(striped.steps), countsOf(plain.steps), 'stripe must not change any stitch count');
  // The validator re-derives counts independently and finds no problems.
  assert.equal(validatePattern(striped.steps).issues.length, 0, JSON.stringify(validatePattern(striped.steps).issues));
});

test('a striped part inserts colour-change notes and lists every colour in materials', () => {
  const c = compileDesignSpec({
    name: 'Scarf', category: 'Accessory', yarnWeight: 'Worsted',
    parts: [{ name: 'Body', shape: 'tube', dimensions: { diameterCm: 6, heightCm: 10 }, stitch: 'sc', colorPlan: { colors: ['#c0392b', 'cream'], stripeRounds: 2 } }],
  });
  assert.ok(c.ok);
  const changes = c.steps.filter((s) => /Change to .+ yarn\./.test(s.instruction));
  assert.ok(changes.length >= 1, 'at least one colour change is emitted');
  // Both colours appear in the materials line.
  const mat = c.materials.join(' ');
  assert.ok(/cream/i.test(mat) && new RegExp(colorName('#c0392b'), 'i').test(mat), `materials list both colours: ${mat}`);
  // The starting-colour preamble names the first stripe colour.
  assert.ok(c.steps.some((s) => /starting in .+ yarn/.test(s.instruction)));
});

test('E1 shapes compile with part-label prefixes and still verify (0 issues)', () => {
  // Compiled steps are prefixed "Part — Row N: …" — the validator must derive
  // through that prefix. This locks the seam a raw-generator test can't see.
  const c = compileDesignSpec({
    name: 'Motif Sampler', category: 'Accessory', yarnWeight: 'DK',
    parts: [
      { name: 'Coaster', shape: 'flatCircle', dimensions: { diameterCm: 10 } },
      { name: 'Tile', shape: 'flatHexagon', dimensions: { diameterCm: 12 } },
      { name: 'Horn', shape: 'taperedTube', dimensions: { bottomDiameterCm: 5, topDiameterCm: 1.5, heightCm: 8 } },
      { name: 'Pennant', shape: 'triangle', dimensions: { baseCm: 10 } },
      { name: 'Star', shape: 'star', dimensions: { sizeCm: 9 } },
      { name: 'Heart', shape: 'heart', dimensions: { widthCm: 6 } },
    ],
  });
  assert.ok(c.ok, JSON.stringify(c.errors));
  const v = validatePattern(c.steps);
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
});

test('colorName maps hex to readable names and passes palette names through', () => {
  assert.equal(colorName('#c4622d'), 'rust');
  assert.equal(colorName('#1fa39a'), 'teal');
  assert.equal(colorName('cream'), 'cream');
  assert.equal(colorName('Deep Red'), 'Deep Red');
});
