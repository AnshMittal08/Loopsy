// Aggregate queries for the admin observability page. Every query is
// dual-driver safe: COUNT(*)/SUM with ? params, and ISO-string timestamps
// sliced with substr() (works identically in SQLite and Postgres).

const db = require('../db');
const { recentErrors, errorCountSince } = require('./errorLogModel');

const count = async (sql, ...params) => {
  const row = await db.prepare(sql).get(...params);
  return Number(row?.n ?? 0);
};

/** Day-bucketed counts for the last `days` days: [{ d: 'YYYY-MM-DD', c }] */
async function dailyCounts(table, column, days) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  return db
    .prepare(
      `SELECT substr(${column}, 1, 10) AS d, COUNT(*) AS c
       FROM ${table}
       WHERE ${column} IS NOT NULL AND ${column} >= ?
       GROUP BY substr(${column}, 1, 10)
       ORDER BY d ASC`
    )
    .all(cutoff);
}

async function getAdminOverview() {
  const nowIso = new Date().toISOString();
  const month = nowIso.slice(0, 7);

  const [
    users, verifiedUsers, activeSessions,
    patterns, publishedPatterns, verifiedPatterns,
    designs, progressProjects, stars, collections, comments,
    openReports, rateLimitBuckets,
  ] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM users'),
    count('SELECT COUNT(*) AS n FROM users WHERE emailVerified = 1'),
    count('SELECT COUNT(*) AS n FROM sessions WHERE expiresAt > ?', nowIso),
    count('SELECT COUNT(*) AS n FROM patterns WHERE deletedAt IS NULL'),
    count('SELECT COUNT(*) AS n FROM patterns WHERE publishedAt IS NOT NULL AND deletedAt IS NULL'),
    count('SELECT COUNT(*) AS n FROM patterns WHERE verified = 1 AND deletedAt IS NULL'),
    count('SELECT COUNT(*) AS n FROM designs WHERE deletedAt IS NULL'),
    count('SELECT COUNT(*) AS n FROM progress'),
    count('SELECT COUNT(*) AS n FROM pattern_stars'),
    count('SELECT COUNT(*) AS n FROM collections'),
    count('SELECT COUNT(*) AS n FROM pattern_comments'),
    count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
    count('SELECT COUNT(*) AS n FROM rate_limits'),
  ]);

  const [signupsDaily, publishedDaily] = await Promise.all([
    dailyCounts('users', 'createdAt', 14),
    dailyCounts('patterns', 'publishedAt', 14),
  ]);

  const aiUsageRows = await db
    .prepare('SELECT type, SUM(count) AS n FROM ai_usage WHERE month = ? GROUP BY type')
    .all(month);
  const aiMonth = Object.fromEntries(aiUsageRows.map((r) => [r.type, Number(r.n)]));

  const planRows = await db
    .prepare("SELECT plan, COUNT(*) AS n FROM subscriptions WHERE status = 'active' GROUP BY plan")
    .all();
  const plans = Object.fromEntries(planRows.map((r) => [r.plan, Number(r.n)]));
  const paidUsers = Object.entries(plans).reduce((s, [p, n]) => (p === 'free' ? s : s + n), 0);
  plans.free = Math.max(0, users - paidUsers);

  const recentAudit = await db
    .prepare('SELECT action, resource, resourceId, actorId, ip, createdAt FROM audit_log ORDER BY createdAt DESC LIMIT 20')
    .all();

  const openReportRows = await db
    .prepare("SELECT id, resourceType, resourceId, reason, detail, createdAt FROM reports WHERE status = 'open' ORDER BY createdAt DESC LIMIT 20")
    .all();

  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const [errors24h, recentErrorRows] = await Promise.all([
    errorCountSince(dayAgo),
    recentErrors(15),
  ]);

  return {
    totals: {
      users, verifiedUsers, activeSessions,
      patterns, publishedPatterns, verifiedPatterns,
      designs, progressProjects, stars, collections, comments,
      openReports, rateLimitBuckets,
    },
    daily: { signups: signupsDaily, published: publishedDaily },
    aiMonth,
    plans,
    recentAudit,
    openReports: openReportRows,
    errors: { last24h: errors24h, recent: recentErrorRows },
    month,
  };
}

module.exports = { getAdminOverview };
