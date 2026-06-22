const db = require('../db');

const insertProgressStmt = db.prepare(`
  INSERT INTO progress (id, userId, patternId, totalSteps, steps, progressPercentage, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertProgressIgnoreStmt = db.prepare(`
  INSERT INTO progress (id, userId, patternId, totalSteps, steps, progressPercentage, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING
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

const getProgressSummaryForUserStmt = db.prepare(`
  SELECT patternId, totalSteps, progressPercentage FROM progress WHERE userId = ?
`);

function parseSteps(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

function deserialize(row) {
  return { ...row, steps: parseSteps(row.steps) };
}

async function getProgressById(id, userId) {
  const row = await getProgressByIdStmt.get(id, userId);
  return row ? deserialize(row) : null;
}

async function getProgressByPatternId(patternId, userId) {
  return (await getProgressByPatternIdStmt.all(patternId, userId)).map(deserialize);
}

/** Lightweight per-pattern summary for the My Projects list (no steps blob). */
async function getProgressSummaryForUser(userId) {
  return getProgressSummaryForUserStmt.all(userId);
}

async function createProgress(record) {
  await insertProgressStmt.run(
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

// Atomic toggle: read-modify-write in a single transaction to prevent races.
async function toggleStepAtomic(id, userId, stepIndex) {
  return db.withTransaction(async (tx) => {
    const row = await tx.prepare('SELECT * FROM progress WHERE id = ? AND userId = ?').get(id, userId);
    if (!row) return null;

    const steps = parseSteps(row.steps);
    if (stepIndex < 0 || stepIndex >= steps.length) return null;

    steps[stepIndex] = { ...steps[stepIndex], completed: !steps[stepIndex].completed };

    const completedCount = steps.filter((s) => s.completed).length;
    const progressPercentage = Math.round((completedCount / row.totalSteps) * 100);

    await tx.prepare('UPDATE progress SET steps = ?, progressPercentage = ? WHERE id = ?')
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
}

// Idempotent: returns existing progress for this pattern if one exists, otherwise creates new
async function getOrCreateProgress(record) {
  const existing = await getProgressByPatternIdStmt.all(record.patternId, record.userId);
  if (existing.length > 0) return deserialize(existing[0]);

  await insertProgressIgnoreStmt.run(
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

async function updateProgress(id, userId, updates) {
  const row = await getProgressByIdStmt.get(id, userId);
  if (!row) return null;

  const newSteps = updates.steps || parseSteps(row.steps);
  const newPercentage = updates.progressPercentage !== undefined
    ? updates.progressPercentage
    : row.progressPercentage;

  await updateProgressStmt.run(JSON.stringify(newSteps), newPercentage, id);

  return {
    id: row.id,
    patternId: row.patternId,
    totalSteps: row.totalSteps,
    steps: newSteps,
    progressPercentage: newPercentage,
    createdAt: row.createdAt,
  };
}

module.exports = { getProgressById, getProgressByPatternId, getProgressSummaryForUser, createProgress, getOrCreateProgress, toggleStepAtomic, updateProgress };
