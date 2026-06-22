const db = require('../db');
const { randomUUID } = require('crypto');

// Design Canvas (M4): a saved canvas state. `spec` is the Design Spec JSON the
// canvas assembles; `patternId` links to the compiled pattern once generated.

const insertStmt = db.prepare(`
  INSERT INTO designs (id, userId, name, spec, patternId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getByIdStmt = db.prepare(`SELECT * FROM designs WHERE id = ? AND deletedAt IS NULL`);
const getForUserStmt = db.prepare(`SELECT * FROM designs WHERE userId = ? AND deletedAt IS NULL ORDER BY updatedAt DESC`);
const setPatternStmt = db.prepare(`UPDATE designs SET patternId = ?, updatedAt = ? WHERE id = ?`);

function deserialize(row) {
  if (!row) return null;
  let spec = {};
  try { spec = JSON.parse(row.spec); } catch { spec = {}; }
  return { ...row, spec };
}

async function createDesign({ userId = null, name, spec }) {
  const now = new Date().toISOString();
  const id = randomUUID();
  await insertStmt.run(id, userId, name || 'Untitled design', JSON.stringify(spec ?? {}), null, now, now);
  return deserialize(await getByIdStmt.get(id));
}

async function getDesignById(id) {
  return deserialize(await getByIdStmt.get(id));
}

async function getDesignsForUser(userId) {
  return (await getForUserStmt.all(userId)).map(deserialize);
}

async function linkPattern(id, patternId) {
  await setPatternStmt.run(patternId, new Date().toISOString(), id);
}

module.exports = { createDesign, getDesignById, getDesignsForUser, linkPattern };
