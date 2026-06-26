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
  `SELECT p.*, u.name AS authorName
   FROM patterns p
   JOIN users u ON u.id = p.userId
   WHERE p.id = ? AND p.publishedAt IS NOT NULL AND p.deletedAt IS NULL`
);

async function getPublicPatternById(id) {
  const row = await getPublicPatternStmt.get(id);
  if (!row) return null;
  return { ...deserializePatternRow(row), authorName: row.authorName };
}

const communityFeedStmt = db.prepare(
  `SELECT p.id, p.title, p.difficulty, p.category, p.tags, p.verified,
          p.isAIGenerated, p.hookSize, p.yarnWeight, p.starCount, p.publishedAt,
          u.name AS authorName
   FROM patterns p
   JOIN users u ON u.id = p.userId
   WHERE p.publishedAt IS NOT NULL AND p.deletedAt IS NULL
   ORDER BY p.publishedAt DESC
   LIMIT ? OFFSET ?`
);

/** Paginated community feed of published patterns (newest first). */
async function getCommunityFeed({ limit = 24, offset = 0 } = {}) {
  const rows = await communityFeedStmt.all(limit, offset);
  return rows.map((r) => ({
    ...r,
    tags: parseJsonArray(r.tags),
    isAIGenerated: Boolean(r.isAIGenerated),
    verified: Boolean(r.verified),
  }));
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
  toggleStar,
  getUserStarredIds,
};
