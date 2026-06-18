const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

// Use a throwaway DB so the seed runs in isolation.
process.env.DB_PATH = path.join(os.tmpdir(), `loopsy-test-${process.pid}.db`);

const { getAllTemplates, getTemplateById } = require('../lib/models/templateModel');
const { validatePattern } = require('../lib/engine');

test('no seed template contains an arithmetic error (the trust guarantee)', () => {
  let issues = 0;
  for (const summary of getAllTemplates()) {
    const t = getTemplateById(summary.id);
    const steps = (t.defaultPattern || []).map((instruction, i) => ({ row: i + 1, instruction }));
    const v = validatePattern(steps);
    if (v.issues.length) {
      issues += v.issues.length;
      console.error(`${t.name}:`, v.issues.map((x) => `row ${x.row} expected ${x.expected} got ${x.declared}`));
    }
  }
  assert.equal(issues, 0, 'a template has wrong stitch math');
});

test('at least the known-good templates earn the Verified badge', () => {
  const verified = getAllTemplates()
    .map((s) => getTemplateById(s.id))
    .filter((t) => validatePattern((t.defaultPattern || []).map((instruction, i) => ({ row: i + 1, instruction }))).verified);
  assert.ok(verified.length >= 7, `expected ≥7 verified templates, got ${verified.length}`);
});
