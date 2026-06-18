const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compileChart, compileMedallion, encodeRow } = require('../lib/engine/chart');
const { validatePattern } = require('../lib/engine/validator');

const ringGrid = (N) => {
  const cx = (N - 1) / 2, cy = (N - 1) / 2, maxR = N / 2;
  const g = [];
  for (let r = 0; r < N; r++) {
    const row = [];
    for (let c = 0; c < N; c++) {
      const d = Math.hypot(c - cx, r - cy) / maxR;
      row.push(d <= 0.3 ? 'blue' : d <= 0.6 ? 'cream' : 'red');
    }
    g.push(row);
  }
  return g;
};

test('encodeRow run-length-encodes and names hex colours', () => {
  assert.equal(encodeRow(['cream', 'cream', 'red', 'cream']), '2 cream, 1 red, 1 cream');
  assert.equal(encodeRow(['#1fa39a', '#1fa39a', 'cream']), '2 teal, 1 cream');
});

test('flat chart: every row is exactly cols stitches and verifies', () => {
  const out = compileChart({ name: 'x', yarnWeight: 'Worsted', cols: 12, rows: 10, grid: ringGrid(12).slice(0, 10) });
  assert.ok(out.ok);
  const v = validatePattern(out.steps);
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
});

test('flat chart rejects a mismatched grid', () => {
  const out = compileChart({ cols: 5, rows: 5, grid: [[1, 2, 3]] });
  assert.equal(out.ok, false);
});

test('medallion (worked in the round) verifies for a shield', () => {
  const out = compileMedallion({ name: 'Shield', yarnWeight: 'Worsted', cols: 25, rows: 25, grid: ringGrid(25) });
  assert.ok(out.ok);
  const v = validatePattern(out.steps);
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
  assert.ok(v.verified, 'shield medallion should verify');
  assert.match(out.finishedSize, /worked in the round/);
});
