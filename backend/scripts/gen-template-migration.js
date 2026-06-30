#!/usr/bin/env node
/**
 * Generates backend/migrations/0008_seed_generated_templates.sql from the
 * engine-compiled catalog templates (lib/models/generatedTemplates.js), so the
 * Postgres seed for the generated templates is a DERIVED artifact — never hand
 * maintained, always consistent with the engine. Re-run after changing recipes:
 *
 *   node scripts/gen-template-migration.js
 *
 * Idempotent on apply: ON CONFLICT(id) DO UPDATE (createdAt preserved).
 */
const fs = require('fs');
const path = require('path');
const { buildGeneratedTemplates } = require('../lib/models/generatedTemplates');

const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `'${JSON.stringify(v ?? []).replace(/'/g, "''")}'`;

const COLS = ['id', 'name', 'description', 'difficulty', 'category', 'tags', 'imageUrl', 'hookSize', 'yarnWeight', 'timeEstimate', 'finishedSize', 'materials', 'notes', 'defaultPattern', 'createdAt'];
const UPDATE_COLS = COLS.filter((c) => c !== 'id' && c !== 'createdAt');

function row(t) {
  const vals = [
    q(t.id), q(t.name), q(t.description), q(t.difficulty), q(t.category),
    j(t.tags), q(t.imageUrl), q(t.hookSize), q(t.yarnWeight), q(t.timeEstimate),
    q(t.finishedSize), j(t.materials), j(t.notes), j(t.defaultPattern), q(t.createdAt),
  ];
  const set = UPDATE_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
  return `INSERT INTO templates (${COLS.join(', ')}) VALUES (${vals.join(', ')})\n  ON CONFLICT(id) DO UPDATE SET ${set};`;
}

const templates = buildGeneratedTemplates();
const header = `-- Loopsy — seed ${templates.length} engine-generated catalog templates.
-- GENERATED FILE — do not edit by hand. Regenerate with:
--   node scripts/gen-template-migration.js
-- Every template is compiled by lib/engine and passes the validator with zero
-- arithmetic errors. Idempotent: ON CONFLICT(id) DO UPDATE (createdAt preserved).
BEGIN;`;
const sql = `${header}\n${templates.map(row).join('\n')}\nCOMMIT;\n`;

const out = path.join(__dirname, '..', 'migrations', '0008_seed_generated_templates.sql');
fs.writeFileSync(out, sql);
console.log(`✓ wrote ${out} (${templates.length} templates)`);
