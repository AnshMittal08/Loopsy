import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stitchCountOf } from '../src/lib/stitchCount.js';
import { hexOf, PALETTE } from '../src/lib/yarnColors.js';

test('stitchCountOf extracts a declared stitch count', () => {
  assert.equal(stitchCountOf('Single crochet in each. (24 stitches)'), 24);
  assert.equal(stitchCountOf('Sc 6 (6 sts) Ch 1, turn.'), 6);
  assert.equal(stitchCountOf('Chain 12 (12 chains)'), 12);
});

test('stitchCountOf returns null when there is no count', () => {
  assert.equal(stitchCountOf('Fasten off and weave in ends.'), null);
  assert.equal(stitchCountOf(''), null);
  assert.equal(stitchCountOf(), null);
});

test('hexOf passes arbitrary hex colours straight through', () => {
  assert.equal(hexOf('#abc'), '#abc');
  assert.equal(hexOf('#FF6584'), '#FF6584');
});

test('hexOf resolves palette names and natural-language aliases', () => {
  assert.equal(hexOf('coral'), '#FF6584');
  assert.equal(hexOf('violet'), '#8B7CF6');
  assert.equal(hexOf('yellow'), '#FFD43B');
});

test('hexOf falls back to cream for empty/unknown input', () => {
  assert.equal(hexOf(), '#EFE3C8');
  assert.equal(hexOf('not-a-real-colour'), '#EFE3C8');
});

test('PALETTE entries are well-formed hex swatches', () => {
  assert.ok(PALETTE.length > 0);
  for (const swatch of PALETTE) {
    assert.match(swatch.hex, /^#[0-9a-fA-F]{6}$/);
    assert.equal(typeof swatch.name, 'string');
  }
});
