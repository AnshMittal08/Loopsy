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
delete process.env.DATABASE_URL; // tests always run against SQLite
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

// Sign up a fresh user and return its session cookie.
async function signedUpCookie() {
  const { POST: signup } = await import('../app/api/auth/signup/route.js');
  const res = await signup(jsonReq('http://x/api/auth/signup', { name: 'Auth', email: `auth_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`, password: 'supersecret123' }));
  assert.equal(res.status, 201);
  return res.headers.get('set-cookie').split(';')[0];
}

test('authenticated routes: the requireAuthenticatedUser gate works through the stack', async () => {
  const { GET: usage } = await import('../app/api/usage/route.js');
  // Unauthenticated → 401 (the gate).
  assert.equal((await usage(new Request('http://x/api/usage'))).status, 401);
  // Authenticated → 200 with the free-plan shape.
  const cookie = await signedUpCookie();
  const res = await usage(new Request('http://x/api/usage', { headers: { cookie } }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).plan, 'free');
});

test('designs: create (validated) then list for the owner', async () => {
  const { POST: createDesign, GET: listDesigns } = await import('../app/api/designs/route.js');
  const cookie = await signedUpCookie();

  // Missing spec → 400 (zod).
  assert.equal((await createDesign(jsonReq('http://x/api/designs', { name: 'X' }, { cookie }))).status, 400);

  // Valid spec → 201.
  const created = await createDesign(jsonReq('http://x/api/designs', { name: 'Teddy', spec: { parts: [{ shape: 'sphere' }] } }, { cookie }));
  assert.equal(created.status, 201);
  const design = await created.json();
  assert.ok(design.id);

  const list = await (await listDesigns(new Request('http://x/api/designs', { headers: { cookie } }))).json();
  assert.ok(list.some((d) => d.id === design.id), 'the new design appears in the owner list');
});

test('input validation: malformed auth bodies are rejected with 400', async () => {
  const { POST: signup } = await import('../app/api/auth/signup/route.js');
  const { POST: login } = await import('../app/api/auth/login/route.js');
  assert.equal((await signup(jsonReq('http://x/api/auth/signup', { name: '', email: 'nope', password: 'short' }))).status, 400);
  assert.equal((await login(jsonReq('http://x/api/auth/login', { email: 'not-an-email', password: '' }))).status, 400);
  // a well-formed body still succeeds
  assert.equal((await signup(jsonReq('http://x/api/auth/signup', { name: 'Valid', email: `v_${Date.now()}@example.com`, password: 'longenough1' }))).status, 201);
});
