import { test, expect } from 'vitest';
import { partsFromSpec } from '../src/lib/designHydrate.js';

const spec = {
  parts: [
    {
      name: 'Body', shape: 'splitLimbBody',
      dimensions: { limbDiameterCm: 3, limbHeightCm: 5, bodyDiameterCm: 8, bodyHeightCm: 7 },
      color: 'teal', quantity: 1, stitch: 'sc', texture: 'bobble',
      layout: { x: 210, y: 260 }, face: true,
      colorPlan: { colors: ['teal', 'cream'], stripeRounds: 2 },
    },
    { name: 'Star', shape: 'star', dimensions: { sizeCm: 8 }, color: 'gold' },
  ],
};

test('partsFromSpec round-trips every editable field', () => {
  const [body, star] = partsFromSpec(spec);
  expect(body.shape).toBe('splitLimbBody');
  expect(body.dims).toEqual(spec.parts[0].dimensions);
  expect(body.texture).toBe('bobble');
  expect(body.colorPlan).toEqual({ colors: ['teal', 'cream'], stripeRounds: 2 });
  expect(body.face).toBe(true);
  expect(body.x).toBe(210);
  expect(body.y).toBe(260);
  // Optional fields absent from the spec stay absent (not undefined keys).
  expect('texture' in star).toBe(false);
  expect('colorPlan' in star).toBe(false);
  expect(star.quantity).toBe(1);
  expect(star.stitch).toBe('sc');
});

test('parts without layout get staggered, finite positions', () => {
  const parts = partsFromSpec({ parts: [{ shape: 'sphere', dimensions: { diameterCm: 6 } }, { shape: 'sphere', dimensions: { diameterCm: 6 } }] });
  for (const p of parts) {
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  }
  expect(parts[0].id).not.toBe(parts[1].id);
});

test('a malformed spec degrades to an empty part list', () => {
  expect(partsFromSpec(null)).toEqual([]);
  expect(partsFromSpec({})).toEqual([]);
  expect(partsFromSpec({ parts: 'nope' })).toEqual([]);
});
