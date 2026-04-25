const db = require('../db');

const insertProgressStmt = db.prepare(`
  INSERT INTO progress (id, userId, patternId, totalSteps, steps, progressPercentage, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertProgressIgnoreStmt = db.prepare(`
  INSERT OR IGNORE INTO progress (id, userId, patternId, totalSteps, steps, progressPercentage, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getProgressByIdStmt = db.prepare(`
  SELECT * FROM progress WHERE id = ? AND userId = ?
`);

const getProgressByPatternIdStmt = db.prepare(`
  SELECT * FROM progress WHERE patternId = ? AND userId = ? ORDER BY createdAt DESC
`);

const updateProgressStmt = db.prepare(`
  UPDATE progress SET steps = ?, progressPercentage = ? WHERE id = ?
`);

function deserialize(row) {
  return { ...row, steps: JSON.parse(row.steps) };
}

function getProgressById(id, userId) {
  const row = getProgressByIdStmt.get(id, userId);
  return row ? deserialize(row) : null;
}

function getProgressByPatternId(patternId, userId) {
  return getProgressByPatternIdStmt.all(patternId, userId).map(deserialize);
}

function createProgress(record) {
  insertProgressStmt.run(
    record.id,
    record.userId,
    record.patternId,
    record.totalSteps,
    JSON.stringify(record.steps),
    record.progressPercentage || 0,
    record.createdAt
  );
  return record;
}

// Atomic toggle: read-modify-write in a single exclusive transaction to prevent race conditions
const _toggleTransaction = db.transaction((id, userId, stepIndex) => {
  const row = db.prepare('SELECT * FROM progress WHERE id = ? AND userId = ?').get(id, userId);
  if (!row) return null;

  const steps = JSON.parse(row.steps);
  if (stepIndex < 0 || stepIndex >= steps.length) return null;

  steps[stepIndex] = { ...steps[stepIndex], completed: !steps[stepIndex].completed };

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercentage = Math.round((completedCount / row.totalSteps) * 100);

  db.prepare('UPDATE progress SET steps = ?, progressPercentage = ? WHERE id = ?')
    .run(JSON.stringify(steps), progressPercentage, id);

  return {
    id: row.id,
    patternId: row.patternId,
    totalSteps: row.totalSteps,
    steps,
    progressPercentage,
    createdAt: row.createdAt,
  };
});

function toggleStepAtomic(id, userId, stepIndex) {
  return _toggleTransaction.exclusive(id, userId, stepIndex);
}

// Idempotent: returns existing progress for this pattern if one exists, otherwise creates new
function getOrCreateProgress(record) {
  const existing = getProgressByPatternIdStmt.all(record.patternId, record.userId);
  if (existing.length > 0) return deserialize(existing[0]);

  insertProgressIgnoreStmt.run(
    record.id,
    record.userId,
    record.patternId,
    record.totalSteps,
    JSON.stringify(record.steps),
    record.progressPercentage || 0,
    record.createdAt
  );
  return record;
}

function updateProgress(id, userId, updates) {
  const row = getProgressByIdStmt.get(id, userId);
  if (!row) return null;

  const newSteps = updates.steps || JSON.parse(row.steps);
  const newPercentage = updates.progressPercentage !== undefined
    ? updates.progressPercentage
    : row.progressPercentage;

  updateProgressStmt.run(JSON.stringify(newSteps), newPercentage, id);

  return {
    id: row.id,
    patternId: row.patternId,
    totalSteps: row.totalSteps,
    steps: newSteps,
    progressPercentage: newPercentage,
    createdAt: row.createdAt,
  };
}

module.exports = { getProgressById, getProgressByPatternId, createProgress, getOrCreateProgress, toggleStepAtomic, updateProgress };
