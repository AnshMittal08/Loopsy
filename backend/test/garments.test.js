// E3 — sized garments. Every size of every garment must self-validate; the
// raglan and chain-over-opening idioms are derived exactly (and flagged when
// they lie); the compiler path earns the badge end-to-end.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveGauge } = require('../lib/engine/gauge');
const {
  raglanSweater, sock, mitten,
  SWEATER_SIZES, SOCK_SIZES, MITTEN_SIZES,
} = require('../lib/engine/garments');
const { validatePattern, computeExpectedCount } = require('../lib/engine/validator');
const { compileDesignSpec } = require('../lib/engine/compiler');

const gauge = resolveGauge('Worsted');
const stepsOf = (gen) => gen.rows.filter((r) => r.count != null).map((r, i) => ({ row: i + 1, instruction: r.instruction }));

test('raglan sweater: every size self-validates with zero issues', () => {
  for (const size of Object.keys(SWEATER_SIZES)) {
    const gen = raglanSweater({ size }, gauge);
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `${size}: ${JSON.stringify(v.issues)}`);
    assert.ok(v.verified, `${size} should verify (checked ${v.checkedSteps}/${v.countedSteps})`);
    // Geometry invariants: the divide conserves stitches (held + worked = yoke)
    // and the body is joined with underarm ease.
    const m = gen.meta;
    assert.equal(m.bodySts, m.yokeSts - 2 * m.sleeveHeld + 2 * m.underarm, `${size} divide arithmetic`);
    assert.equal(m.sleeveSts, m.sleeveHeld + m.underarm, `${size} sleeve arithmetic`);
    assert.ok(m.yokeSts % 4 === 0 && m.neckSts % 4 === 0, `${size} raglan quarters stay whole`);
  }
});

test('sock and mitten: every size self-validates and closes to 6', () => {
  for (const size of Object.keys(SOCK_SIZES)) {
    const gen = sock({ size }, gauge);
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `sock ${size}: ${JSON.stringify(v.issues)}`);
    assert.ok(v.verified, `sock ${size} should verify`);
    assert.equal(gen.finalCount, 6, `sock ${size} heel closes`);
  }
  for (const size of Object.keys(MITTEN_SIZES)) {
    const gen = mitten({ size }, gauge);
    const v = validatePattern(stepsOf(gen));
    assert.equal(v.issues.length, 0, `mitten ${size}: ${JSON.stringify(v.issues)}`);
    assert.ok(v.verified, `mitten ${size} should verify`);
    assert.equal(gen.finalCount, 6, `mitten ${size} top closes`);
  }
});

test('validator derives the raglan idiom exactly and flags a lying round', () => {
  // 40 → 48: 4 × (8 plain + 2 doubled) consumed 40, produced 48.
  assert.equal(
    computeExpectedCount(
      '[Single crochet in next 8 stitches, 2 single crochet in each of the next 2 stitches] repeat 4 times — the doubled stitches trace the four raglan lines. (48 stitches)',
      40
    ),
    48
  );
  // Mismatched running count → skipped, never guessed.
  assert.equal(
    computeExpectedCount(
      '[Single crochet in next 8 stitches, 2 single crochet in each of the next 2 stitches] repeat 4 times. (48 stitches)',
      44
    ),
    null
  );
  const v = validatePattern([
    { row: 1, instruction: 'Chain 40. Join with a slip stitch to the first chain to form a ring, being careful not to twist. Single crochet in each chain around. (40 stitches)' },
    { row: 2, instruction: '[Single crochet in next 8 stitches, 2 single crochet in each of the next 2 stitches] repeat 4 times. (50 stitches)' },
  ]);
  assert.equal(v.issues.length, 1, 'a raglan round that lies must be flagged');
  assert.equal(v.issues[0].expected, 48);
  assert.equal(v.issues[0].declared, 50);
});

test('validator derives the chain-over opening as count-neutral', () => {
  assert.equal(
    computeExpectedCount(
      'Chain 10, skip the next 10 stitches (this gap becomes the thumb opening), then single crochet in each remaining stitch around. Work into the chains on the next round. (42 stitches)',
      42
    ),
    42
  );
  // Chains ≠ skipped stitches → not modelled, skipped.
  assert.equal(
    computeExpectedCount('Chain 8, skip the next 10 stitches, then single crochet in each remaining stitch around. (40 stitches)', 42),
    null
  );
});

test('compiler: a sized wardrobe spec compiles verified end-to-end', () => {
  const result = compileDesignSpec({
    name: 'Winter Set',
    category: 'Wearable',
    yarnWeight: 'Worsted',
    parts: [
      { name: 'Sweater', shape: 'raglanSweater', dimensions: { size: 'adult-m' }, color: 'rust' },
      { name: 'Socks', shape: 'sock', dimensions: { size: 'adult-m' }, color: 'cream', quantity: 2 },
      { name: 'Mittens', shape: 'mitten', dimensions: { size: 'adult-m' }, color: 'rust', quantity: 2 },
    ],
  });
  assert.ok(result.ok, JSON.stringify(result.errors));
  const v = validatePattern(result.steps);
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
  assert.ok(v.verified, `wardrobe should verify (checked ${v.checkedSteps}/${v.countedSteps})`);
});

test('garment sizes default sensibly and scale with size', () => {
  const s = raglanSweater({}, gauge); // no size → adult-m
  assert.equal(s.meta.size, 'adult-m');
  const small = raglanSweater({ size: 'child' }, gauge);
  const large = raglanSweater({ size: 'adult-xl' }, gauge);
  assert.ok(small.meta.bodySts < large.meta.bodySts, 'chest scales with size');
  const sockS = sock({ size: 'child' }, gauge);
  const sockL = sock({ size: 'adult-l' }, gauge);
  assert.ok(sockS.meta.footSts < sockL.meta.footSts, 'foot scales with size');
});
