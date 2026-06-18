const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compileDesignSpec, validatePattern, normalizeDesignSpec, validateDesignSpec } = require('../lib/engine');
const { colorName } = require('../lib/engine/colorName');

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

test('colorName maps hex to readable names and passes palette names through', () => {
  assert.equal(colorName('#c4622d'), 'rust');
  assert.equal(colorName('#1fa39a'), 'teal');
  assert.equal(colorName('cream'), 'cream');
  assert.equal(colorName('Deep Red'), 'Deep Red');
});
