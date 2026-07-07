// Captured unhandled API errors — the missing "is prod on fire?" signal for
// the admin ops panel. Best-effort: logging an error must never throw.

const { randomUUID } = require('crypto');
const db = require('../db');

async function recordError({ route = null, method = null, message, stack = null, userId = null }) {
  try {
    await db
      .prepare(
        `INSERT INTO error_log (id, route, method, message, stack, userId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        route,
        method,
        String(message || 'Unknown error').slice(0, 500),
        stack ? String(stack).slice(0, 4000) : null,
        userId,
        new Date().toISOString()
      );
  } catch {
    /* swallow — observability must never break the request */
  }
}

async function recentErrors(limit = 20) {
  return db
    .prepare('SELECT id, route, method, message, userId, createdAt FROM error_log ORDER BY createdAt DESC LIMIT ?')
    .all(limit);
}

async function errorCountSince(sinceIso) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM error_log WHERE createdAt >= ?').get(sinceIso);
  return Number(row?.n ?? 0);
}

module.exports = { recordError, recentErrors, errorCountSince };
