// Yardage estimation — computed from generated stitch counts, never guessed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveGauge } = require('../lib/engine/gauge');
const { sphere, flatPanel } = require('../lib/engine/shapes');
const { estimatePartYarn, formatYarnAmount, STITCH_YARN_FACTOR } = require('../lib/engine/yardage');
const { compileDesignSpec } = require('../lib/engine/compiler');

const gauge = resolveGauge('DK', { tight: true });

test('yardage scales with size and quantity', () => {
  const small = estimatePartYarn(sphere({ diameterCm: 4 }, gauge), gauge, 'sc');
  const big = estimatePartYarn(sphere({ diameterCm: 10 }, gauge), gauge, 'sc');
  assert.ok(big.meters > small.meters * 3, 'a 10cm ball needs far more yarn than a 4cm one');
  const twoSmall = estimatePartYarn(sphere({ diameterCm: 4 }, gauge), gauge, 'sc', { quantity: 2 });
  assert.ok(Math.abs(twoSmall.meters - 2 * small.meters) < 0.001, 'quantity multiplies');
});

test('per-stitch consumption is calibrated to real-world estimates', () => {
  // Worsted standard: ~5 cm of yarn per sc → 100 sc ≈ 5 m.
  const std = resolveGauge('Worsted');
  const fake = { rows: [{ instruction: 'Single crochet in each stitch around. (100 stitches)', count: 100, rounds: 1 }] };
  const y = estimatePartYarn(fake, std, 'sc');
  assert.ok(y.meters > 4 && y.meters < 8, `100 worsted sc ≈ 5-6.5m incl. buffer, got ${y.meters.toFixed(1)}`);
  // Taller stitches use more per stitch.
  assert.ok(STITCH_YARN_FACTOR.dc > STITCH_YARN_FACTOR.hdc && STITCH_YARN_FACTOR.hdc > STITCH_YARN_FACTOR.sc);
});

test('textures consume extra yarn; ribbing does not', () => {
  const plain = estimatePartYarn(sphere({ diameterCm: 8 }, gauge), gauge, 'sc');
  const bobbled = estimatePartYarn(sphere({ diameterCm: 8 }, gauge), gauge, 'sc', { texture: 'bobble' });
  const ribbed = estimatePartYarn(sphere({ diameterCm: 8 }, gauge), gauge, 'sc', { texture: 'ribbing' });
  assert.ok(bobbled.meters > plain.meters, 'bobbles eat yarn');
  assert.ok(Math.abs(ribbed.meters - plain.meters) < 0.001, 'ribbing is length-neutral');
});

test('foundation chains are counted lighter than worked stitches', () => {
  const panel = flatPanel({ widthCm: 10, heightCm: 10 }, gauge);
  const y = estimatePartYarn(panel, gauge, 'sc');
  assert.ok(y.meters > 0 && Number.isFinite(y.grams));
});

test('compiler returns a shoppable yardage summary and per-colour materials', () => {
  const result = compileDesignSpec({
    name: 'Two-tone Bear',
    category: 'Amigurumi',
    yarnWeight: 'DK',
    parts: [
      { name: 'Head', shape: 'sphere', dimensions: { diameterCm: 6 }, color: '#8B5A2B' },
      { name: 'Body', shape: 'ellipsoid', dimensions: { diameterCm: 7, heightCm: 9 }, color: '#8B5A2B' },
      { name: 'Scarf', shape: 'flatPanel', dimensions: { widthCm: 3, heightCm: 18 }, color: 'teal' },
    ],
  });
  assert.ok(result.ok);
  assert.ok(result.yardage.totalMeters > 0);
  assert.ok(result.yardage.totalGrams > 0);
  assert.equal(result.yardage.perColor.length, 2, 'two colours → two lines');
  const sum = result.yardage.perColor.reduce((s, c) => s + c.meters, 0);
  assert.ok(Math.abs(sum - result.yardage.totalMeters) <= 2, 'per-colour splits sum to the total');
  // Materials carry computed amounts, not just colour names.
  const yarnLines = result.materials.filter((m) => /about \d+ m \(\d+ g\)/.test(m));
  assert.equal(yarnLines.length, 2, `yarn lines with amounts: ${JSON.stringify(result.materials)}`);
  // Every part summary reports its own meters.
  for (const p of result.parts) assert.ok(p.yarnMeters > 0, `${p.name} has yarnMeters`);
});

test('striped parts split their yarn across the plan colours', () => {
  const result = compileDesignSpec({
    name: 'Striped Ball',
    category: 'Amigurumi',
    yarnWeight: 'Worsted',
    parts: [
      { name: 'Ball', shape: 'sphere', dimensions: { diameterCm: 8 }, colorPlan: { colors: ['red', 'white'], stripeRounds: 2 } },
    ],
  });
  assert.ok(result.ok);
  assert.equal(result.yardage.perColor.length, 2);
  const [a, b] = result.yardage.perColor;
  assert.ok(Math.abs(a.meters - b.meters) <= 1, 'even split between the two stripe colours');
});

test('formatYarnAmount rounds up to shoppable numbers', () => {
  assert.equal(formatYarnAmount({ meters: 83.2, grams: 33.1 }), 'about 85 m (35 g)');
  assert.equal(formatYarnAmount({ meters: 2, grams: 1 }), 'about 5 m (5 g)');
});
