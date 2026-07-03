const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveGauge } = require('../lib/engine/gauge');
const { sphere, ellipsoid, hemisphere, tube, cone, flatPanel, hatCrown, grannySquare, flatCircle, flatHexagon, taperedTube, triangle, star, heart } = require('../lib/engine/shapes');
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
    flatCircle: flatCircle({ diameterCm: 10 }, gauge),
    flatHexagon: flatHexagon({ diameterCm: 12 }, gauge),
    taperedTubeUp: taperedTube({ bottomDiameterCm: 3, topDiameterCm: 6, heightCm: 8 }, gauge),
    taperedTubeDown: taperedTube({ bottomDiameterCm: 6, topDiameterCm: 2, heightCm: 9 }, gauge),
    triangle: triangle({ baseCm: 8 }, gauge),
    star: star({ sizeCm: 9 }, gauge),
    heart: heart({ widthCm: 7 }, gauge),
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

// ─── E1 expansion ───────────────────────────────────────────────────────────

test('E1: flatCircle / flatHexagon / taperedTube are FULLY verified (earned badge)', () => {
  for (const gen of [
    flatCircle({ diameterCm: 10 }, gauge),
    flatHexagon({ diameterCm: 12 }, gauge),
    taperedTube({ bottomDiameterCm: 3, topDiameterCm: 6, heightCm: 8 }, gauge),
    taperedTube({ bottomDiameterCm: 6, topDiameterCm: 2, heightCm: 9 }, gauge),
  ]) {
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `${gen.shape}: ${JSON.stringify(v.issues)}`);
    assert.ok(v.verified, `${gen.shape} should earn the verified badge (checked ${v.checkedSteps}/${v.countedSteps})`);
  }
});

test('E1: taperedTube reaches the exact top circumference in both directions', () => {
  const up = taperedTube({ bottomDiameterCm: 3, topDiameterCm: 6, heightCm: 8 }, gauge);
  const down = taperedTube({ bottomDiameterCm: 6, topDiameterCm: 2, heightCm: 9 }, gauge);
  const topSts = (d) => Math.max(6, Math.round((Math.PI * d * gauge.stsPerCm) / 6) * 6);
  assert.equal(up.finalCount, topSts(6), 'widening taper hits target');
  assert.equal(down.finalCount, topSts(2), 'narrowing taper hits target');
});

test('E1: triangle descends one stitch per row to a single apex stitch', () => {
  const gen = triangle({ baseCm: 6 }, gauge);
  const counts = gen.rows.filter((r) => r.count != null && r.rounds > 0).map((r) => r.count);
  assert.equal(counts[counts.length - 1], 1, 'apex is a single stitch');
  for (let i = 1; i < counts.length; i++) {
    assert.equal(counts[i], counts[i - 1] - 1, 'each row loses exactly one stitch');
  }
});

test('E1: triangle and heart are FULLY verified via the new row-edge idioms', () => {
  for (const gen of [triangle({ baseCm: 8 }, gauge), heart({ widthCm: 5 }, gauge), heart({ widthCm: 9 }, gauge)]) {
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `${gen.shape}: ${JSON.stringify(v.issues)}`);
    assert.ok(v.verified, `${gen.shape} should earn the verified badge (checked ${v.checkedSteps}/${v.countedSteps})`);
  }
});

test('E1: the new edge idioms still CATCH corrupted counts (moat intact)', () => {
  const gen = triangle({ baseCm: 8 }, gauge);
  const steps = stepsOf(gen).map((s) => ({ ...s, instruction: s.instruction.replace('(12 stitches)', '(13 stitches)') }));
  const v = validatePattern(steps);
  assert.ok(v.issues.length >= 1, 'a lied edge-decrease count must be flagged');
});

test('E1: star centre uses canonical checkable rounds and never mis-flags', () => {
  for (const gen of [star({ sizeCm: 6 }, gauge), star({ sizeCm: 10 }, gauge)]) {
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `${gen.shape}: ${JSON.stringify(v.issues)}`);
  }
  const s = star({ sizeCm: 10 }, gauge);
  const counts = s.rows.filter((r) => r.count != null).map((r) => r.count);
  assert.deepEqual(counts, [10, 20, 30]);
});

test('E1: heart grows +2 per row to its target width then holds', () => {
  const gen = heart({ widthCm: 7 }, gauge);
  const grow = gen.rows.filter((r) => r.count != null).map((r) => r.count);
  for (let i = 1; i < grow.length; i++) {
    assert.ok(grow[i] === grow[i - 1] + 2 || grow[i] === grow[i - 1], 'monotone +2 growth then hold');
  }
  assert.equal(grow[grow.length - 1] % 2, 0, 'width is even so the two lobes split cleanly');
});
