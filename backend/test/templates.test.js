const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

// Use a throwaway DB so the seed runs in isolation.
delete process.env.DATABASE_URL; // tests always run against SQLite
process.env.DB_PATH = path.join(os.tmpdir(), `loopsy-test-${process.pid}.db`);

const { getAllTemplates, getTemplateById } = require('../lib/models/templateModel');
const { validatePattern } = require('../lib/engine');

test('no seed template contains an arithmetic error (the trust guarantee)', async () => {
  let issues = 0;
  for (const summary of await getAllTemplates()) {
    const t = await getTemplateById(summary.id);
    const steps = (t.defaultPattern || []).map((instruction, i) => ({ row: i + 1, instruction }));
    const v = validatePattern(steps);
    if (v.issues.length) {
      issues += v.issues.length;
      console.error(`${t.name}:`, v.issues.map((x) => `row ${x.row} expected ${x.expected} got ${x.declared}`));
    }
  }
  assert.equal(issues, 0, 'a template has wrong stitch math');
});

test('at least the known-good templates earn the Verified badge', async () => {
  const summaries = await getAllTemplates();
  let verified = 0;
  for (const s of summaries) {
    const t = await getTemplateById(s.id);
    const steps = (t.defaultPattern || []).map((instruction, i) => ({ row: i + 1, instruction }));
    if (validatePattern(steps).verified) verified += 1;
  }
  assert.ok(verified >= 30, `expected ≥30 verified templates, got ${verified}`);
});
