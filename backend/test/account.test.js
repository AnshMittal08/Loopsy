// Account lifecycle — data export (GDPR access) + deletion (GDPR erasure).
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');

const TMP = path.join(os.tmpdir(), `loopsy-account-${process.pid}-${Date.now()}.db`);
delete process.env.DATABASE_URL;
process.env.DB_PATH = TMP;

const db = require('../lib/db');
const userModel = require('../lib/models/userModel');
const { exportUserData, deleteUserAccount } = require('../lib/models/accountModel');
const { createNotification, unreadCount } = require('../lib/models/notificationModel');

const now = new Date().toISOString();

async function seedUser(id, email) {
  await userModel.createUser({
    id, email, name: `User ${id}`, passwordHash: 'x:y', skillLevel: 'beginner', handle: id, createdAt: now,
    subscription: { id: `sub_${id}`, plan: 'free', status: 'active', createdAt: now, updatedAt: now },
  });
  return id;
}

test('exportUserData returns a portable snapshot', async () => {
  const uid = await seedUser('u_export', 'export@test.com');
  await db.prepare('INSERT INTO patterns (id, userId, title, steps, createdAt) VALUES (?,?,?,?,?)').run('p_x', uid, 'My Scarf', '[]', now);
  await createNotification({ userId: uid, actorId: 'someone', type: 'star', message: 'starred' });

  const data = await exportUserData(uid);
  assert.equal(data.user.email, 'export@test.com');
  assert.equal(data.patterns.length, 1);
  assert.equal(data.patterns[0].title, 'My Scarf');
  assert.equal(data.notifications.length, 1);
  assert.ok(data.exportedAt);
});

test('deleteUserAccount erases private data, anonymizes comments, tombstones the user', async () => {
  const uid = await seedUser('u_del', 'del@test.com');
  const other = await seedUser('u_other', 'other@test.com');
  // Private + community rows for the user to be deleted.
  await db.prepare('INSERT INTO patterns (id, userId, title, steps, publishedAt, createdAt) VALUES (?,?,?,?,?,?)').run('p_del', uid, 'Published Bear', '[]', now, now);
  await db.prepare('INSERT INTO progress (id, userId, patternId, totalSteps, steps, createdAt) VALUES (?,?,?,?,?,?)').run('pr_del', uid, 'p_del', 5, '[]', now);
  await db.prepare('INSERT INTO pattern_comments (id, patternId, userId, body, createdAt) VALUES (?,?,?,?,?)').run('c_del', 'p_other', uid, 'nice work', now);
  await db.prepare('INSERT INTO pattern_stars (patternId, userId, createdAt) VALUES (?,?,?)').run('p_other', uid, now);
  await createNotification({ userId: other, actorId: uid, type: 'star', message: 'from deleted user' });
  assert.equal(await unreadCount(other), 1);

  await deleteUserAccount(uid);

  // Private rows gone.
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM progress WHERE userId = ?').get(uid)).n, 0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM pattern_stars WHERE userId = ?').get(uid)).n, 0);
  // Published pattern taken down (soft-deleted, unpublished).
  const pat = await db.prepare('SELECT deletedAt, publishedAt FROM patterns WHERE id = ?').get('p_del');
  assert.ok(pat.deletedAt);
  assert.equal(pat.publishedAt, null);
  // Comment kept for thread integrity but anonymized.
  const com = await db.prepare('SELECT userId FROM pattern_comments WHERE id = ?').get('c_del');
  assert.equal(com.userId, 'deleted-user');
  // Notifications the deleted user caused for others are removed.
  assert.equal(await unreadCount(other), 0);
  // User row scrubbed + tombstoned; email freed, handle nulled.
  const u = await db.prepare('SELECT email, name, handle, deletedAt FROM users WHERE id = ?').get(uid);
  assert.match(u.email, /@loopsy\.invalid$/);
  assert.equal(u.name, 'Deleted maker');
  assert.equal(u.handle, null);
  assert.ok(u.deletedAt);
  // Public handle lookup no longer resolves the deleted account.
  assert.equal(await userModel.getUserByHandle('u_del'), null);
});
