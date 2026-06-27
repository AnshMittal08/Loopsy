// Data-layer regression suite (lib/models/* + lib/utils/planLimits).
// Runs against a throwaway SQLite DB so it never touches dev/prod data, and
// serves as the safety net for the SQLite -> Postgres async conversion.
//
// CJS on purpose: we set DB_PATH *before* requiring any model so the singleton
// opens the temp database (ESM imports would hoist above the assignment).

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');

const TMP = path.join(os.tmpdir(), `loopsy-models-${process.pid}-${Date.now()}.db`);
delete process.env.DATABASE_URL; // tests always run against SQLite
process.env.DB_PATH = TMP;

const db = require('../lib/db');
const templateModel = require('../lib/models/templateModel');
const userModel = require('../lib/models/userModel');
const sessionModel = require('../lib/models/sessionModel');
const patternModel = require('../lib/models/patternModel');
const progressModel = require('../lib/models/progressModel');
const designModel = require('../lib/models/designModel');
const usageModel = require('../lib/models/usageModel');
const rateLimitModel = require('../lib/models/rateLimitModel');
const emailTokenModel = require('../lib/models/emailTokenModel');
const planLimits = require('../lib/utils/planLimits');

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

test.after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(TMP + suffix); } catch { /* ignore */ }
  }
});

// Each test creates its own user so they're independent.
async function makeUser() {
  return userModel.createUser({
    id: id(),
    email: `u_${id()}@example.com`,
    name: 'Test Maker',
    passwordHash: 'salt:hash',
    createdAt: now(),
    subscription: { id: id(), plan: 'free', status: 'active', createdAt: now(), updatedAt: now() },
  });
}

test('templates: seeded catalog is queryable', async () => {
  const all = await templateModel.getAllTemplates();
  assert.equal(all.length, 22);
  assert.equal((await templateModel.getTemplateById('template_001')).name, 'Classic Scarf');
  const beginners = await templateModel.getFilteredTemplates({ difficulty: 'Beginner' });
  assert.ok(beginners.length > 0);
  assert.ok(beginners.every((t) => t.difficulty === 'Beginner'));
});

test('users: create, lookup, verify, password change', async () => {
  const user = await makeUser();
  assert.equal(user.subscription.plan, 'free');
  const byEmail = await userModel.getUserByEmail(user.email);
  assert.equal(byEmail.id, user.id);
  assert.equal(byEmail.passwordHash, 'salt:hash');

  await userModel.markEmailVerified(user.id);
  assert.equal((await userModel.getUserByEmail(user.email)).emailVerified, 1);

  await userModel.setUserPassword(user.id, 'salt2:hash2');
  assert.equal((await userModel.getUserByEmail(user.email)).passwordHash, 'salt2:hash2');
});

test('billing: setUserPlan updates the subscription plan + status', async () => {
  const user = await makeUser();
  await userModel.setUserPlan(user.id, 'creator', 'active');
  const u = await userModel.getUserWithSubscriptionById(user.id);
  assert.equal(u.subscription.plan, 'creator');
  assert.equal(u.subscription.status, 'active');
  await userModel.setUserPlan(user.id, 'free', 'canceled');
  assert.equal((await userModel.getUserWithSubscriptionById(user.id)).subscription.status, 'canceled');
});

test('billing: setStripeCustomerId persists onto the subscription', async () => {
  const user = await makeUser();
  assert.equal((await userModel.getUserWithSubscriptionById(user.id)).subscription.stripeCustomerId ?? null, null);
  await userModel.setStripeCustomerId(user.id, 'cus_test_123');
  assert.equal((await userModel.getUserWithSubscriptionById(user.id)).subscription.stripeCustomerId, 'cus_test_123');
});

test('sessions: create, fetch by token, delete', async () => {
  const user = await makeUser();
  const token = crypto.randomBytes(16).toString('hex');
  await sessionModel.createSession({ id: id(), userId: user.id, token, createdAt: now(), expiresAt: new Date(Date.now() + 1e6).toISOString() });
  assert.equal((await sessionModel.getSessionByToken(token)).userId, user.id);
  await sessionModel.deleteSessionByToken(token);
  assert.equal(await sessionModel.getSessionByToken(token), null);
});

test('sessions: expired tokens are swept on read', async () => {
  const user = await makeUser();
  const token = crypto.randomBytes(16).toString('hex');
  await sessionModel.createSession({ id: id(), userId: user.id, token, createdAt: now(), expiresAt: new Date(Date.now() - 1000).toISOString() });
  assert.equal(await sessionModel.getSessionByToken(token), null);
});

test('patterns: create, read, soft-delete + audit', async () => {
  const user = await makeUser();
  const pid = id();
  await patternModel.createPattern({
    id: pid, userId: user.id, title: 'My Sphere', templateId: null,
    customization: { color: 'violet', size: 'medium' },
    steps: [{ row: 1, instruction: 'Magic ring. 6 sc. (6)' }],
    difficulty: 'Beginner', verified: true, createdAt: now(),
  });

  assert.equal((await patternModel.getPatternById(pid, user.id)).title, 'My Sphere');
  assert.ok((await patternModel.getAllPatterns(user.id)).some((p) => p.id === pid));

  const deleted = await patternModel.deletePattern(pid, user.id, { ip: '1.2.3.4' });
  assert.equal(deleted, true);
  assert.equal(await patternModel.getPatternById(pid, user.id), null, 'soft-deleted pattern is hidden');

  const audit = await db.prepare("SELECT * FROM audit_log WHERE action = 'pattern.delete' AND resourceId = ?").get(pid);
  assert.ok(audit, 'a delete is recorded in audit_log');
  assert.equal(audit.actorId, user.id);
});

test('progress: create then atomically toggle a step', async () => {
  const user = await makeUser();
  const prog = await progressModel.createProgress({
    id: id(), userId: user.id, patternId: id(), totalSteps: 2,
    steps: [{ completed: false }, { completed: false }], progressPercentage: 0, createdAt: now(),
  });
  const after = await progressModel.toggleStepAtomic(prog.id, user.id, 0);
  assert.equal(after.steps[0].completed, true);
  assert.equal(after.progressPercentage, 50);
  assert.equal((await progressModel.getProgressById(prog.id, user.id)).progressPercentage, 50);
});

test('designs: create, read, link pattern', async () => {
  const user = await makeUser();
  const design = await designModel.createDesign({ userId: user.id, name: 'Teddy', spec: { parts: [{ shape: 'sphere' }] } });
  assert.deepEqual((await designModel.getDesignById(design.id)).spec.parts[0].shape, 'sphere');
  await designModel.linkPattern(design.id, 'pattern_xyz');
  assert.equal((await designModel.getDesignById(design.id)).patternId, 'pattern_xyz');
});

test('usage + plan limits: free generation cap is enforced', async () => {
  const user = await makeUser();
  assert.equal((await planLimits.checkRateLimit(user, 'generation')).allowed, true);
  await usageModel.incrementUsage(user.id, 'generation');
  await usageModel.incrementUsage(user.id, 'generation');
  assert.equal(await usageModel.getUsageCount(user.id, 'generation'), 2);
  assert.equal((await planLimits.checkRateLimit(user, 'generation')).allowed, true, '2 of 3 used');
  await usageModel.incrementUsage(user.id, 'generation');
  assert.equal((await planLimits.checkRateLimit(user, 'generation')).allowed, false, '3 of 3 used → blocked');
});

test('vision trial: free gets exactly one lifetime analysis', async () => {
  const user = await makeUser();
  const first = await planLimits.checkVisionAccess(user);
  assert.equal(first.allowed, true);
  await planLimits.recordVisionUse(user);
  const second = await planLimits.checkVisionAccess(user);
  assert.equal(second.allowed, false);
  assert.equal(second.code, 'VISION_TRIAL_USED');
});

test('rate limiter: rolling window increments, resets, clears', async () => {
  const bucket = `t:${id()}`;
  assert.equal(await rateLimitModel.peek(bucket, 1000), 0);
  assert.equal(await rateLimitModel.hit(bucket, 1000), 1);
  assert.equal(await rateLimitModel.hit(bucket, 1000), 2);
  assert.equal(await rateLimitModel.peek(bucket, -1), 0, 'expired window reads as 0');
  await rateLimitModel.clear(bucket);
  assert.equal(await rateLimitModel.peek(bucket, 1000), 0);
});

test('email tokens: single-use, type-checked, replay-safe', async () => {
  const user = await makeUser();
  const token = await emailTokenModel.createEmailToken({ userId: user.id, type: 'verify', ttlMs: 60000 });
  assert.equal(await emailTokenModel.consumeEmailToken(token, 'reset'), null, 'wrong type rejected');
  assert.equal((await emailTokenModel.consumeEmailToken(token, 'verify')).userId, user.id);
  assert.equal(await emailTokenModel.consumeEmailToken(token, 'verify'), null, 'replay rejected');
});
