// Custom (measured-swatch) gauge — every count re-scales to the maker's tension.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveGauge } = require('../lib/engine/gauge');
const { compileDesignSpec } = require('../lib/engine/compiler');
const { validatePattern } = require('../lib/engine/validator');

test('custom swatch overrides the table and is sanity-clamped', () => {
  const table = resolveGauge('Worsted');
  const loose = resolveGauge('Worsted', { custom: { stsPer10Cm: 14, rowsPer10Cm: 18 } });
  assert.equal(loose.stsPer10Cm, 14);
  assert.equal(loose.rowsPer10Cm, 18);
  assert.ok(loose.custom);
  assert.ok(loose.stsPer10Cm < table.stsPer10Cm);
  // A typo (400 sts / 10 cm) clamps to at most double the table value.
  const typo = resolveGauge('Worsted', { custom: { stsPer10Cm: 400 } });
  assert.ok(typo.stsPer10Cm <= table.stsPer10Cm * 2);
  // Only sts measured → rows track the same ratio.
  const stsOnly = resolveGauge('Worsted', { custom: { stsPer10Cm: table.stsPer10Cm * 1.2 } });
  assert.ok(Math.abs(stsOnly.rowsPer10Cm - table.rowsPer10Cm * 1.2) < 0.01);
});

test('a spec with a measured gauge compiles verified with rescaled counts', () => {
  const base = compileDesignSpec({
    name: 'Ball', category: 'Amigurumi', yarnWeight: 'DK',
    parts: [{ name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 8 } }],
  });
  const loose = compileDesignSpec({
    name: 'Ball', category: 'Amigurumi', yarnWeight: 'DK',
    gauge: { stsPer10Cm: 16 }, // much looser than tight DK
    parts: [{ name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 8 } }],
  });
  assert.ok(base.ok && loose.ok);
  const peak = (r) => r.parts[0].maxStitchCount;
  assert.ok(peak(loose) < peak(base), 'looser tension → fewer stitches for the same size');
  const v = validatePattern(loose.steps);
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
  assert.ok(v.verified, 'custom-gauge pattern still earns the badge');
});

test('malformed gauge values are dropped, never break compilation', () => {
  const r = compileDesignSpec({
    name: 'Ball', category: 'Amigurumi', yarnWeight: 'DK',
    gauge: { stsPer10Cm: 'lots' },
    parts: [{ name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 6 } }],
  });
  assert.ok(r.ok);
  assert.equal(r.spec.gauge, null);
});
