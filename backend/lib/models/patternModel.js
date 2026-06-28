const db = require('../db');
const { recordAudit } = require('./auditModel');

const insertPatternStmt = db.prepare(`
  INSERT INTO patterns (
    id, userId, title, templateId, color, size, steps, difficulty, category, tags,
    materials, hookSize, yarnWeight, timeEstimate, finishedSize, notes,
    promptSummary, isAIGenerated, isFallback, verified, isExperimental, createdAt
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getAllPatternsStmt = db.prepare(`
  SELECT * FROM patterns WHERE userId = ? AND deletedAt IS NULL ORDER BY createdAt DESC
`);

const getPatternByIdStmt = db.prepare(`
  SELECT * FROM patterns WHERE id = ? AND userId = ? AND deletedAt IS NULL
`);

const analyticsIncrementStmt = db.prepare('UPDATE analytics SET value = value + 1 WHERE key = ?');

/**
 * Return all patterns for a user.
 */
async function getAllPatterns(userId) {
  return (await getAllPatternsStmt.all(userId)).map(deserializePatternRow);
}

/**
 * Find a pattern by ID.
 */
async function getPatternById(id, userId) {
  const row = await getPatternByIdStmt.get(id, userId);
  if (!row) return null;
  return deserializePatternRow(row);
}

/**
 * Insert a new pattern and return it.
 */
async function createPattern(pattern) {
  await insertPatternStmt.run(
    pattern.id,
    pattern.userId ?? null,
    pattern.title,
    pattern.templateId,
    pattern.customization?.color,
    pattern.customization?.size || 'medium',
    JSON.stringify(pattern.steps),
    pattern.difficulty,
    pattern.category ?? null,
    JSON.stringify(pattern.tags ?? []),
    JSON.stringify(pattern.materials ?? []),
    pattern.hookSize ?? null,
    pattern.yarnWeight ?? null,
    pattern.timeEstimate ?? null,
    pattern.finishedSize ?? null,
    JSON.stringify(pattern.notes ?? []),
    pattern.promptSummary ?? null,
    pattern.isAIGenerated ? 1 : 0,
    pattern.isFallback ? 1 : 0,
    pattern.verified ? 1 : 0,
    pattern.isExperimental ? 1 : 0,
    pattern.createdAt
  );

  await analyticsIncrementStmt.run('pattern_generations');

  return pattern;
}

function deserializePatternRow(row) {
  return {
    ...row,
    steps: parseJsonArray(row.steps),
    tags: parseJsonArray(row.tags),
    materials: parseJsonArray(row.materials),
    notes: parseJsonArray(row.notes),
    customization: {
      color: row.color,
      size: row.size
    },
    isAIGenerated: Boolean(row.isAIGenerated),
    isFallback: Boolean(row.isFallback),
    verified: Boolean(row.verified),
    isExperimental: Boolean(row.isExperimental)
  };
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

// Soft delete: the row is hidden from reads but retained so it can be
// recovered and so the audit trail stays meaningful. Progress is kept too.
const softDeletePatternStmt = db.prepare(
  'UPDATE patterns SET deletedAt = ? WHERE id = ? AND userId = ? AND deletedAt IS NULL'
);

async function deletePattern(id, userId, ctx = {}) {
  const info = await softDeletePatternStmt.run(new Date().toISOString(), id, userId);
  if (info.changes > 0) {
    await recordAudit({ actorId: userId, action: 'pattern.delete', resource: 'pattern', resourceId: id, ip: ctx.ip });
  }
  return info.changes > 0;
}

// ── Community catalog ──────────────────────────────────────────────────────

const setPublishedStmt = db.prepare(
  `UPDATE patterns SET publishedAt = ? WHERE id = ? AND userId = ? AND deletedAt IS NULL`
);

/** Publish (publishedAt = now) or unpublish (publishedAt = null) a pattern. */
async function setPatternPublished(id, userId, publish) {
  const ts = publish ? new Date().toISOString() : null;
  const info = await setPublishedStmt.run(ts, id, userId);
  return info.changes > 0;
}

const getPublicPatternStmt = db.prepare(
  `SELECT p.*, u.name AS authorName, u.handle AS authorHandle
   FROM patterns p
   JOIN users u ON u.id = p.userId
   WHERE p.id = ? AND p.publishedAt IS NOT NULL AND p.deletedAt IS NULL`
);

async function getPublicPatternById(id) {
  const row = await getPublicPatternStmt.get(id);
  if (!row) return null;
  return { ...deserializePatternRow(row), authorName: row.authorName, authorHandle: row.authorHandle };
}

const FEED_COLS =
  `p.id, p.title, p.difficulty, p.category, p.tags, p.verified,
   p.isAIGenerated, p.hookSize, p.yarnWeight, p.starCount, p.publishedAt,
   p.userId, u.name AS authorName, u.handle AS authorHandle`;

const communityFeedRecentStmt = db.prepare(
  `SELECT ${FEED_COLS}
   FROM patterns p JOIN users u ON u.id = p.userId
   WHERE p.publishedAt IS NOT NULL AND p.deletedAt IS NULL
   ORDER BY p.publishedAt DESC
   LIMIT ? OFFSET ?`
);

const communityFeedTrendingStmt = db.prepare(
  `SELECT ${FEED_COLS}
   FROM patterns p JOIN users u ON u.id = p.userId
   WHERE p.publishedAt IS NOT NULL AND p.deletedAt IS NULL
   ORDER BY p.starCount DESC, p.publishedAt DESC
   LIMIT ? OFFSET ?`
);

function deserializeFeedRow(r) {
  return {
    ...r,
    tags: parseJsonArray(r.tags),
    isAIGenerated: Boolean(r.isAIGenerated),
    verified: Boolean(r.verified),
  };
}

/**
 * Paginated community feed of published patterns. sort: 'recent' | 'trending'.
 * Optional `tag` filters to patterns carrying that tag (matched against the
 * JSON tags text, cross-driver). When a tag is present we build the statement
 * dynamically (a prepared statement per call) since the WHERE clause changes.
 */
async function getCommunityFeed({ limit = 24, offset = 0, sort = 'recent', tag = null } = {}) {
  if (!tag) {
    const stmt = sort === 'trending' ? communityFeedTrendingStmt : communityFeedRecentStmt;
    return (await stmt.all(limit, offset)).map(deserializeFeedRow);
  }
  const order = sort === 'trending' ? 'p.starCount DESC, p.publishedAt DESC' : 'p.publishedAt DESC';
  const stmt = db.prepare(
    `SELECT ${FEED_COLS}
     FROM patterns p JOIN users u ON u.id = p.userId
     WHERE p.publishedAt IS NOT NULL AND p.deletedAt IS NULL AND LOWER(p.tags) LIKE LOWER(?)
     ORDER BY ${order}
     LIMIT ? OFFSET ?`
  );
  // Match the quoted tag inside the JSON array text, e.g. ["starter","mindful"].
  const rows = await stmt.all(`%"${String(tag).toLowerCase()}"%`, limit, offset);
  return rows.map(deserializeFeedRow);
}

const allPublishedIdsStmt = db.prepare(
  `SELECT id, publishedAt FROM patterns
   WHERE publishedAt IS NOT NULL AND deletedAt IS NULL
   ORDER BY publishedAt DESC`
);

/** Every published pattern id + publishedAt — for the sitemap. */
async function getAllPublishedPatternIds() {
  return (await allPublishedIdsStmt.all()).map((r) => ({ id: r.id, publishedAt: r.publishedAt }));
}

const publishedCreatorHandlesStmt = db.prepare(
  `SELECT DISTINCT u.handle AS handle FROM patterns p
   JOIN users u ON u.id = p.userId
   WHERE p.publishedAt IS NOT NULL AND p.deletedAt IS NULL AND u.handle IS NOT NULL`
);

/** Handles of creators with at least one published pattern — for the sitemap. */
async function getPublishedCreatorHandles() {
  return (await publishedCreatorHandlesStmt.all()).map((r) => r.handle).filter(Boolean);
}

const allPublishedTagsStmt = db.prepare(
  `SELECT tags FROM patterns WHERE publishedAt IS NOT NULL AND deletedAt IS NULL`
);

/** Most-used tags across published patterns, as [{ tag, count }] desc. */
async function getPopularTags(limit = 20) {
  const rows = await allPublishedTagsStmt.all();
  const counts = new Map();
  for (const r of rows) {
    for (const t of parseJsonArray(r.tags)) {
      const key = String(t).trim();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

const userPublishedStmt = db.prepare(
  `SELECT ${FEED_COLS}
   FROM patterns p JOIN users u ON u.id = p.userId
   WHERE p.userId = ? AND p.publishedAt IS NOT NULL AND p.deletedAt IS NULL
   ORDER BY p.publishedAt DESC
   LIMIT ? OFFSET ?`
);

/** A creator's published patterns (for their public profile). */
async function getPublishedPatternsByUser(userId, { limit = 48, offset = 0 } = {}) {
  const rows = await userPublishedStmt.all(userId, limit, offset);
  return rows.map(deserializeFeedRow);
}

/** Feed-card data for a set of published pattern ids (collection contents). */
async function getPublicCardsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const stmt = db.prepare(
    `SELECT ${FEED_COLS}
     FROM patterns p JOIN users u ON u.id = p.userId
     WHERE p.id IN (${placeholders}) AND p.publishedAt IS NOT NULL AND p.deletedAt IS NULL`
  );
  const rows = await stmt.all(...ids);
  return rows.map(deserializeFeedRow);
}

// Stars ────────────────────────────────────────────────────────────────────

const insertStarStmt = db.prepare(
  `INSERT OR IGNORE INTO pattern_stars (userId, patternId, createdAt) VALUES (?, ?, ?)`
);
const deleteStarStmt = db.prepare(
  `DELETE FROM pattern_stars WHERE userId = ? AND patternId = ?`
);
const incrementStarStmt = db.prepare(
  `UPDATE patterns SET starCount = starCount + 1 WHERE id = ?`
);
const decrementStarStmt = db.prepare(
  `UPDATE patterns SET starCount = MAX(0, starCount - 1) WHERE id = ?`
);
const getStarStmt = db.prepare(
  `SELECT 1 FROM pattern_stars WHERE userId = ? AND patternId = ?`
);
const getUserStarsStmt = db.prepare(
  `SELECT patternId FROM pattern_stars WHERE userId = ?`
);

/** Toggle a star. Returns { starred: boolean, starCount: number }. */
async function toggleStar(patternId, userId) {
  const existing = await getStarStmt.get(userId, patternId);
  if (existing) {
    await deleteStarStmt.run(userId, patternId);
    await decrementStarStmt.run(patternId);
    const row = await db.prepare(`SELECT starCount FROM patterns WHERE id = ?`).get(patternId);
    return { starred: false, starCount: row?.starCount ?? 0 };
  } else {
    await insertStarStmt.run(userId, patternId, new Date().toISOString());
    await incrementStarStmt.run(patternId);
    const row = await db.prepare(`SELECT starCount FROM patterns WHERE id = ?`).get(patternId);
    return { starred: true, starCount: row?.starCount ?? 1 };
  }
}

/** All patternIds the user has starred (for UI hydration). */
async function getUserStarredIds(userId) {
  const rows = await getUserStarsStmt.all(userId);
  return rows.map((r) => r.patternId ?? r.patterndid ?? Object.values(r)[0]);
}

module.exports = {
  getAllPatterns,
  getPatternById,
  createPattern,
  deletePattern,
  setPatternPublished,
  getPublicPatternById,
  getCommunityFeed,
  getPopularTags,
  getAllPublishedPatternIds,
  getPublishedCreatorHandles,
  getPublishedPatternsByUser,
  getPublicCardsByIds,
  toggleStar,
  getUserStarredIds,
};
