#!/usr/bin/env node
// Online SQLite backup. Safe to run against a live DB (better-sqlite3's
// .backup() copies a consistent snapshot without locking out writers).
//
//   node scripts/backup-db.js            → backups/data-<timestamp>.db
//   DB_PATH=/data/data.db node scripts/backup-db.js
//
// Restore is just a file copy back to DB_PATH while the server is stopped.
// In production, schedule this (cron / Railway scheduled job) and ship the
// output to object storage (R2/S3) — local disk is not a backup.

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const src = process.env.DB_PATH || path.join(__dirname, '../data.db');
if (!fs.existsSync(src)) {
  console.error(`No database at ${src}`);
  process.exit(1);
}

const dir = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(dir, `data-${stamp}.db`);

const db = new Database(src, { readonly: true });
db.backup(dest)
  .then(() => {
    const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(2);
    console.log(`Backed up ${src} → ${dest} (${mb} MB)`);
    db.close();
  })
  .catch((err) => {
    console.error('Backup failed:', err.message);
    db.close();
    process.exit(1);
  });
