import { test, expect } from 'vitest';
import { SHAPE_KIT, DIM_LABEL, shapeDef, partGeometry, partBBox, DEFAULT_PROFILE } from '../src/lib/shapeKit.js';

const PX = 10;

const partFor = (def) => ({ shape: def.shape, dims: JSON.parse(JSON.stringify(def.dims)), x: 200, y: 200 });

test('every kit shape produces drawable geometry and a positive bbox', () => {
  for (const def of SHAPE_KIT) {
    const part = partFor(def);
    const geo = partGeometry(part, PX);
    expect(geo && typeof geo.type === 'string', `${def.shape} geometry`).toBe(true);
    if (geo.type === 'path') expect(geo.d.length).toBeGreaterThan(10);
    if (geo.type === 'polygon') expect(geo.points.split(' ').length).toBeGreaterThanOrEqual(3);

    const box = partBBox(part, PX);
    expect(box.w, `${def.shape} bbox width`).toBeGreaterThan(0);
    expect(box.h, `${def.shape} bbox height`).toBeGreaterThan(0);
    // The bbox must contain the part's anchor point.
    expect(box.x).toBeLessThanOrEqual(part.x);
    expect(box.x + box.w).toBeGreaterThanOrEqual(part.x);
  }
});

test('every kit dimension has a human label and a slider field', () => {
  for (const def of SHAPE_KIT) {
    for (const field of def.fields) {
      expect(DIM_LABEL[field], `${def.shape}.${field} needs a DIM_LABEL`).toBeTruthy();
      if (def.shape !== 'revolve') {
        expect(def.dims[field], `${def.shape}.${field} needs a default`).toBeGreaterThan(0);
      }
    }
  }
});

test('shapeDef resolves every kit shape and rejects unknowns', () => {
  for (const def of SHAPE_KIT) expect(shapeDef(def.shape)).toBe(def);
  expect(shapeDef('dodecahedron')).toBeUndefined();
});

test('unknown shapes fall back to a selectable placeholder, never crash', () => {
  const part = { shape: 'mystery', dims: {}, x: 50, y: 60 };
  expect(partGeometry(part, PX).type).toBe('circle');
  const box = partBBox(part, PX);
  expect(box.w).toBeGreaterThan(0);
});

test('the default sculpt profile is normalized and sorted', () => {
  expect(DEFAULT_PROFILE[0].t).toBe(0);
  expect(DEFAULT_PROFILE[DEFAULT_PROFILE.length - 1].t).toBe(1);
  for (let i = 1; i < DEFAULT_PROFILE.length; i++) {
    expect(DEFAULT_PROFILE[i].t).toBeGreaterThan(DEFAULT_PROFILE[i - 1].t);
  }
});
