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
function makeUser() {
  const user = userModel.createUser({
    id: id(),
    email: `u_${id()}@example.com`,
    name: 'Test Maker',
    passwordHash: 'salt:hash',
    createdAt: now(),
    subscription: { id: id(), plan: 'free', status: 'active', createdAt: now(), updatedAt: now() },
  });
  return user;
}

test('templates: seeded catalog is queryable', () => {
  const all = templateModel.getAllTemplates();
  assert.equal(all.length, 22);
  assert.equal(templateModel.getTemplateById('template_001').name, 'Classic Scarf');
  const beginners = templateModel.getFilteredTemplates({ difficulty: 'Beginner' });
  assert.ok(beginners.length > 0);
  assert.ok(beginners.every((t) => t.difficulty === 'Beginner'));
});

test('users: create, lookup, verify, password change', () => {
  const user = makeUser();
  assert.equal(user.subscription.plan, 'free');
  const byEmail = userModel.getUserByEmail(user.email);
  assert.equal(byEmail.id, user.id);
  assert.equal(byEmail.passwordHash, 'salt:hash');

  userModel.markEmailVerified(user.id);
  assert.equal(userModel.getUserByEmail(user.email).emailVerified, 1);

  userModel.setUserPassword(user.id, 'salt2:hash2');
  assert.equal(userModel.getUserByEmail(user.email).passwordHash, 'salt2:hash2');
});

test('sessions: create, fetch by token, delete', () => {
  const user = makeUser();
  const token = crypto.randomBytes(16).toString('hex');
  sessionModel.createSession({ id: id(), userId: user.id, token, createdAt: now(), expiresAt: new Date(Date.now() + 1e6).toISOString() });
  assert.equal(sessionModel.getSessionByToken(token).userId, user.id);
  sessionModel.deleteSessionByToken(token);
  assert.equal(sessionModel.getSessionByToken(token), null);
});

test('sessions: expired tokens are swept on read', () => {
  const user = makeUser();
  const token = crypto.randomBytes(16).toString('hex');
  sessionModel.createSession({ id: id(), userId: user.id, token, createdAt: now(), expiresAt: new Date(Date.now() - 1000).toISOString() });
  assert.equal(sessionModel.getSessionByToken(token), null);
});

test('patterns: create, read, soft-delete + audit', () => {
  const user = makeUser();
  const pid = id();
  patternModel.createPattern({
    id: pid, userId: user.id, title: 'My Sphere', templateId: null,
    customization: { color: 'violet', size: 'medium' },
    steps: [{ row: 1, instruction: 'Magic ring. 6 sc. (6)' }],
    difficulty: 'Beginner', verified: true, createdAt: now(),
  });

  assert.equal(patternModel.getPatternById(pid, user.id).title, 'My Sphere');
  assert.ok(patternModel.getAllPatterns(user.id).some((p) => p.id === pid));

  const deleted = patternModel.deletePattern(pid, user.id, { ip: '1.2.3.4' });
  assert.equal(deleted, true);
  assert.equal(patternModel.getPatternById(pid, user.id), null, 'soft-deleted pattern is hidden');

  const audit = db.prepare("SELECT * FROM audit_log WHERE action = 'pattern.delete' AND resourceId = ?").get(pid);
  assert.ok(audit, 'a delete is recorded in audit_log');
  assert.equal(audit.actorId, user.id);
});

test('progress: create then atomically toggle a step', () => {
  const user = makeUser();
  const prog = progressModel.createProgress({
    id: id(), userId: user.id, patternId: id(), totalSteps: 2,
    steps: [{ completed: false }, { completed: false }], progressPercentage: 0, createdAt: now(),
  });
  const after = progressModel.toggleStepAtomic(prog.id, user.id, 0);
  assert.equal(after.steps[0].completed, true);
  assert.equal(after.progressPercentage, 50);
  assert.equal(progressModel.getProgressById(prog.id, user.id).progressPercentage, 50);
});

test('designs: create, read, link pattern', () => {
  const user = makeUser();
  const design = designModel.createDesign({ userId: user.id, name: 'Teddy', spec: { parts: [{ shape: 'sphere' }] } });
  assert.deepEqual(designModel.getDesignById(design.id).spec.parts[0].shape, 'sphere');
  designModel.linkPattern(design.id, 'pattern_xyz');
  assert.equal(designModel.getDesignById(design.id).patternId, 'pattern_xyz');
});

test('usage + plan limits: free generation cap is enforced', () => {
  const user = makeUser();
  assert.equal(planLimits.checkRateLimit(user, 'generation').allowed, true);
  usageModel.incrementUsage(user.id, 'generation');
  usageModel.incrementUsage(user.id, 'generation');
  assert.equal(usageModel.getUsageCount(user.id, 'generation'), 2);
  assert.equal(planLimits.checkRateLimit(user, 'generation').allowed, true, '2 of 3 used');
  usageModel.incrementUsage(user.id, 'generation');
  assert.equal(planLimits.checkRateLimit(user, 'generation').allowed, false, '3 of 3 used → blocked');
});

test('vision trial: free gets exactly one lifetime analysis', () => {
  const user = makeUser();
  const first = planLimits.checkVisionAccess(user);
  assert.equal(first.allowed, true);
  planLimits.recordVisionUse(user);
  const second = planLimits.checkVisionAccess(user);
  assert.equal(second.allowed, false);
  assert.equal(second.code, 'VISION_TRIAL_USED');
});

test('rate limiter: rolling window increments, resets, clears', () => {
  const bucket = `t:${id()}`;
  assert.equal(rateLimitModel.peek(bucket, 1000), 0);
  assert.equal(rateLimitModel.hit(bucket, 1000), 1);
  assert.equal(rateLimitModel.hit(bucket, 1000), 2);
  assert.equal(rateLimitModel.peek(bucket, -1), 0, 'expired window reads as 0');
  rateLimitModel.clear(bucket);
  assert.equal(rateLimitModel.peek(bucket, 1000), 0);
});

test('email tokens: single-use, type-checked, replay-safe', () => {
  const user = makeUser();
  const token = emailTokenModel.createEmailToken({ userId: user.id, type: 'verify', ttlMs: 60000 });
  assert.equal(emailTokenModel.consumeEmailToken(token, 'reset'), null, 'wrong type rejected');
  assert.equal(emailTokenModel.consumeEmailToken(token, 'verify').userId, user.id);
  assert.equal(emailTokenModel.consumeEmailToken(token, 'verify'), null, 'replay rejected');
});
