const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const TMP = path.join(os.tmpdir(), `loopsy-errlog-${process.pid}-${Date.now()}.db`);
delete process.env.DATABASE_URL;
process.env.DB_PATH = TMP;

require('../lib/db');
const { recordError, recentErrors, errorCountSince } = require('../lib/models/errorLogModel');

test('recordError captures and recentErrors reads back newest-first', async () => {
  await recordError({ route: '/api/a', method: 'POST', message: 'boom one', stack: 'x' });
  await recordError({ route: '/api/b', method: 'GET', message: 'boom two' });
  const recent = await recentErrors(10);
  assert.equal(recent.length, 2);
  assert.equal(recent[0].message, 'boom two');
  assert.ok((await errorCountSince(new Date(Date.now() - 3600000).toISOString())) >= 2);
});

test('recordError never throws on bad input', async () => {
  await recordError({ message: 'x'.repeat(999) });
  await recordError({});
  const recent = await recentErrors(5);
  assert.ok(recent.length >= 1);
  assert.ok(recent.every((e) => e.message.length <= 500));
});
