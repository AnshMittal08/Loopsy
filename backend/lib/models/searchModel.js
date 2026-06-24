const db = require('../db');

// Lightweight cross-driver search. Uses LOWER(col) LIKE LOWER(?) so it is
// case-insensitive on both SQLite and Postgres without dialect-specific FTS.
// (A later migration can upgrade this to Postgres full-text / pgvector — see
// docs/database/02-target-postgres.md — behind the same interface.)

const RESULT_LIMIT = 20;

const searchTemplatesStmt = db.prepare(`
  SELECT id, name, description, difficulty, category, imageUrl
  FROM templates
  WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ? OR LOWER(tags) LIKE ?
  ORDER BY name
  LIMIT ${RESULT_LIMIT}
`);

const searchPatternsStmt = db.prepare(`
  SELECT id, title, category, difficulty, verified
  FROM patterns
  WHERE userId = ? AND deletedAt IS NULL
    AND (LOWER(title) LIKE ? OR LOWER(category) LIKE ? OR LOWER(tags) LIKE ?)
  ORDER BY createdAt DESC
  LIMIT ${RESULT_LIMIT}
`);

const searchDesignsStmt = db.prepare(`
  SELECT id, name, patternId
  FROM designs
  WHERE userId = ? AND deletedAt IS NULL AND LOWER(name) LIKE ?
  ORDER BY updatedAt DESC
  LIMIT ${RESULT_LIMIT}
`);

const like = (q) => `%${String(q).toLowerCase()}%`;

async function searchTemplates(q) {
  const t = like(q);
  return searchTemplatesStmt.all(t, t, t, t);
}

async function searchPatterns(userId, q) {
  const t = like(q);
  const rows = await searchPatternsStmt.all(userId, t, t, t);
  return rows.map((r) => ({ ...r, verified: Boolean(r.verified) }));
}

async function searchDesigns(userId, q) {
  return searchDesignsStmt.all(userId, like(q));
}

module.exports = { searchTemplates, searchPatterns, searchDesigns };
