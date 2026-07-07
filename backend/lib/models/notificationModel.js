// In-app notifications — the community retention loop. Rows are created by
// the star/comment routes (never for self-actions) and read by the bell menu.

const { randomUUID } = require('crypto');
const db = require('../db');

async function createNotification({ userId, actorId = null, type, resourceType = null, resourceId = null, message }) {
  if (!userId || userId === actorId) return; // never notify yourself
  await db
    .prepare(
      `INSERT INTO notifications (id, userId, actorId, type, resourceType, resourceId, message, readAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    .run(randomUUID(), userId, actorId, type, resourceType, resourceId, String(message).slice(0, 300), new Date().toISOString());
}

async function listNotifications(userId, limit = 20) {
  return db
    .prepare('SELECT id, actorId, type, resourceType, resourceId, message, readAt, createdAt FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?')
    .all(userId, limit);
}

async function unreadCount(userId) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE userId = ? AND readAt IS NULL').get(userId);
  return Number(row?.n ?? 0);
}

async function markAllRead(userId) {
  await db.prepare('UPDATE notifications SET readAt = ? WHERE userId = ? AND readAt IS NULL').run(new Date().toISOString(), userId);
}

module.exports = { createNotification, listNotifications, unreadCount, markAllRead };
