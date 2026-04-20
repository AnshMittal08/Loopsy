const db = require('../db');

const insertProgressStmt = db.prepare(`
  INSERT INTO progress (id, patternId, totalSteps, steps, progressPercentage, createdAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getProgressByIdStmt = db.prepare(`
  SELECT * FROM progress WHERE id = ?
`);

const getProgressByPatternIdStmt = db.prepare(`
  SELECT * FROM progress WHERE patternId = ? ORDER BY createdAt DESC
`);

const updateProgressStmt = db.prepare(`
  UPDATE progress SET steps = ?, progressPercentage = ? WHERE id = ?
`);

/**
 * Find a progress record by its own ID.
 * @param {string} id
 * @returns {Object|null}
 */
function getProgressById(id) {
  const row = getProgressByIdStmt.get(id);
  if (!row) return null;
  return {
    ...row,
    steps: JSON.parse(row.steps)
  };
}

/**
 * Find all progress records for a given pattern ID.
 * @param {string} patternId
 * @returns {Array}
 */
function getProgressByPatternId(patternId) {
  return getProgressByPatternIdStmt.all(patternId).map(row => ({
    ...row,
    steps: JSON.parse(row.steps)
  }));
}

/**
 * Create a new progress record and return it.
 * @param {Object} record
 * @returns {Object}
 */
function createProgress(record) {
  insertProgressStmt.run(
    record.id,
    record.patternId,
    record.totalSteps,
    JSON.stringify(record.steps),
    record.progressPercentage || 0,
    record.createdAt
  );
  return record;
}

/**
 * Update a progress record in-place and return it.
 * @param {string} id
 * @param {Partial<Object>} updates
 * @returns {Object|null}
 */
function updateProgress(id, updates) {
  const row = getProgressByIdStmt.get(id);
  if (!row) return null;

  const newSteps = updates.steps || JSON.parse(row.steps);
  const newPercentage = updates.progressPercentage !== undefined
    ? updates.progressPercentage
    : row.progressPercentage;

  updateProgressStmt.run(
    JSON.stringify(newSteps),
    newPercentage,
    id
  );

  return {
    ...row,
    steps: newSteps,
    progressPercentage: newPercentage,
    ...updates
  };
}

module.exports = { getProgressById, getProgressByPatternId, createProgress, updateProgress };
