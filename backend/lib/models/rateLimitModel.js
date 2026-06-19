const db = require('../db');

// A tiny rolling-window counter keyed by an opaque bucket string.
// DB-backed so it survives restarts and works for the single-instance
// deployment today; the same API can be re-pointed at Redis later.

const getStmt = db.prepare(`SELECT bucket, count, windowStart FROM rate_limits WHERE bucket = ?`);
const setStmt = db.prepare(`
  INSERT INTO rate_limits (bucket, count, windowStart)
  VALUES (?, ?, ?)
  ON CONFLICT(bucket) DO UPDATE SET count = excluded.count, windowStart = excluded.windowStart
`);
const deleteStmt = db.prepare(`DELETE FROM rate_limits WHERE bucket = ?`);

function isExpired(windowStart, windowMs) {
  return Date.now() - new Date(windowStart).getTime() > windowMs;
}

/** Current count for a bucket within the rolling window (0 if none/expired). */
function peek(bucket, windowMs) {
  const row = getStmt.get(bucket);
  if (!row || isExpired(row.windowStart, windowMs)) return 0;
  return row.count;
}

/** Record one hit and return the new count within the rolling window. */
function hit(bucket, windowMs) {
  const row = getStmt.get(bucket);
  if (!row || isExpired(row.windowStart, windowMs)) {
    setStmt.run(bucket, 1, new Date().toISOString());
    return 1;
  }
  const next = row.count + 1;
  setStmt.run(bucket, next, row.windowStart);
  return next;
}

/** Clear a bucket (e.g. after a successful login). */
function clear(bucket) {
  deleteStmt.run(bucket);
}

module.exports = { peek, hit, clear };
