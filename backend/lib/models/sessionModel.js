const db = require('../db');

const insertSessionStmt = db.prepare(`
  INSERT INTO sessions (id, userId, token, expiresAt, createdAt)
  VALUES (?, ?, ?, ?, ?)
`);

const getSessionByTokenStmt = db.prepare(`
  SELECT id, userId, token, expiresAt, createdAt
  FROM sessions
  WHERE token = ?
`);

const deleteSessionByTokenStmt = db.prepare(`
  DELETE FROM sessions
  WHERE token = ?
`);

const deleteExpiredSessionsStmt = db.prepare(`
  DELETE FROM sessions
  WHERE expiresAt <= ?
`);

function createSession(session) {
  insertSessionStmt.run(
    session.id,
    session.userId,
    session.token,
    session.expiresAt,
    session.createdAt
  );

  return session;
}

function getSessionByToken(token) {
  deleteExpiredSessionsStmt.run(new Date().toISOString());
  return getSessionByTokenStmt.get(token) ?? null;
}

function deleteSessionByToken(token) {
  deleteSessionByTokenStmt.run(token);
}

module.exports = {
  createSession,
  getSessionByToken,
  deleteSessionByToken
};
