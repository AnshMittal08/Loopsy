import { test, expect } from 'vitest';
import { NAV_DESTINATIONS, navFor, isNavActive } from '../src/lib/navigation.js';

test('isNavActive matches exact paths and true sub-paths only', () => {
  expect(isNavActive('/learn', '/learn')).toBe(true);
  expect(isNavActive('/learn/magic-ring', '/learn')).toBe(true);
  // Boundary safety: /learning must NOT light up /learn.
  expect(isNavActive('/learning', '/learn')).toBe(false);
  expect(isNavActive('/community', '/learn')).toBe(false);
});

test('home is only active at the root', () => {
  expect(isNavActive('/', '/')).toBe(true);
  expect(isNavActive('/community', '/')).toBe(false);
});

test('navFor filters by placement flag and preserves order', () => {
  const top = navFor('inTopNav');
  expect(top.length).toBeGreaterThan(0);
  expect(top.every((d) => d.inTopNav)).toBe(true);
  const all = NAV_DESTINATIONS.map((d) => d.to);
  const tops = top.map((d) => d.to);
  expect(tops).toEqual(all.filter((to) => tops.includes(to)));
});

test('every destination has the fields the navs render', () => {
  for (const d of NAV_DESTINATIONS) {
    expect(typeof d.to).toBe('string');
    expect(d.to.startsWith('/')).toBe(true);
    expect(typeof d.label).toBe('string');
    expect(d.icon).toBeTruthy();
  }
});
