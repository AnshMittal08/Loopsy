// OAuth identity linking + magic-link tokens + Turnstile gate.
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const TMP = path.join(os.tmpdir(), `loopsy-authp-${process.pid}-${Date.now()}.db`);
delete process.env.DATABASE_URL;
process.env.DB_PATH = TMP;

const db = require('../lib/db');
const userModel = require('../lib/models/userModel');
const { resolveOAuthUser, listIdentitiesForUser, findUserIdByIdentity } = require('../lib/models/authProviderModel');
const { deleteUserAccount } = require('../lib/models/accountModel');
const { createEmailToken, consumeEmailToken } = require('../lib/models/emailTokenModel');
const { verifyTurnstile } = require('../lib/auth/turnstile');

const now = new Date().toISOString();

test('new Google profile creates an account with a verified email and no usable password', async () => {
  const { user, created, linked } = await resolveOAuthUser({
    provider: 'google', providerUserId: 'g-new-1',
    email: 'Fresh@Example.com', emailVerified: true, name: 'Fresh Maker',
  });
  assert.ok(created);
  assert.equal(linked, false);
  assert.equal(user.email, 'fresh@example.com', 'email is normalized');
  assert.equal(Number(user.emailVerified), 1, 'Google-verified email counts as verified');
  assert.ok(user.handle, 'gets a handle like any signup');
  // The stored hash is salt:hash shaped but random — password login must fail
  // safely (no throw from timingSafeEqual) for any guess.
  const { verifyPassword } = await import('../lib/auth/session.js');
  const record = await userModel.getUserByEmail('fresh@example.com');
  assert.equal(verifyPassword('any-guess-at-all', record.passwordHash), false);
});

test('returning identity resolves to the same user without creating another', async () => {
  const first = await resolveOAuthUser({ provider: 'google', providerUserId: 'g-ret-1', email: 'ret@example.com', emailVerified: true, name: 'Ret' });
  const second = await resolveOAuthUser({ provider: 'google', providerUserId: 'g-ret-1', email: 'ret@example.com', emailVerified: true, name: 'Ret' });
  assert.equal(second.created, false);
  assert.equal(second.user.id, first.user.id);
});

test('verified matching email links to the existing password account (and proves its email)', async () => {
  await userModel.createUser({
    id: 'u_pw', email: 'pw@example.com', name: 'Password Person',
    passwordHash: 'salt:hash', createdAt: now,
    subscription: { id: 'sub_pw', plan: 'free', status: 'active', createdAt: now, updatedAt: now },
  });
  const { user, created, linked } = await resolveOAuthUser({
    provider: 'google', providerUserId: 'g-link-1', email: 'PW@example.com', emailVerified: true, name: 'PP',
  });
  assert.equal(created, false);
  assert.ok(linked);
  assert.equal(user.id, 'u_pw');
  assert.equal(Number(user.emailVerified), 1);
  const ids = await listIdentitiesForUser('u_pw');
  assert.equal(ids.length, 1);
  assert.equal(ids[0].provider, 'google');
});

test('UNVERIFIED matching email must NOT link (account-takeover guard)', async () => {
  await userModel.createUser({
    id: 'u_victim', email: 'victim@example.com', name: 'Victim',
    passwordHash: 'salt:hash', createdAt: now,
    subscription: { id: 'sub_v', plan: 'free', status: 'active', createdAt: now, updatedAt: now },
  });
  const { user, conflict } = await resolveOAuthUser({
    provider: 'google', providerUserId: 'g-evil-1', email: 'victim@example.com', emailVerified: false, name: 'Mallory',
  });
  assert.equal(user, null, 'sign-in is refused outright');
  assert.equal(conflict, 'unverified_email');
  assert.equal((await listIdentitiesForUser('u_victim')).length, 0, 'victim account untouched');
  assert.equal(await findUserIdByIdentity('google', 'g-evil-1'), null, 'no identity row was written');
});

test('deletion purges identities; signing in again starts a FRESH account, never resurrects', async () => {
  const { user } = await resolveOAuthUser({ provider: 'google', providerUserId: 'g-dead-1', email: 'dead@example.com', emailVerified: true, name: 'Dead' });
  await deleteUserAccount(user.id);
  assert.equal((await listIdentitiesForUser(user.id)).length, 0, 'identities purged with the account');

  const again = await resolveOAuthUser({ provider: 'google', providerUserId: 'g-dead-1', email: 'dead@example.com', emailVerified: true, name: 'Dead' });
  assert.ok(again.created, 'a brand-new account is created');
  assert.notEqual(again.user.id, user.id, 'the tombstoned account is not reused');
});

test('magic tokens are single-use, type-scoped and expiring', async () => {
  await userModel.createUser({
    id: 'u_magic', email: 'magic@example.com', name: 'Magic',
    passwordHash: 'salt:hash', createdAt: now,
    subscription: { id: 'sub_m', plan: 'free', status: 'active', createdAt: now, updatedAt: now },
  });
  const token = await createEmailToken({ userId: 'u_magic', type: 'magic', ttlMs: 60000 });
  assert.equal(await consumeEmailToken(token, 'reset'), null, 'wrong type is rejected');
  const ok = await consumeEmailToken(token, 'magic');
  assert.equal(ok.userId, 'u_magic');
  assert.equal(await consumeEmailToken(token, 'magic'), null, 'second use is rejected');
  const expired = await createEmailToken({ userId: 'u_magic', type: 'magic', ttlMs: -1 });
  assert.equal(await consumeEmailToken(expired, 'magic'), null, 'expired token is rejected');
});

test('turnstile: dormant without env; fail-closed with env', async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await verifyTurnstile(undefined, '1.2.3.4'), true, 'unconfigured → pass-through');

  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  try {
    assert.equal(await verifyTurnstile(null, '1.2.3.4'), false, 'configured + missing token → reject');
    const okFetch = async () => ({ ok: true, json: async () => ({ success: true }) });
    assert.equal(await verifyTurnstile('tok', '1.2.3.4', okFetch), true);
    const badFetch = async () => ({ ok: true, json: async () => ({ success: false }) });
    assert.equal(await verifyTurnstile('tok', '1.2.3.4', badFetch), false);
    const downFetch = async () => { throw new Error('network down'); };
    assert.equal(await verifyTurnstile('tok', '1.2.3.4', downFetch), false, 'verifier unreachable → fail closed');
  } finally {
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});
