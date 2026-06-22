// Route-handler integration tests. They invoke the real Next App-Router
// handlers (via the @/ alias loader in setup.mjs) against a throwaway SQLite
// DB. This is the end-to-end net that makes the data-layer async conversion
// safe — a missing `await` in a handler surfaces here, not in production.
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const TMP = path.join(os.tmpdir(), `loopsy-routes-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = TMP;
// Pin an allowlist so the CSRF origin-check accepts our test requests.
process.env.FRONTEND_URL = 'http://localhost:5173';

test.after(() => {
  for (const s of ['', '-wal', '-shm']) { try { fs.unlinkSync(TMP + s); } catch { /* ignore */ } }
});

const origin = 'http://localhost:5173';
const jsonReq = (url, body, headers = {}) =>
  new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', origin, ...headers }, body: JSON.stringify(body) });

test('GET /api/me → null user when unauthenticated', async () => {
  const { GET } = await import('../app/api/me/route.js');
  const res = await GET(new Request('http://localhost/api/me'));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).user, null);
});

test('signup → login → me round-trips a session cookie', async () => {
  const { POST: signup } = await import('../app/api/auth/signup/route.js');
  const { POST: login } = await import('../app/api/auth/login/route.js');
  const { GET: me } = await import('../app/api/me/route.js');

  const email = `maker_${Date.now()}@example.com`;
  const password = 'supersecret123';

  const sres = await signup(jsonReq('http://localhost/api/auth/signup', { name: 'Maker', email, password }));
  assert.equal(sres.status, 201, 'signup succeeds');
  const setCookie = sres.headers.get('set-cookie');
  assert.match(setCookie || '', /loopsy_session=/, 'signup sets the session cookie');
  assert.equal((await sres.json()).user.email, email);

  // Extract the cookie and confirm /api/me now resolves the user.
  const cookie = setCookie.split(';')[0];
  const mres = await me(new Request('http://localhost/api/me', { headers: { cookie } }));
  assert.equal((await mres.json()).user.email, email, 'session resolves the signed-up user');

  // Login with the same credentials.
  const lres = await login(jsonReq('http://localhost/api/auth/login', { email, password }));
  assert.equal(lres.status, 200, 'login succeeds');
  assert.equal((await lres.json()).user.email, email);

  // Wrong password is rejected.
  const bad = await login(jsonReq('http://localhost/api/auth/login', { email, password: 'wrong' }));
  assert.equal(bad.status, 401, 'wrong password rejected');
});

test('cross-site origin is blocked on auth POST (CSRF defense)', async () => {
  const { POST: login } = await import('../app/api/auth/login/route.js');
  const res = await login(jsonReq('http://localhost/api/auth/login', { email: 'x@y.com', password: 'z' }, { origin: 'https://evil.example.com' }));
  assert.equal(res.status, 403);
});

test('GET /api/templates returns the seeded catalog (public)', async () => {
  const { GET } = await import('../app/api/templates/route.js');
  const res = await GET(new Request('http://localhost/api/templates'));
  assert.equal(res.status, 200);
  const body = await res.json();
  const list = Array.isArray(body) ? body : body.templates;
  assert.ok(list.length >= 22, 'catalog present');
});
