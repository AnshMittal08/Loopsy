const db = require('../db');

// Per-user read + bookmark state for Learning Centre guides. Slugs are
// content-defined on the frontend; this model only persists state per slug.
// Upserts use ON CONFLICT on the (userId, guideSlug) primary key — supported by
// both SQLite and Postgres.

const listStmt = db.prepare(
  `SELECT guideSlug, readAt, bookmarked FROM learning_progress WHERE userId = ?`
);

const setReadStmt = db.prepare(
  `INSERT INTO learning_progress (userId, guideSlug, readAt, bookmarked, updatedAt)
   VALUES (?, ?, ?, 0, ?)
   ON CONFLICT(userId, guideSlug) DO UPDATE SET readAt = excluded.readAt, updatedAt = excluded.updatedAt`
);

const setBookmarkStmt = db.prepare(
  `INSERT INTO learning_progress (userId, guideSlug, readAt, bookmarked, updatedAt)
   VALUES (?, ?, NULL, ?, ?)
   ON CONFLICT(userId, guideSlug) DO UPDATE SET bookmarked = excluded.bookmarked, updatedAt = excluded.updatedAt`
);

/** All of a user's guide progress rows. */
async function getProgress(userId) {
  const rows = await listStmt.all(userId);
  return rows.map((r) => ({
    guideSlug: r.guideSlug,
    readAt: r.readAt ?? null,
    bookmarked: Boolean(r.bookmarked),
  }));
}

/**
 * Apply an explicit state change for one guide. `read` / `bookmarked` are
 * optional — only the provided fields are written. Returns nothing meaningful;
 * callers re-read via getProgress when they need the full set.
 */
async function setState(userId, guideSlug, { read, bookmarked } = {}) {
  const now = new Date().toISOString();
  if (typeof read === 'boolean') {
    await setReadStmt.run(userId, guideSlug, read ? now : null, now);
  }
  if (typeof bookmarked === 'boolean') {
    await setBookmarkStmt.run(userId, guideSlug, bookmarked ? 1 : 0, now);
  }
}

module.exports = { getProgress, setState };
