// Account lifecycle — data export (GDPR access) and account deletion
// (GDPR erasure). Deletion cascades hard where the row is private to the user
// and anonymizes where it is community-visible, so nothing dangles and no
// personal data survives. Diagnostic rows (error_log) are kept but scrubbed
// of the userId link — useful for ops, no longer personal data.

const db = require('../db');

/**
 * Everything we hold about a user, as a portable JSON object. Read-only; used
 * by the "download my data" export before deletion and on its own.
 */
async function exportUserData(userId) {
  const get = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);

  const user = await get('SELECT id, email, name, skillLevel, handle, bio, emailVerified, createdAt FROM users WHERE id = ?', userId);
  const [subscription, patterns, designs, progress, collections, comments, stars, notifications, learningProgress, identities] = await Promise.all([
    get('SELECT plan, status, createdAt, updatedAt FROM subscriptions WHERE userId = ?', userId),
    all('SELECT id, title, category, difficulty, verified, publishedAt, createdAt FROM patterns WHERE userId = ? AND deletedAt IS NULL', userId),
    all('SELECT id, name, patternId, createdAt, updatedAt FROM designs WHERE userId = ? AND deletedAt IS NULL', userId),
    all('SELECT patternId, progressPercentage, totalSteps, notes, createdAt FROM progress WHERE userId = ?', userId),
    all('SELECT id, name, createdAt FROM collections WHERE userId = ?', userId),
    all('SELECT patternId, body, createdAt FROM pattern_comments WHERE userId = ?', userId),
    all('SELECT patternId, createdAt FROM pattern_stars WHERE userId = ?', userId),
    all('SELECT type, message, createdAt FROM notifications WHERE userId = ?', userId),
    all('SELECT guideSlug, readAt, bookmarked, updatedAt FROM learning_progress WHERE userId = ?', userId),
    all('SELECT provider, email, createdAt FROM user_identities WHERE userId = ?', userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: user || null,
    subscription: subscription || null,
    patterns,
    designs,
    progress,
    collections,
    comments,
    stars,
    notifications,
    learningProgress,
    linkedSignIns: identities,
  };
}

// Tables whose rows are private to the user and are hard-deleted by userId.
// (collection_patterns is handled separately — no userId; reports keys on
// reporterId; notifications keys on both userId and actorId.)
const PRIVATE_TABLES = [
  'progress', 'designs', 'collections',
  'pattern_stars', 'ai_usage', 'sessions', 'email_tokens', 'learning_progress', 'user_identities',
];

/**
 * Permanently delete a user. Private rows are removed; community-visible
 * contributions (published patterns, comments) are anonymized so threads and
 * feeds don't break, and the user record itself is scrubbed and tombstoned.
 *
 * Returns a small summary for the audit log.
 */
async function deleteUserAccount(userId) {
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const now = new Date().toISOString();

  // 1. Hard-delete private rows. collection_patterns first (FK-ish ordering).
  await run('DELETE FROM collection_patterns WHERE collectionId IN (SELECT id FROM collections WHERE userId = ?)', userId);
  for (const table of PRIVATE_TABLES) {
    await run(`DELETE FROM ${table} WHERE userId = ?`, userId);
  }
  // Tables that key on something other than userId.
  await run('DELETE FROM reports WHERE reporterId = ?', userId);
  // Notifications the user received AND ones they caused for others.
  await run('DELETE FROM notifications WHERE userId = ? OR actorId = ?', userId, userId);

  // 2. Anonymize community-visible contributions.
  //    Published patterns disappear from the community (soft-deleted); drafts
  //    go too — the maker asked to erase their account.
  await run('UPDATE patterns SET deletedAt = ?, publishedAt = NULL WHERE userId = ? AND deletedAt IS NULL', now, userId);
  //    Comments stay for thread integrity but lose the author link.
  await run('UPDATE pattern_comments SET userId = ? WHERE userId = ?', 'deleted-user', userId);

  // 3. Scrub + tombstone the user row (kept so FKs like comment.user="deleted-user"
  //    resolve, and the email can't be reused to impersonate). Email is nulled so
  //    the address is freed and no PII remains.
  await run(
    `UPDATE users SET email = ?, name = ?, passwordHash = ?, handle = NULL, bio = NULL, deletedAt = ? WHERE id = ?`,
    `deleted+${userId}@loopsy.invalid`, 'Deleted maker', 'deleted', now, userId
  );
  await run('DELETE FROM subscriptions WHERE userId = ?', userId);

  // Diagnostic rows stay useful for the admin ops panel, but the PII link
  // to this specific person is dropped.
  await run('UPDATE error_log SET userId = NULL WHERE userId = ?', userId);

  return { userId, deletedAt: now };
}

module.exports = { exportUserData, deleteUserAccount };
