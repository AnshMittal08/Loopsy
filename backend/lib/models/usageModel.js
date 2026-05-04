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

function getUsageCount(userId, type) {
  const row = getUsageCountStmt.get(userId, type, currentMonth());
  return row?.count ?? 0;
}

function incrementUsage(userId, type) {
  const now = new Date().toISOString();
  upsertUsageStmt.run(randomUUID(), userId, type, currentMonth(), now, now);
}

module.exports = { getUsageCount, incrementUsage };
