import { test, expect } from 'vitest';
import { toUkTerms, renderTerms } from '../src/lib/terms.js';

test('US → UK conversion is single-pass (no double conversion)', () => {
  expect(toUkTerms('Single crochet in each stitch around.')).toBe('Double crochet in each stitch around.');
  expect(toUkTerms('Double crochet in each stitch.')).toBe('Treble crochet in each stitch.');
  expect(toUkTerms('half double crochet 2 together')).toBe('half treble crochet 2 together');
  // The tricky case: sc AND dc in one sentence — each converts exactly once.
  expect(toUkTerms('2 single crochet, then double crochet in next stitch'))
    .toBe('2 double crochet, then treble crochet in next stitch');
});

test('abbreviations convert with word boundaries', () => {
  expect(toUkTerms('Sc 2 together around.')).toBe('Dc 2 together around.');
  expect(toUkTerms('12 hdc into ring')).toBe('12 htr into ring');
  // "scarf" must not become "dcarf".
  expect(toUkTerms('a cozy scarf')).toBe('a cozy scarf');
});

test('renderTerms is a no-op in US mode and null-safe', () => {
  expect(renderTerms('single crochet', 'us')).toBe('single crochet');
  expect(renderTerms('', 'uk')).toBe('');
  expect(renderTerms(null, 'uk')).toBe(null);
});
