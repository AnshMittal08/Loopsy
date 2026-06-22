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

module.exports = { getAllPatterns, getPatternById, createPattern, deletePattern };
