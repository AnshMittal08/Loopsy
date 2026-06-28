#!/usr/bin/env node
/**
 * Applies the SQL migrations in backend/migrations/ (in filename order) to the
 * Postgres database named by DATABASE_URL. Idempotent — every migration uses
 * IF NOT EXISTS / ON CONFLICT, so re-running is safe.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/migrate.js
 *   # or, with the URL in backend/.env (gitignored):
 *   node -r dotenv/config scripts/migrate.js   # if dotenv present
 *
 * Run this from an environment that can reach the database (e.g. Railway, your
 * laptop, or a CI step) — NOT from a sandbox whose egress blocks the DB host.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Fallback: parse backend/.env (gitignored) if present.
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
    if (line) return line.slice('DATABASE_URL='.length).trim();
  } catch { /* no .env */ }
  return null;
}

async function main() {
  // --allow-skip (used by the deploy workflow): a missing DATABASE_URL is a
  // graceful no-op rather than a failure, so the migrate job stays green on
  // repos/forks that haven't configured the secret yet.
  const allowSkip = process.argv.includes('--allow-skip');
  const url = readDatabaseUrl();
  if (!url) {
    if (allowSkip) {
      console.log('• DATABASE_URL not set — skipping migrations (nothing to apply).');
      return;
    }
    console.error('✗ DATABASE_URL is not set. Pass it as an env var or put it in backend/.env');
    process.exit(1);
  }

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  // sslmode=require is in the URL; Neon's cert chain is public, so default
  // verification is fine. rejectUnauthorized:false only as a fallback.
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      process.stdout.write(`→ applying ${file} ... `);
      await client.query(sql);
      console.log('ok');
    }
    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
    );
    console.log(`✓ migrations complete — ${rows[0].n} tables in public schema`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('✗ migration failed:', e.message);
  process.exit(1);
});
