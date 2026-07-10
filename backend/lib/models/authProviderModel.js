// OAuth identity linking — the account-resolution brain behind "Sign in with
// Google" (and any future provider). Pure data logic, no HTTP: the routes
// hand this module a verified provider profile and get back a session-ready
// user. Resolution order:
//
//   1. Known identity (provider + providerUserId)      → that user.
//   2. Existing account with the same VERIFIED email   → link identity to it.
//   3. Nobody                                          → create a new account.
//
// Linking by email only happens when the provider asserts the email is
// verified — otherwise anyone could claim an address at a sloppy provider
// and take over the matching Loopsy account.

const crypto = require('crypto');
const db = require('../db');
const { createUser, getUserByEmail, getUserWithSubscriptionById, markEmailVerified } = require('./userModel');

const findIdentityStmt = db.prepare(
  `SELECT userId FROM user_identities WHERE provider = ? AND providerUserId = ?`
);
const insertIdentityStmt = db.prepare(
  `INSERT INTO user_identities (id, userId, provider, providerUserId, email, createdAt)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const listForUserStmt = db.prepare(
  `SELECT provider, email, createdAt FROM user_identities WHERE userId = ? ORDER BY createdAt ASC`
);
const isDeletedStmt = db.prepare(`SELECT deletedAt FROM users WHERE id = ?`);

async function isDeletedUser(userId) {
  const row = await isDeletedStmt.get(userId);
  return !row || Boolean(row.deletedAt);
}

async function findUserIdByIdentity(provider, providerUserId) {
  const row = await findIdentityStmt.get(provider, providerUserId);
  return row?.userId ?? null;
}

async function linkIdentity({ userId, provider, providerUserId, email = null }) {
  await insertIdentityStmt.run(
    crypto.randomUUID(), userId, provider, providerUserId, email, new Date().toISOString()
  );
}

/** Providers linked to a user — shown in Account and included in the export. */
async function listIdentitiesForUser(userId) {
  return listForUserStmt.all(userId);
}

/**
 * Resolve a verified OAuth profile to a Loopsy user (creating or linking as
 * needed). Returns { user, created, linked }.
 *
 * @param {{ provider: string, providerUserId: string, email: string,
 *           emailVerified: boolean, name?: string }} profile
 */
async function resolveOAuthUser({ provider, providerUserId, email, emailVerified, name }) {
  // 1. Returning OAuth user. An identity pointing at a deleted (tombstoned)
  // account must NOT resurrect it — treat as no match and fall through to
  // creating a fresh account for this person.
  const knownUserId = await findUserIdByIdentity(provider, providerUserId);
  if (knownUserId) {
    if (await isDeletedUser(knownUserId)) return { user: null, created: false, linked: false };
    const user = await getUserWithSubscriptionById(knownUserId);
    if (user) return { user, created: false, linked: false };
    return { user: null, created: false, linked: false };
  }

  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!normalizedEmail) return { user: null, created: false, linked: false };

  // 2. The email already belongs to an account.
  const existing = await getUserByEmail(normalizedEmail);
  if (existing && !existing.deletedAt) {
    if (!emailVerified) {
      // The provider did NOT vouch for this address — linking would let
      // anyone who registers a victim's email at a sloppy provider take over
      // the matching Loopsy account. Refuse; the user can sign in with their
      // password instead. (users.email is UNIQUE, so creating a separate
      // account is not an option either.)
      return { user: null, created: false, linked: false, conflict: 'unverified_email' };
    }
    await linkIdentity({ userId: existing.id, provider, providerUserId, email: normalizedEmail });
    // The provider vouched for the address, so the account's email is proven
    // even if the user never clicked our verification link.
    if (!existing.emailVerified) await markEmailVerified(existing.id);
    const user = await getUserWithSubscriptionById(existing.id);
    return { user, created: false, linked: true };
  }

  // 3. Brand-new maker. No usable password — the stored hash is random (never
  // derived from any input), so password login is impossible until they set
  // one via the reset flow. It stays salt:hash SHAPED because verifyPassword's
  // timingSafeEqual throws on byte-length mismatch rather than returning false.
  const timestamp = new Date().toISOString();
  const user = await createUser({
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: (name || normalizedEmail.split('@')[0] || 'Maker').slice(0, 60),
    passwordHash: `${crypto.randomBytes(16).toString('hex')}:${crypto.randomBytes(64).toString('hex')}`,
    createdAt: timestamp,
    subscription: {
      id: crypto.randomUUID(),
      plan: 'free',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });
  if (emailVerified) await markEmailVerified(user.id);
  await linkIdentity({ userId: user.id, provider, providerUserId, email: normalizedEmail });
  const fresh = await getUserWithSubscriptionById(user.id);
  return { user: fresh, created: true, linked: false };
}

module.exports = { resolveOAuthUser, findUserIdByIdentity, linkIdentity, listIdentitiesForUser };
