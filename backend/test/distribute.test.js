const { test } = require('node:test');
const assert = require('node:assert/strict');
const { increaseRow, decreaseRow, evenRow, shapeRow } = require('../lib/engine/distribute');

const declared = (instruction) => {
  const m = instruction.match(/\((\d+) stitches\)/);
  return m ? parseInt(m[1], 10) : null;
};

test('increaseRow: every prev/inc yields the exact target, and the text matches', () => {
  for (let prev = 6; prev <= 120; prev++) {
    for (let inc = 0; inc <= prev; inc++) {
      const r = increaseRow(prev, inc, 'sc');
      assert.equal(r.count, prev + inc, `increase ${prev}+${inc}`);
      assert.equal(declared(r.instruction), r.count, `declared text ${prev}+${inc}: ${r.instruction}`);
    }
  }
});

test('decreaseRow: every prev/dec (≤ prev/2) yields the exact target, text matches', () => {
  for (let prev = 6; prev <= 120; prev++) {
    for (let dec = 0; dec <= Math.floor(prev / 2); dec++) {
      const r = decreaseRow(prev, dec, 'sc');
      assert.equal(r.count, prev - dec, `decrease ${prev}-${dec}`);
      assert.equal(declared(r.instruction), r.count, `declared text ${prev}-${dec}: ${r.instruction}`);
    }
  }
});

test('increaseRow clamps inc to at most doubling', () => {
  const r = increaseRow(12, 99, 'sc');
  assert.equal(r.count, 24);
});

test('decreaseRow clamps dec to at most halving', () => {
  const r = decreaseRow(12, 99, 'sc');
  assert.equal(r.count, 6);
});

test('evenRow keeps the count', () => {
  assert.equal(evenRow(30, 'sc').count, 30);
});

test('shapeRow routes up, down, and flat correctly', () => {
  assert.equal(shapeRow(30, 36).count, 36);
  assert.equal(shapeRow(36, 30).count, 30);
  assert.equal(shapeRow(30, 30).count, 30);
});

test('uniform increase emits a single clean bracket', () => {
  assert.match(increaseRow(42, 6).instruction, /repeat 6 times\. \(48 stitches\)$/);
});
