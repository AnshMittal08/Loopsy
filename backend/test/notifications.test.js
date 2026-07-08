// Notifications model — the community retention loop's data layer.

const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const TMP = path.join(os.tmpdir(), `loopsy-notif-${process.pid}-${Date.now()}.db`);
delete process.env.DATABASE_URL;
process.env.DB_PATH = TMP;

require('../lib/db');
const { createNotification, listNotifications, unreadCount, markAllRead } = require('../lib/models/notificationModel');

test('notifications: create, list, unread, mark-all-read', async () => {
  await createNotification({ userId: 'u1', actorId: 'u2', type: 'star', resourceType: 'pattern', resourceId: 'p1', message: 'Maker starred your pattern.' });
  await new Promise((r) => setTimeout(r, 5)); // distinct createdAt so newest-first is well-defined
  await createNotification({ userId: 'u1', actorId: 'u3', type: 'comment', resourceType: 'pattern', resourceId: 'p1', message: 'Maker commented.' });
  assert.equal(await unreadCount('u1'), 2);
  const list = await listNotifications('u1');
  assert.equal(list.length, 2);
  assert.equal(list[0].type, 'comment', 'newest first');
  await markAllRead('u1');
  assert.equal(await unreadCount('u1'), 0);
  const after = await listNotifications('u1');
  assert.ok(after.every((n) => n.readAt), 'all rows carry readAt');
});

test('notifications: never notify yourself; messages are capped', async () => {
  await createNotification({ userId: 'u9', actorId: 'u9', type: 'star', message: 'self' });
  assert.equal(await unreadCount('u9'), 0);
  await createNotification({ userId: 'u9', actorId: 'u8', type: 'star', message: 'x'.repeat(500) });
  const [n] = await listNotifications('u9');
  assert.ok(n.message.length <= 300);
});
