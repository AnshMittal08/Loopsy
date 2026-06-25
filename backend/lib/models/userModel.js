const db = require('../db');

const insertUserStmt = db.prepare(`
  INSERT INTO users (id, email, name, passwordHash, skillLevel, createdAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getUserByIdStmt = db.prepare(`
  SELECT id, email, name, skillLevel, emailVerified, createdAt
  FROM users
  WHERE id = ?
`);

const getUserByEmailStmt = db.prepare(`
  SELECT *
  FROM users
  WHERE email = ?
`);

const upsertSubscriptionStmt = db.prepare(`
  INSERT INTO subscriptions (id, userId, plan, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(userId) DO UPDATE SET
    plan = excluded.plan,
    status = excluded.status,
    updatedAt = excluded.updatedAt
`);

const getSubscriptionByUserIdStmt = db.prepare(`
  SELECT plan, status, createdAt, updatedAt
  FROM subscriptions
  WHERE userId = ?
`);

const setEmailVerifiedStmt = db.prepare(`UPDATE users SET emailVerified = 1 WHERE id = ?`);
const setPasswordStmt = db.prepare(`UPDATE users SET passwordHash = ? WHERE id = ?`);
const updateProfileStmt = db.prepare(`UPDATE users SET name = ?, skillLevel = ? WHERE id = ?`);

async function createUser(user) {
  await insertUserStmt.run(
    user.id,
    user.email.toLowerCase(),
    user.name,
    user.passwordHash,
    user.skillLevel ?? 'beginner',
    user.createdAt
  );

  await upsertSubscriptionStmt.run(
    user.subscription.id,
    user.id,
    user.subscription.plan,
    user.subscription.status,
    user.subscription.createdAt,
    user.subscription.updatedAt
  );

  return getUserWithSubscriptionById(user.id);
}

async function getUserByEmail(email) {
  const row = await getUserByEmailStmt.get(email.toLowerCase());
  return row || null;
}

async function getUserWithSubscriptionById(id) {
  const user = await getUserByIdStmt.get(id);
  if (!user) return null;

  const subscription = (await getSubscriptionByUserIdStmt.get(id)) ?? {
    plan: 'free',
    status: 'active',
    createdAt: user.createdAt,
    updatedAt: user.createdAt
  };

  return {
    ...user,
    subscription
  };
}

async function markEmailVerified(userId) {
  await setEmailVerifiedStmt.run(userId);
}

async function setUserPassword(userId, passwordHash) {
  await setPasswordStmt.run(passwordHash, userId);
}

async function updateUserProfile(userId, { name, skillLevel }) {
  await updateProfileStmt.run(name, skillLevel, userId);
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserWithSubscriptionById,
  markEmailVerified,
  setUserPassword,
  updateUserProfile
};
