// Account lifecycle — data export + permanent cascading deletion, and the
// first-party error log. Runs against a throwaway SQLite DB.

const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');

const TMP = path.join(os.tmpdir(), `loopsy-account-${process.pid}-${Date.now()}.db`);
delete process.env.DATABASE_URL;
process.env.DB_PATH = TMP;

const db = require('../lib/db');
const { exportUserData, deleteUserAccount } = require('../lib/models/accountModel');
const { recordError, recentErrors, errorCountLastDay, errorCountsByRoute } = require('../lib/models/errorModel');

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

async function seedUser() {
  const id = uid();
  await db.prepare('INSERT INTO users (id, email, name, passwordHash, skillLevel, createdAt) VALUES (?,?,?,?,?,?)')
    .run(id, `${id}@t.co`, 'Tester', 'hash', 'beginner', now());
  await db.prepare('INSERT INTO patterns (id, userId, title, difficulty, category, steps, createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(uid(), id, 'My Scarf', 'Beginner', 'Wearable', '[]', now());
  await db.prepare('INSERT INTO designs (id, userId, name, spec, createdAt, updatedAt) VALUES (?,?,?,?,?,?)')
    .run(uid(), id, 'Doodle', '{"parts":[]}', now(), now());
  await db.prepare('INSERT INTO sessions (id, userId, token, expiresAt, createdAt) VALUES (?,?,?,?,?)')
    .run(uid(), id, uid(), now(), now());
  await db.prepare('INSERT INTO notifications (id, userId, type, message, createdAt) VALUES (?,?,?,?,?)')
    .run(uid(), id, 'star', 'hi', now());
  await db.prepare('INSERT INTO learning_progress (userId, guideSlug, readAt, bookmarked, updatedAt) VALUES (?,?,?,?,?)')
    .run(id, 'magic-ring', now(), 1, now());
  await recordError({ route: '/api/ai/generate-pattern', method: 'POST', message: 'seeded', statusCode: 500, userId: id });
  return id;
}

test('exportUserData gathers the account and its content', async () => {
  const id = await seedUser();
  const dump = await exportUserData(id);
  assert.equal(dump.account.id, id);
  assert.equal(dump.patterns.length, 1);
  assert.equal(dump.designs.length, 1);
  assert.deepEqual(dump.designs[0].spec, { parts: [] }, 'spec is parsed back to JSON');
  assert.equal(dump.learningProgress.length, 1, 'learning progress (reading history + bookmarks) is exported');
  assert.equal(dump.learningProgress[0].guideSlug, 'magic-ring');
  assert.ok(dump.exportedAt);
});

test('deleteUserAccount removes the user and all identifying rows, leaves a tombstone', async () => {
  const id = await seedUser();
  const ok = await deleteUserAccount(id);
  assert.equal(ok, true);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?').get(id)).n, 0);
  for (const tbl of ['patterns', 'designs', 'sessions', 'notifications', 'learning_progress']) {
    const n = (await db.prepare(`SELECT COUNT(*) AS n FROM ${tbl} WHERE userId = ?`).get(id)).n;
    assert.equal(Number(n), 0, `${tbl} should be purged`);
  }
  const tomb = await db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'account.deleted' AND resourceId = ?").get(id);
  assert.equal(Number(tomb.n), 1, 'a PII-free tombstone remains');
  // error_log rows are diagnostically useful and kept, but scrubbed of the
  // PII link: the row must survive with userId nulled, not vanish.
  const scrubbed = await db.prepare('SELECT COUNT(*) AS n FROM error_log WHERE userId = ?').get(id);
  assert.equal(Number(scrubbed.n), 0, 'no error_log row still points at the deleted user');
  const kept = await db.prepare("SELECT COUNT(*) AS n FROM error_log WHERE message = 'seeded' AND userId IS NULL").get();
  assert.equal(Number(kept.n), 1, 'the diagnostic row itself is preserved, just de-linked');
});

test('deleting a missing user is a safe no-op', async () => {
  assert.equal(await deleteUserAccount('nope'), false);
});

test('error log records, counts and buckets by route', async () => {
  // A route unique to this test, so shared-DB seed data from other tests
  // (seedUser() also writes an error_log row) can't skew the by-route count.
  const route = `/api/test-probe-${crypto.randomUUID()}`;
  await recordError({ route, method: 'POST', message: 'boom', statusCode: 500 });
  await new Promise((r) => setTimeout(r, 3));
  await recordError({ route, method: 'POST', message: 'boom2', statusCode: 500 });
  await new Promise((r) => setTimeout(r, 3));
  await recordError({ route: '/api/design/preview', method: 'POST', message: 'nope', statusCode: 500 });
  assert.ok(await errorCountLastDay() >= 3);
  const recent = await recentErrors(10);
  assert.ok(recent.length >= 3);
  assert.equal(recent[0].message, 'nope', 'newest first');
  const byRoute = await errorCountsByRoute(24);
  const gen = byRoute.find((r) => r.route === route);
  assert.equal(Number(gen.c), 2);
});

test('recordError never throws on bad input', async () => {
  await recordError({}); // missing everything
  await recordError({ route: 'x'.repeat(9999), message: 'y'.repeat(9999) });
  assert.ok(true);
});
