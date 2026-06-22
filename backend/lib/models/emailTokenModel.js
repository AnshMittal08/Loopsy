const db = require('../db');
const crypto = require('crypto');

// Single-use, expiring tokens for email verification and password reset.
// Only the SHA-256 hash of the token is stored — the raw token lives only in
// the email link, so a DB leak can't be replayed.

const insertStmt = db.prepare(`
  INSERT INTO email_tokens (id, userId, type, tokenHash, expiresAt, usedAt, createdAt)
  VALUES (?, ?, ?, ?, ?, NULL, ?)
`);
const getByHashStmt = db.prepare(`
  SELECT id, userId, type, expiresAt, usedAt FROM email_tokens WHERE tokenHash = ?
`);
const markUsedStmt = db.prepare(`UPDATE email_tokens SET usedAt = ? WHERE id = ? AND usedAt IS NULL`);
const invalidateForUserStmt = db.prepare(
  `UPDATE email_tokens SET usedAt = ? WHERE userId = ? AND type = ? AND usedAt IS NULL`
);

function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a token of a given type. Invalidates any prior unused tokens of the
 * same type for the user (one live link at a time). Returns the RAW token.
 */
async function createEmailToken({ userId, type, ttlMs }) {
  await invalidateForUserStmt.run(new Date().toISOString(), userId, type);
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  await insertStmt.run(
    crypto.randomUUID(),
    userId,
    type,
    hash(token),
    new Date(now + ttlMs).toISOString(),
    new Date(now).toISOString()
  );
  return token;
}

/**
 * Consume a raw token: returns { userId } when valid+unused+unexpired and marks
 * it used; otherwise null.
 */
async function consumeEmailToken(token, type) {
  if (!token) return null;
  const row = await getByHashStmt.get(hash(token));
  if (!row || row.type !== type || row.usedAt) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  const info = await markUsedStmt.run(new Date().toISOString(), row.id);
  if (info.changes === 0) return null; // lost a race
  return { userId: row.userId };
}

module.exports = { createEmailToken, consumeEmailToken };
