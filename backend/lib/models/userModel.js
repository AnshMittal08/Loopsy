const db = require('../db');

const insertUserStmt = db.prepare(`
  INSERT INTO users (id, email, name, passwordHash, skillLevel, handle, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const handleExistsStmt = db.prepare(`SELECT 1 FROM users WHERE handle = ?`);

/** Slugify a display name into a URL-safe handle base. */
function slugifyHandle(name) {
  const base = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return base || 'maker';
}

/** Resolve a unique handle from a base, appending -2, -3… on collision. */
async function uniqueHandle(name) {
  const base = slugifyHandle(name);
  if (!(await handleExistsStmt.get(base))) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!(await handleExistsStmt.get(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const getUserByIdStmt = db.prepare(`
  SELECT id, email, name, skillLevel, emailVerified, handle, createdAt
  FROM users
  WHERE id = ?
`);

const getUserByHandleStmt = db.prepare(`
  SELECT id, name, handle, createdAt
  FROM users
  WHERE handle = ?
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
  SELECT plan, status, stripeCustomerId, createdAt, updatedAt
  FROM subscriptions
  WHERE userId = ?
`);

const setEmailVerifiedStmt = db.prepare(`UPDATE users SET emailVerified = 1 WHERE id = ?`);
const setPasswordStmt = db.prepare(`UPDATE users SET passwordHash = ? WHERE id = ?`);
const updateProfileStmt = db.prepare(`UPDATE users SET name = ?, skillLevel = ? WHERE id = ?`);
const setPlanStmt = db.prepare(`UPDATE subscriptions SET plan = ?, status = ?, updatedAt = ? WHERE userId = ?`);
const setStripeCustomerStmt = db.prepare(`UPDATE subscriptions SET stripeCustomerId = ?, updatedAt = ? WHERE userId = ?`);

async function createUser(user) {
  const handle = user.handle ?? (await uniqueHandle(user.name));
  await insertUserStmt.run(
    user.id,
    user.email.toLowerCase(),
    user.name,
    user.passwordHash,
    user.skillLevel ?? 'beginner',
    handle,
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

/** Set a user's subscription plan (the billing source of truth). */
async function setUserPlan(userId, plan, status = "active") {
  await setPlanStmt.run(plan, status, new Date().toISOString(), userId);
}

/** Persist the Stripe customer id so we can open the billing portal later. */
async function setStripeCustomerId(userId, stripeCustomerId) {
  await setStripeCustomerStmt.run(stripeCustomerId, new Date().toISOString(), userId);
}

/** Public creator record by handle (no email / private fields). */
async function getUserByHandle(handle) {
  const row = await getUserByHandleStmt.get(String(handle || '').toLowerCase());
  return row || null;
}

const setHandleStmt = db.prepare(`UPDATE users SET handle = ? WHERE id = ? AND (handle IS NULL OR handle = '')`);

/** Self-healing backfill: assign a unique handle to a user that lacks one. */
async function assignHandleIfMissing(userId, name) {
  const handle = await uniqueHandle(name);
  await setHandleStmt.run(handle, userId);
  return handle;
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserWithSubscriptionById,
  markEmailVerified,
  setUserPassword,
  updateUserProfile,
  setUserPlan,
  setStripeCustomerId,
  getUserByHandle,
  uniqueHandle,
  assignHandleIfMissing
};
