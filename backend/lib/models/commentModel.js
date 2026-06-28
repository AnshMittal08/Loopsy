const db = require('../db');
const { generateId } = require('../utils/helpers');

// Flat comments on published patterns. The pattern's published/visibility check
// is the caller's responsibility (route layer); this model owns storage only.

const insertCommentStmt = db.prepare(
  `INSERT INTO pattern_comments (id, patternId, userId, body, createdAt) VALUES (?, ?, ?, ?, ?)`
);

const listCommentsStmt = db.prepare(
  `SELECT c.id, c.patternId, c.userId, c.body, c.createdAt,
          u.name AS authorName, u.handle AS authorHandle
   FROM pattern_comments c
   JOIN users u ON u.id = c.userId
   WHERE c.patternId = ? AND c.deletedAt IS NULL
   ORDER BY c.createdAt ASC`
);

const getCommentStmt = db.prepare(
  `SELECT id, patternId, userId FROM pattern_comments WHERE id = ? AND deletedAt IS NULL`
);

const softDeleteCommentStmt = db.prepare(
  `UPDATE pattern_comments SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL`
);

const countCommentsStmt = db.prepare(
  `SELECT patternId, COUNT(*) AS n FROM pattern_comments
   WHERE deletedAt IS NULL AND patternId = ? GROUP BY patternId`
);

async function addComment(patternId, userId, body) {
  const id = generateId();
  const createdAt = new Date().toISOString();
  await insertCommentStmt.run(id, patternId, userId, body, createdAt);
  return { id, patternId, userId, body, createdAt };
}

async function getComments(patternId) {
  return listCommentsStmt.all(patternId);
}

async function getCommentById(id) {
  return (await getCommentStmt.get(id)) || null;
}

async function countComments(patternId) {
  const row = await countCommentsStmt.get(patternId);
  return row ? Number(row.n) : 0;
}

/** Soft-delete a comment. Allowed for the comment's author or the pattern owner. */
async function deleteComment(commentId) {
  const info = await softDeleteCommentStmt.run(new Date().toISOString(), commentId);
  return info.changes > 0;
}

module.exports = { addComment, getComments, getCommentById, countComments, deleteComment };
