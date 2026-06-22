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

async function createSession(session) {
  await insertSessionStmt.run(
    session.id,
    session.userId,
    session.token,
    session.expiresAt,
    session.createdAt
  );

  return session;
}

async function getSessionByToken(token) {
  await deleteExpiredSessionsStmt.run(new Date().toISOString());
  return (await getSessionByTokenStmt.get(token)) ?? null;
}

async function deleteSessionByToken(token) {
  await deleteSessionByTokenStmt.run(token);
}

module.exports = {
  createSession,
  getSessionByToken,
  deleteSessionByToken
};
