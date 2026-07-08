// First-party error visibility — capture unhandled API failures so a prod
// crash is seen on /admin, not only when a user complains. No third party.

const { randomUUID } = require('crypto');
const db = require('../db');

/** Record one server error. Best-effort: logging a failure must never throw. */
async function recordError({ route, method = null, message, stack = null, statusCode = 500, userId = null }) {
  try {
    await db
      .prepare(
        `INSERT INTO error_log (id, route, method, message, stack, statusCode, userId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        String(route || 'unknown').slice(0, 200),
        method ? String(method).slice(0, 10) : null,
        String(message || 'Unknown error').slice(0, 500),
        stack ? String(stack).slice(0, 4000) : null,
        Number(statusCode) || 500,
        userId,
        new Date().toISOString()
      );
  } catch {
    /* swallow — telemetry must never break the request */
  }
}

async function recentErrors(limit = 25) {
  return db
    .prepare('SELECT route, method, message, statusCode, createdAt FROM error_log ORDER BY createdAt DESC LIMIT ?')
    .all(limit);
}

/** Errors-by-route in the last `hours`, most frequent first. */
async function errorCountsByRoute(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
  return db
    .prepare(
      `SELECT route, COUNT(*) AS c FROM error_log WHERE createdAt >= ?
       GROUP BY route ORDER BY c DESC LIMIT 10`
    )
    .all(cutoff);
}

async function errorCountLastDay() {
  const cutoff = new Date(Date.now() - 86400000).toISOString();
  const row = await db.prepare('SELECT COUNT(*) AS n FROM error_log WHERE createdAt >= ?').get(cutoff);
  return Number(row?.n ?? 0);
}

module.exports = { recordError, recentErrors, errorCountsByRoute, errorCountLastDay };
