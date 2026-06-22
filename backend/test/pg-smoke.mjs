// Postgres smoke test — runs the REAL App-Router handlers against a live
// Postgres (DATABASE_URL) via the @/ alias loader + next/server shim in
// setup.mjs. Verifies the dual-driver adapter end-to-end on Postgres, then
// cleans up the test user it created (FK cascades remove its child rows).
//
//   cd backend
//   DATABASE_URL="postgresql://…?sslmode=require" npm run migrate
//   DATABASE_URL="postgresql://…?sslmode=require" npm run smoke:pg
import assert from 'node:assert/strict';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ Set DATABASE_URL to run the Postgres smoke test.');
  process.exit(1);
}
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const origin = process.env.FRONTEND_URL;

const email = `pgsmoke_${Date.now()}@example.com`;
const password = 'supersecret123';
const jsonReq = (u, body, headers = {}) =>
  new Request(u, { method: 'POST', headers: { 'content-type': 'application/json', origin, ...headers }, body: JSON.stringify(body) });

let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures += 1; console.error('  ✗', name, '—', e.message); }
};

console.log('Running route handlers against Postgres:', url.replace(/:[^:@/]+@/, ':****@'));

const { GET: me } = await import('../app/api/me/route.js');
const { POST: signup } = await import('../app/api/auth/signup/route.js');
const { POST: login } = await import('../app/api/auth/login/route.js');
const { GET: templates } = await import('../app/api/templates/route.js');

let cookie;
await check('signup → 201 + session cookie', async () => {
  const res = await signup(jsonReq('http://x/api/auth/signup', { name: 'PG Smoke', email, password }));
  assert.equal(res.status, 201);
  const sc = res.headers.get('set-cookie');
  assert.match(sc || '', /loopsy_session=/);
  cookie = sc.split(';')[0];
  assert.equal((await res.json()).user.email, email);
});
await check('GET /api/me resolves the session', async () => {
  const res = await me(new Request('http://x/api/me', { headers: { cookie } }));
  assert.equal((await res.json()).user.email, email);
});
await check('login → 200', async () => {
  const res = await login(jsonReq('http://x/api/auth/login', { email, password }));
  assert.equal(res.status, 200);
});
await check('wrong password → 401', async () => {
  const res = await login(jsonReq('http://x/api/auth/login', { email, password: 'nope' }));
  assert.equal(res.status, 401);
});
await check('cross-site origin → 403', async () => {
  const res = await login(jsonReq('http://x/api/auth/login', { email, password }, { origin: 'https://evil.example.com' }));
  assert.equal(res.status, 403);
});
await check('GET /api/templates → ≥ 22 seeded', async () => {
  const res = await templates(new Request('http://x/api/templates'));
  const body = await res.json();
  const list = Array.isArray(body) ? body : body.templates;
  assert.ok(list.length >= 22, `got ${list?.length}`);
});

// Clean up the row we created (cascades to sessions/subscription/ai_usage/tokens).
try {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('DELETE FROM users WHERE email = $1', [email]);
  await client.end();
} catch (e) { console.warn('  (cleanup skipped:', e.message, ')'); }

console.log(failures ? `\n✗ ${failures} check(s) failed against Postgres` : '\n✓ all checks passed against Postgres');
process.exit(failures ? 1 : 0);
