import { test, expect } from 'vitest';
import { stitchCountOf } from '../src/lib/stitchCount.js';
import { hexOf, PALETTE } from '../src/lib/yarnColors.js';

test('stitchCountOf extracts a declared stitch count', () => {
  expect(stitchCountOf('Single crochet in each. (24 stitches)')).toBe(24);
  expect(stitchCountOf('Sc 6 (6 sts) Ch 1, turn.')).toBe(6);
  expect(stitchCountOf('Chain 12 (12 chains)')).toBe(12);
});

test('stitchCountOf returns null when there is no count', () => {
  expect(stitchCountOf('Fasten off and weave in ends.')).toBeNull();
  expect(stitchCountOf('')).toBeNull();
  expect(stitchCountOf()).toBeNull();
});

test('hexOf passes arbitrary hex colours straight through', () => {
  expect(hexOf('#abc')).toBe('#abc');
  expect(hexOf('#FF6584')).toBe('#FF6584');
});

test('hexOf resolves palette names and natural-language aliases', () => {
  expect(hexOf('coral')).toBe('#FF6584');
  expect(hexOf('violet')).toBe('#8B7CF6');
  expect(hexOf('yellow')).toBe('#FFD43B');
});

test('hexOf falls back to cream for empty/unknown input', () => {
  expect(hexOf()).toBe('#EFE3C8');
  expect(hexOf('not-a-real-colour')).toBe('#EFE3C8');
});

test('PALETTE entries are well-formed hex swatches', () => {
  expect(PALETTE.length).toBeGreaterThan(0);
  for (const swatch of PALETTE) {
    expect(swatch.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof swatch.name).toBe('string');
  }
});
