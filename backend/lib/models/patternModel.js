const db = require('../db');

const insertPatternStmt = db.prepare(`
  INSERT INTO patterns (
    id, title, templateId, color, size, steps, difficulty, category, tags,
    materials, hookSize, yarnWeight, timeEstimate, finishedSize, notes,
    promptSummary, isAIGenerated, isFallback, createdAt
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getAllPatternsStmt = db.prepare(`
  SELECT * FROM patterns ORDER BY createdAt DESC
`);

const getPatternByIdStmt = db.prepare(`
  SELECT * FROM patterns WHERE id = ?
`);

/**
 * Return all patterns.
 * @returns {Array}
 */
function getAllPatterns() {
  return getAllPatternsStmt.all().map(deserializePatternRow);
}

/**
 * Find a pattern by ID.
 * @param {string} id
 * @returns {Object|null}
 */
function getPatternById(id) {
  const row = getPatternByIdStmt.get(id);
  if (!row) return null;
  return deserializePatternRow(row);
}

/**
 * Insert a new pattern and return it.
 * @param {Object} pattern
 * @returns {Object}
 */
function createPattern(pattern) {
  insertPatternStmt.run(
    pattern.id,
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
    pattern.createdAt
  );

  // Increment analytics counter
  const stmt = db.prepare('UPDATE analytics SET value = value + 1 WHERE key = ?');
  stmt.run('pattern_generations');

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
    isFallback: Boolean(row.isFallback)
  };
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

module.exports = { getAllPatterns, getPatternById, createPattern };
