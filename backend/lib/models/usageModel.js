const db = require('../db/index');
const { randomUUID } = require('crypto');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const getUsageCountStmt = db.prepare(
  `SELECT count FROM ai_usage WHERE userId = ? AND type = ? AND month = ?`
);

const upsertUsageStmt = db.prepare(`
  INSERT INTO ai_usage (id, userId, type, month, count, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(userId, type, month)
  DO UPDATE SET count = count + 1, updatedAt = excluded.updatedAt
`);

async function getUsageCount(userId, type) {
  const row = await getUsageCountStmt.get(userId, type, currentMonth());
  return row?.count ?? 0;
}

async function incrementUsage(userId, type) {
  const now = new Date().toISOString();
  await upsertUsageStmt.run(randomUUID(), userId, type, currentMonth(), now, now);
}

// Lifetime (non-month-scoped) counters — for one-time entitlements like the
// free Vision Studio trial. Stored in the same table with a sentinel month.
const LIFETIME = 'lifetime';

async function getLifetimeUsageCount(userId, type) {
  const row = await getUsageCountStmt.get(userId, type, LIFETIME);
  return row?.count ?? 0;
}

async function incrementLifetimeUsage(userId, type) {
  const now = new Date().toISOString();
  await upsertUsageStmt.run(randomUUID(), userId, type, LIFETIME, now, now);
}

module.exports = {
  getUsageCount,
  incrementUsage,
  getLifetimeUsageCount,
  incrementLifetimeUsage,
};
