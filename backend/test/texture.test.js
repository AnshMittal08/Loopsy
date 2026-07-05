// E2 — stitch textures + split-limb construction. Textures must be
// count-neutral (validator re-derives identical counts) and the split-limb
// body must self-validate with only the joining round adopted, not checked.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveGauge } = require('../lib/engine/gauge');
const { sphere, tube, flatPanel, splitLimbBody } = require('../lib/engine/shapes');
const { applyTexture, TEXTURES } = require('../lib/engine/texture');
const { validatePattern, computeExpectedCount } = require('../lib/engine/validator');
const { compileDesignSpec } = require('../lib/engine/compiler');

const gauge = resolveGauge('DK', { tight: true });
const stepsOf = (gen) => gen.rows.filter((r) => r.count != null).map((r, i) => ({ row: i + 1, instruction: r.instruction }));

test('every texture on a sphere stays fully verified', () => {
  for (const texture of TEXTURES) {
    const gen = applyTexture(sphere({ diameterCm: 7 }, gauge), texture, 'sc');
    assert.equal(gen.texture, texture, `${texture} should apply to a sphere's even rounds`);
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `${texture}: ${JSON.stringify(v.issues)}`);
    assert.ok(v.verified, `${texture} sphere should stay verified (checked ${v.checkedSteps}/${v.countedSteps})`);
  }
});

test('textures never change any round count (count-neutral by construction)', () => {
  const plain = sphere({ diameterCm: 8 }, gauge);
  const plainCounts = plain.rows.filter((r) => r.count != null).map((r) => r.count);
  for (const texture of TEXTURES) {
    const gen = applyTexture(sphere({ diameterCm: 8 }, gauge), texture, 'sc');
    const counts = gen.rows.filter((r) => r.count != null).map((r) => r.count);
    // Splitting a multi-round range repeats its count; the running sequence of
    // DISTINCT counts must be identical to the plain shape's.
    const distinct = (a) => a.filter((c, i) => i === 0 || c !== a[i - 1]);
    assert.deepEqual(distinct(counts), distinct(plainCounts), `${texture} altered the count sequence`);
  }
});

test('bobble on an open tube and ribbing on a flat panel verify', () => {
  const bobbled = applyTexture(tube({ diameterCm: 8, heightCm: 10, closedBottom: false }, gauge), 'bobble', 'sc');
  assert.equal(bobbled.texture, 'bobble');
  const v1 = validatePattern(stepsOf(bobbled));
  assert.equal(v1.issues.length, 0, JSON.stringify(v1.issues));
  assert.ok(v1.verified);

  const ribbed = applyTexture(flatPanel({ widthCm: 12, heightCm: 10 }, gauge), 'ribbing', 'sc');
  assert.equal(ribbed.texture, 'ribbing');
  assert.ok(ribbed.rows.some((r) => /back loops only/i.test(r.instruction)));
  const v2 = validatePattern(stepsOf(ribbed));
  assert.equal(v2.issues.length, 0, JSON.stringify(v2.issues));
});

test('validator derives texture idioms exactly and flags wrong counts', () => {
  // Bobble round on 24: consumed = produced = 6 × (3+1) = 24.
  assert.equal(
    computeExpectedCount('[Bobble in next stitch, single crochet in next 3 stitches] repeat 6 times. (24 stitches)', 24),
    24
  );
  // Mismatched running count → null (skipped, never guessed).
  assert.equal(
    computeExpectedCount('[Bobble in next stitch, single crochet in next 3 stitches] repeat 6 times. (24 stitches)', 30),
    null
  );
  // Shell round on 30: 5 repeats × 6 = 30.
  assert.equal(
    computeExpectedCount(
      '[Skip next 2 stitches, 5 double crochet in next stitch, skip next 2 stitches, single crochet in next stitch] repeat 5 times. (30 stitches)',
      30
    ),
    30
  );
  // A textured round that LIES about its count is flagged.
  const v = validatePattern([
    { row: 1, instruction: 'Magic ring. 6 single crochet into ring. (6 stitches)' },
    { row: 2, instruction: '2 single crochet in each stitch around. (12 stitches)' },
    { row: 3, instruction: '[Bobble in next stitch, single crochet in next 3 stitches] repeat 3 times. (14 stitches)' },
  ]);
  assert.equal(v.issues.length, 1, 'wrong bobble count must be flagged');
  assert.equal(v.issues[0].declared, 14);
  assert.equal(v.issues[0].expected, 12);
});

test('splitLimbBody: legs-first construction self-validates and closes to 6', () => {
  const gen = splitLimbBody(
    { limbDiameterCm: 3, limbHeightCm: 4, bodyDiameterCm: 8, bodyHeightCm: 6 },
    gauge
  );
  const v = validatePattern(stepsOf(gen));
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
  assert.ok(v.verified, `splitLimbBody should verify (checked ${v.checkedSteps}/${v.countedSteps})`);
  assert.equal(gen.finalCount, 6, 'body closes to 6 stitches');
  // The joining round declares the combined count: 2×limb + 2×bridge.
  const join = gen.rows.find((r) => r.label === 'Joining round');
  assert.ok(join, 'has a joining round');
  assert.equal(join.count, gen.meta.bodySts);
  assert.equal(gen.meta.bodySts, 2 * gen.meta.limbSts + 2 * gen.meta.bridge);
  // Both limbs are present and the second is not fastened off before joining.
  assert.ok(gen.rows.some((r) => /do NOT fasten off/i.test(r.instruction)));
});

test('splitLimbBody body circumference is bumped when legs would not fit', () => {
  // Tiny body vs chunky legs: bodySts must be raised to 2×limbSts + 6.
  const gen = splitLimbBody(
    { limbDiameterCm: 5, limbHeightCm: 4, bodyDiameterCm: 4, bodyHeightCm: 5 },
    gauge
  );
  assert.ok(gen.meta.bodySts >= 2 * gen.meta.limbSts + 6);
  assert.ok(gen.meta.bridge >= 3);
  const v = validatePattern(stepsOf(gen));
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
});

test('compiler: textured + splitLimb spec compiles verified end-to-end', () => {
  const result = compileDesignSpec({
    name: 'Bobble Octopus',
    category: 'Amigurumi',
    yarnWeight: 'DK',
    parts: [
      { name: 'Body', shape: 'splitLimbBody', dimensions: { limbDiameterCm: 2.5, limbHeightCm: 5, bodyDiameterCm: 7, bodyHeightCm: 6 }, color: 'teal' },
      { name: 'Hat', shape: 'hemisphere', dimensions: { diameterCm: 5 }, color: 'coral', texture: 'bobble' },
      { name: 'Scarf', shape: 'flatPanel', dimensions: { widthCm: 3, heightCm: 20 }, color: 'cream', texture: 'ribbing' },
    ],
    assembly: ['Sew the hat to the top of the body.'],
  });
  assert.ok(result.ok, JSON.stringify(result.errors));
  const v = validatePattern(result.steps);
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
  assert.ok(v.verified, `compiled spec should verify (checked ${v.checkedSteps}/${v.countedSteps})`);
  // The texture is surfaced in the part preamble and summaries.
  assert.ok(result.steps.some((s) => /with bobble texture/i.test(s.instruction)));
  assert.equal(result.parts.find((p) => p.name === 'Hat').texture, 'bobble');
});

test('invalid texture value degrades to plain fabric, never breaks compilation', () => {
  const result = compileDesignSpec({
    name: 'Plain Ball',
    category: 'Amigurumi',
    yarnWeight: 'DK',
    parts: [{ name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 6 }, texture: 'sequins' }],
  });
  assert.ok(result.ok);
  assert.equal(result.spec.parts[0].texture, null);
  assert.ok(!result.steps.some((s) => /texture/i.test(s.instruction)));
});
