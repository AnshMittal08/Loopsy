const db = require('../db');
const { generateId } = require('../utils/helpers');

// Collections: named groups of saved patterns owned by a user. The collected
// pattern's full detail is resolved through patternModel when needed; here we
// only own the grouping + membership.

const insertCollectionStmt = db.prepare(
  `INSERT INTO collections (id, userId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`
);

const getUserCollectionsStmt = db.prepare(
  `SELECT c.id, c.name, c.createdAt, c.updatedAt,
          (SELECT COUNT(*) FROM collection_patterns cp WHERE cp.collectionId = c.id) AS patternCount
   FROM collections c
   WHERE c.userId = ?
   ORDER BY c.updatedAt DESC`
);

const getCollectionStmt = db.prepare(
  `SELECT id, userId, name, createdAt, updatedAt FROM collections WHERE id = ?`
);

const deleteCollectionStmt = db.prepare(
  `DELETE FROM collections WHERE id = ? AND userId = ?`
);

const addItemStmt = db.prepare(
  `INSERT OR IGNORE INTO collection_patterns (collectionId, patternId, createdAt) VALUES (?, ?, ?)`
);

const removeItemStmt = db.prepare(
  `DELETE FROM collection_patterns WHERE collectionId = ? AND patternId = ?`
);

const touchCollectionStmt = db.prepare(
  `UPDATE collections SET updatedAt = ? WHERE id = ?`
);

const collectionPatternIdsStmt = db.prepare(
  `SELECT patternId FROM collection_patterns WHERE collectionId = ? ORDER BY createdAt DESC`
);

async function createCollection(userId, name) {
  const now = new Date().toISOString();
  const id = generateId();
  await insertCollectionStmt.run(id, userId, name, now, now);
  return { id, userId, name, createdAt: now, updatedAt: now, patternCount: 0 };
}

async function getUserCollections(userId) {
  return getUserCollectionsStmt.all(userId);
}

async function getCollectionById(id) {
  return (await getCollectionStmt.get(id)) || null;
}

async function getCollectionPatternIds(id) {
  const rows = await collectionPatternIdsStmt.all(id);
  return rows.map((r) => r.patternId);
}

async function deleteCollection(id, userId) {
  const info = await deleteCollectionStmt.run(id, userId);
  return info.changes > 0;
}

/** Add or remove a pattern from a collection. Returns true on success. */
async function setPatternInCollection(collectionId, patternId, present) {
  if (present) {
    await addItemStmt.run(collectionId, patternId, new Date().toISOString());
  } else {
    await removeItemStmt.run(collectionId, patternId);
  }
  await touchCollectionStmt.run(new Date().toISOString(), collectionId);
  return true;
}

const renameStmt = db.prepare(`UPDATE collections SET name = ?, updatedAt = ? WHERE id = ? AND userId = ?`);

async function renameCollection(id, userId, name) {
  const info = await renameStmt.run(name, new Date().toISOString(), id, userId);
  return info.changes > 0;
}

module.exports = {
  renameCollection,
  createCollection,
  getUserCollections,
  getCollectionById,
  getCollectionPatternIds,
  deleteCollection,
  setPatternInCollection,
};
