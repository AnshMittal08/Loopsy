const db = require('../db');
const { generateId } = require('../utils/helpers');

// UGC abuse reports. Deliberately simple: any signed-in user can flag a
// pattern or comment; duplicates by the same reporter collapse; moderation
// works off the `status` column (open → resolved/dismissed).

const REASONS = ['spam', 'copyright', 'inappropriate', 'harassment', 'other'];

const existsStmt = db.prepare(
  `SELECT id FROM reports WHERE reporterId = ? AND resourceType = ? AND resourceId = ? AND status = 'open'`
);

const insertStmt = db.prepare(
  `INSERT INTO reports (id, reporterId, resourceType, resourceId, reason, detail, status, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`
);

const countByReporterStmt = db.prepare(
  `SELECT COUNT(*) AS n FROM reports WHERE reporterId = ? AND createdAt > ?`
);

/** File a report. Returns { ok, duplicate } — duplicates are acknowledged, not re-inserted. */
async function fileReport({ reporterId, resourceType, resourceId, reason, detail }) {
  const dupe = await existsStmt.get(reporterId, resourceType, resourceId);
  if (dupe) return { ok: true, duplicate: true };
  await insertStmt.run(generateId(), reporterId, resourceType, resourceId, reason, detail ?? null, new Date().toISOString());
  return { ok: true, duplicate: false };
}

/** Simple abuse guard: reports filed by a user in the last 24h. */
async function reportsInLastDay(reporterId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const row = await countByReporterStmt.get(reporterId, since);
  return row ? Number(row.n) : 0;
}

module.exports = { fileReport, reportsInLastDay, REASONS };
