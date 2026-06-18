const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveGauge } = require('../lib/engine/gauge');
const { sphere, ellipsoid, hemisphere, tube, cone, flatPanel, hatCrown, grannySquare } = require('../lib/engine/shapes');
const { revolve } = require('../lib/engine/revolve');
const { validatePattern } = require('../lib/engine/validator');

const gauge = resolveGauge('DK', { tight: true });
const stepsOf = (gen) => gen.rows.filter((r) => r.count != null).map((r, i) => ({ row: i + 1, instruction: r.instruction }));

test('sphere produces the textbook 6-12-18-24-30… increase sequence', () => {
  const s = sphere({ diameterCm: 6 }, gauge);
  const counts = s.rows.filter((r) => r.count != null).map((r) => r.count);
  // increases ramp to the peak then mirror down
  const peakIdx = counts.indexOf(s.maxStitchCount);
  const up = counts.slice(0, peakIdx + 1);
  assert.deepEqual(up.slice(0, 8), [6, 12, 18, 24, 30, 36, 42, 48].slice(0, up.length));
});

test('every shape generator self-validates (engine and validator agree)', () => {
  const cases = {
    sphere: sphere({ diameterCm: 7 }, gauge),
    ellipsoid: ellipsoid({ diameterCm: 6, heightCm: 9 }, gauge),
    hemisphere: hemisphere({ diameterCm: 8 }, gauge),
    tube: tube({ diameterCm: 5, heightCm: 8 }, gauge),
    cone: cone({ baseDiameterCm: 6, heightCm: 7 }, gauge),
    flatPanel: flatPanel({ widthCm: 10, heightCm: 8 }, gauge),
    hatCrown: hatCrown({ size: 'adult-m' }, gauge, 'dc'),
    grannySquare: grannySquare({ sideCm: 10 }, gauge),
  };
  for (const [name, gen] of Object.entries(cases)) {
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `${name} arithmetic issues: ${JSON.stringify(v.issues)}`);
  }
});

test('revolve: varied profiles all verify with zero issues', () => {
  const profiles = {
    gnome: { heightCm: 12, profile: [{ t: 0, r: 0.4 }, { t: 0.18, r: 3.2 }, { t: 0.5, r: 3.6 }, { t: 0.82, r: 1.4 }, { t: 1, r: 0.3 }] },
    vase: { heightCm: 14, profile: [{ t: 0, r: 2 }, { t: 0.3, r: 3.5 }, { t: 0.6, r: 2 }, { t: 0.85, r: 2.8 }, { t: 1, r: 2.5 }] },
    pear: { heightCm: 10, profile: [{ t: 0, r: 0.3 }, { t: 0.35, r: 4 }, { t: 0.7, r: 2.6 }, { t: 1, r: 0.3 }] },
    lumpy: { heightCm: 11, profile: [{ t: 0, r: 0.5 }, { t: 0.25, r: 2 }, { t: 0.4, r: 4 }, { t: 0.55, r: 2 }, { t: 0.7, r: 4 }, { t: 1, r: 0.4 }] },
  };
  for (const [name, dims] of Object.entries(profiles)) {
    const gen = revolve(dims, gauge);
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `${name} issues: ${JSON.stringify(v.issues)}`);
    assert.ok(v.verified, `${name} should verify`);
  }
});

test('revolve closes a narrow top down to 6 then finishes', () => {
  const gen = revolve({ heightCm: 10, profile: [{ t: 0, r: 0.3 }, { t: 0.5, r: 3 }, { t: 1, r: 0.3 }] }, gauge);
  const lastCounted = gen.rows.filter((r) => r.count != null).pop();
  assert.ok(lastCounted.count <= 6, 'top closes');
  assert.match(gen.rows[gen.rows.length - 1].instruction, /Fasten off/i);
});
