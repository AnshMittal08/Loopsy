// Account lifecycle — GDPR-grade data export and permanent deletion.
//
// Export gathers everything tied to a user into one JSON payload.
// Delete permanently removes the account and everything that identifies the
// person: patterns, designs, progress, collections, comments, stars,
// notifications, sessions, subscriptions, AI usage, reports they filed, and
// email tokens. Published patterns DISAPPEAR (the privacy-respecting default).
// The audit_log keeps a single tombstone row (no PII) for accountability.

const db = require('../db');

/** Gather all of a user's data as a portable JSON object. */
async function exportUserData(userId) {
  const q = (sql, ...p) => db.prepare(sql).all(...p);
  const one = async (sql, ...p) => db.prepare(sql).get(...p);

  const [user, subscription, patterns, designs, progress, collections, comments, stars, notifications, usage] = await Promise.all([
    one('SELECT id, email, name, skillLevel, handle, bio, emailVerified, createdAt FROM users WHERE id = ?', userId),
    one('SELECT plan, status, createdAt, updatedAt FROM subscriptions WHERE userId = ?', userId),
    q('SELECT id, title, difficulty, category, verified, publishedAt, createdAt FROM patterns WHERE userId = ? AND deletedAt IS NULL', userId),
    q('SELECT id, name, spec, patternId, createdAt, updatedAt FROM designs WHERE userId = ? AND deletedAt IS NULL', userId),
    q('SELECT id, patternId, progressPercentage, notes, createdAt FROM progress WHERE userId = ?', userId),
    q('SELECT id, name, createdAt FROM collections WHERE userId = ?', userId),
    q('SELECT id, patternId, body, createdAt FROM pattern_comments WHERE userId = ?', userId),
    q('SELECT patternId, createdAt FROM pattern_stars WHERE userId = ?', userId),
    q('SELECT id, type, message, readAt, createdAt FROM notifications WHERE userId = ?', userId),
    q('SELECT type, month, count FROM ai_usage WHERE userId = ?', userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: user || null,
    subscription: subscription || null,
    patterns,
    designs: designs.map((d) => ({ ...d, spec: safeJson(d.spec) })),
    progress,
    collections,
    comments,
    stars,
    notifications,
    aiUsage: usage,
  };
}

function safeJson(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return s; }
}

/**
 * Permanently delete a user and everything identifying them, in one
 * transaction. Leaves a PII-free tombstone in audit_log.
 * @returns {Promise<boolean>} true if a user row was removed
 */
async function deleteUserAccount(userId) {
  return db.withTransaction(async (tx) => {
    const del = async (sql) => { await tx.prepare(sql).run(userId); };

    // Membership / reactions first (FK-free but keep it tidy).
    await del('DELETE FROM collection_patterns WHERE collectionId IN (SELECT id FROM collections WHERE userId = ?)');
    await del('DELETE FROM collections WHERE userId = ?');
    await del('DELETE FROM pattern_stars WHERE userId = ?');
    await del('DELETE FROM pattern_comments WHERE userId = ?');
    await del('DELETE FROM notifications WHERE userId = ?');
    await del('DELETE FROM notifications WHERE actorId = ?');
    await del('DELETE FROM progress WHERE userId = ?');
    await del('DELETE FROM designs WHERE userId = ?');
    await del('DELETE FROM patterns WHERE userId = ?');
    await del('DELETE FROM reports WHERE reporterId = ?');
    await del('DELETE FROM ai_usage WHERE userId = ?');
    await del('DELETE FROM email_tokens WHERE userId = ?');
    await del('DELETE FROM subscriptions WHERE userId = ?');
    await del('DELETE FROM sessions WHERE userId = ?');

    const info = await tx.prepare('DELETE FROM users WHERE id = ?').run(userId);

    // Tombstone: accountability without retaining any personal data.
    await tx.prepare(
      `INSERT INTO audit_log (id, actorId, action, resource, resourceId, meta, ip, createdAt)
       VALUES (?, NULL, 'account.deleted', 'user', ?, NULL, NULL, ?)`
    ).run(cryptoRandom(), userId, new Date().toISOString());

    return (info.changes || 0) > 0;
  });
}

function cryptoRandom() {
  return require('crypto').randomUUID();
}

module.exports = { exportUserData, deleteUserAccount };
