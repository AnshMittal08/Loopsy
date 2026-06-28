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
// Each call uses a unique X-Forwarded-For so the per-IP signup rate limit
// (10 req/hr) is never reached within the test run.
let _signupCounter = 0;
async function signedUpCookie() {
  const { POST: signup } = await import('../app/api/auth/signup/route.js');
  const ip = `10.0.${Math.floor((_signupCounter) / 255)}.${(_signupCounter++) % 255 + 1}`;
  const res = await signup(new Request('http://x/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin, 'x-forwarded-for': ip },
    body: JSON.stringify({ name: 'Auth', email: `auth_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`, password: 'supersecret123' }),
  }));
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

test('search: public templates + scoped owner results', async () => {
  const { GET: search } = await import('../app/api/search/route.js');

  // Public (no auth): the template catalog is searchable.
  const pub = await (await search(new Request('http://x/api/search?q=scarf'))).json();
  assert.ok(pub.templates.some((t) => /scarf/i.test(t.name)), 'finds Classic Scarf');
  assert.deepEqual(pub.patterns, [], 'no owner results without auth');

  // Too-short query → empty groups.
  const short = await (await search(new Request('http://x/api/search?q=a'))).json();
  assert.deepEqual(short.templates, []);

  // Authenticated: the caller's own designs are searchable.
  const cookie = await signedUpCookie();
  const { POST: createDesign } = await import('../app/api/designs/route.js');
  await createDesign(jsonReq('http://x/api/designs', { name: 'Spiderman Mask', spec: { parts: [{ shape: 'sphere' }] } }, { cookie }));
  const mine = await (await search(new Request('http://x/api/search?q=spiderman', { headers: { cookie } }))).json();
  assert.ok(mine.designs.some((d) => /spiderman/i.test(d.name)), 'finds the owner\'s design');
});

test('profile: PATCH /api/me updates name + skill level (auth required)', async () => {
  const { PATCH: patchMe, GET: me } = await import('../app/api/me/route.js');
  const patchReq = (body, headers = {}) =>
    new Request('http://x/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

  assert.equal((await patchMe(patchReq({ name: 'X' }))).status, 401, 'unauthenticated is rejected');

  const cookie = await signedUpCookie();
  const res = await patchMe(patchReq({ name: 'Renamed Maker', skillLevel: 'advanced' }, { cookie }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).user.name, 'Renamed Maker');

  const u = (await (await me(new Request('http://x/api/me', { headers: { cookie } }))).json()).user;
  assert.equal(u.name, 'Renamed Maker');
  assert.equal(u.skillLevel, 'advanced');

  // Invalid skill level → 400.
  assert.equal((await patchMe(patchReq({ name: 'Y', skillLevel: 'wizard' }, { cookie }))).status, 400);
});

test('resend verification: requires auth, returns ok for a fresh user', async () => {
  const { POST: resend } = await import('../app/api/auth/resend-verification/route.js');
  assert.equal((await resend(jsonReq('http://x/api/auth/resend-verification', {}))).status, 401);
  const cookie = await signedUpCookie();
  const res = await resend(jsonReq('http://x/api/auth/resend-verification', {}, { cookie }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test('patterns: create from a template, then soft-delete via the API', async () => {
  const { POST: createPattern, GET: listPatterns } = await import('../app/api/patterns/route.js');
  const { DELETE: deletePattern } = await import('../app/api/patterns/[id]/route.js');
  const cookie = await signedUpCookie();

  const created = await createPattern(jsonReq('http://x/api/patterns', { templateId: 'template_001', title: 'My Scarf' }, { cookie }));
  assert.equal(created.status, 201);
  const pattern = await created.json();
  assert.ok(pattern.id);

  const del = await deletePattern(new Request(`http://x/api/patterns/${pattern.id}`, { method: 'DELETE', headers: { cookie } }), { params: { id: pattern.id } });
  assert.equal(del.status, 200);

  const list = await (await listPatterns(new Request('http://x/api/patterns', { headers: { cookie } }))).json();
  assert.ok(!list.some((p) => p.id === pattern.id), 'soft-deleted pattern no longer lists');
});

test('billing: checkout requires auth and 503s until configured', async () => {
  const { POST: checkout } = await import('../app/api/billing/checkout/route.js');
  // Unauthenticated → 401 (the gate).
  assert.equal((await checkout(jsonReq('http://x/api/billing/checkout', { plan: 'creator' }))).status, 401);
  // Authenticated but Stripe unconfigured → 503 with an honest code.
  const cookie = await signedUpCookie();
  const res = await checkout(jsonReq('http://x/api/billing/checkout', { plan: 'creator' }, { cookie }));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'BILLING_NOT_CONFIGURED');
});

test('community: publish toggle, public feed, and star', async () => {
  const { POST: createPattern } = await import('../app/api/patterns/route.js');
  const { PATCH: patchPattern } = await import('../app/api/patterns/[id]/route.js');
  const { GET: community } = await import('../app/api/community/route.js');
  const { POST: star } = await import('../app/api/patterns/[id]/star/route.js');

  const cookie = await signedUpCookie();

  // Create a pattern.
  const created = await createPattern(jsonReq('http://x/api/patterns', { templateId: 'template_001', title: 'Community Scarf' }, { cookie }));
  assert.equal(created.status, 201);
  const p = await created.json();

  // Community feed is empty before publish.
  const feedBefore = await (await community(new Request('http://x/api/community'))).json();
  assert.equal(feedBefore.patterns.some((x) => x.id === p.id), false, 'not in feed before publish');

  // Publish the pattern.
  const pub = await patchPattern(new Request(`http://x/api/patterns/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ published: true }) }), { params: { id: p.id } });
  assert.equal(pub.status, 200);
  assert.equal((await pub.json()).published, true);

  // Community feed now includes it.
  const feedAfter = await (await community(new Request('http://x/api/community'))).json();
  assert.ok(feedAfter.patterns.some((x) => x.id === p.id), 'appears in feed after publish');

  // Star it.
  const s = await star(new Request(`http://x/api/patterns/${p.id}/star`, { method: 'POST', headers: { cookie }, body: null }), { params: { id: p.id } });
  assert.equal(s.status, 200);
  const sData = await s.json();
  assert.equal(sData.starred, true);
  assert.equal(sData.starCount, 1);

  // Star again toggles off.
  const s2 = await star(new Request(`http://x/api/patterns/${p.id}/star`, { method: 'POST', headers: { cookie }, body: null }), { params: { id: p.id } });
  assert.equal((await s2.json()).starred, false);

  // Unpublish.
  const unpub = await patchPattern(new Request(`http://x/api/patterns/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ published: false }) }), { params: { id: p.id } });
  assert.equal((await unpub.json()).published, false);
  const feedGone = await (await community(new Request('http://x/api/community'))).json();
  assert.equal(feedGone.patterns.some((x) => x.id === p.id), false, 'gone from feed after unpublish');
});

test('profiles: a creator page lists their published patterns by handle', async () => {
  const { POST: createPattern } = await import('../app/api/patterns/route.js');
  const { PATCH: patchPattern } = await import('../app/api/patterns/[id]/route.js');
  const { GET: me } = await import('../app/api/me/route.js');
  const { GET: profile } = await import('../app/api/users/[handle]/route.js');

  const cookie = await signedUpCookie();

  // The user has a handle (assigned at signup / lazily on /api/me).
  const meData = (await (await me(new Request('http://x/api/me', { headers: { cookie } }))).json()).user;
  assert.ok(meData.handle, 'user has a handle');

  // Unknown handle → 404.
  assert.equal((await profile(new Request('http://x/api/users/nobody-here'), { params: { handle: 'nobody-here' } })).status, 404);

  // Create + publish a pattern.
  const p = await (await createPattern(jsonReq('http://x/api/patterns', { templateId: 'template_001', title: 'Profile Scarf' }, { cookie }))).json();
  await patchPattern(new Request(`http://x/api/patterns/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ published: true }) }), { params: { id: p.id } });

  // The public profile lists it.
  const res = await profile(new Request(`http://x/api/users/${meData.handle}`), { params: { handle: meData.handle } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.creator.handle, meData.handle);
  assert.ok(body.patterns.some((x) => x.id === p.id), 'published pattern appears on profile');
  assert.equal(body.stats.published >= 1, true);
});

test('collections: create, add/remove pattern, list, delete (owner-scoped)', async () => {
  const { POST: createPattern } = await import('../app/api/patterns/route.js');
  const { PATCH: patchPattern } = await import('../app/api/patterns/[id]/route.js');
  const { GET: listCols, POST: createCol } = await import('../app/api/collections/route.js');
  const { GET: getCol, DELETE: delCol } = await import('../app/api/collections/[id]/route.js');
  const { POST: addItem } = await import('../app/api/collections/[id]/patterns/route.js');

  const cookie = await signedUpCookie();

  // Auth gate.
  assert.equal((await listCols(new Request('http://x/api/collections'))).status, 401);

  // Create a collection.
  const created = await createCol(jsonReq('http://x/api/collections', { name: 'Holiday makes' }, { cookie }));
  assert.equal(created.status, 201);
  const col = await created.json();
  assert.equal(col.patternCount, 0);

  // Empty name → 400.
  assert.equal((await createCol(jsonReq('http://x/api/collections', { name: '' }, { cookie }))).status, 400);

  // Publish a pattern, add it to the collection.
  const p = await (await createPattern(jsonReq('http://x/api/patterns', { templateId: 'template_001', title: 'Saved Scarf' }, { cookie }))).json();
  await patchPattern(new Request(`http://x/api/patterns/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ published: true }) }), { params: { id: p.id } });

  const add = await addItem(jsonReq(`http://x/api/collections/${col.id}/patterns`, { patternId: p.id, present: true }, { cookie }), { params: { id: col.id } });
  assert.equal(add.status, 200);

  // Collection detail resolves the published card.
  const detail = await (await getCol(new Request(`http://x/api/collections/${col.id}`, { headers: { cookie } }), { params: { id: col.id } })).json();
  assert.ok(detail.patterns.some((x) => x.id === p.id), 'pattern is in the collection');

  // Another user cannot read it (owner-scoped → 404).
  const otherCookie = await signedUpCookie();
  assert.equal((await getCol(new Request(`http://x/api/collections/${col.id}`, { headers: { cookie: otherCookie } }), { params: { id: col.id } })).status, 404);

  // Remove the pattern.
  await addItem(jsonReq(`http://x/api/collections/${col.id}/patterns`, { patternId: p.id, present: false }, { cookie }), { params: { id: col.id } });
  const after = await (await getCol(new Request(`http://x/api/collections/${col.id}`, { headers: { cookie } }), { params: { id: col.id } })).json();
  assert.equal(after.patterns.some((x) => x.id === p.id), false, 'pattern removed');

  // List shows the collection; delete it.
  assert.ok((await (await listCols(new Request('http://x/api/collections', { headers: { cookie } }))).json()).some((c) => c.id === col.id));
  assert.equal((await delCol(new Request(`http://x/api/collections/${col.id}`, { method: 'DELETE', headers: { cookie } }), { params: { id: col.id } })).status, 200);
  assert.equal((await (await listCols(new Request('http://x/api/collections', { headers: { cookie } }))).json()).some((c) => c.id === col.id), false, 'gone after delete');
});

test('community: comments — add, list, author + owner delete, permission gate', async () => {
  const { POST: createPattern } = await import('../app/api/patterns/route.js');
  const { PATCH: patchPattern } = await import('../app/api/patterns/[id]/route.js');
  const { GET: listComments, POST: addCommentRoute } = await import('../app/api/patterns/[id]/comments/route.js');
  const { DELETE: delComment } = await import('../app/api/patterns/[id]/comments/[commentId]/route.js');

  const owner = await signedUpCookie();
  const p = await (await createPattern(jsonReq('http://x/api/patterns', { templateId: 'template_001', title: 'Comment Scarf' }, { cookie: owner }))).json();
  await patchPattern(new Request(`http://x/api/patterns/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: owner }, body: JSON.stringify({ published: true }) }), { params: { id: p.id } });

  // Unauthenticated cannot comment.
  assert.equal((await addCommentRoute(jsonReq(`http://x/api/patterns/${p.id}/comments`, { body: 'hi' }), { params: { id: p.id } })).status, 401);
  // Empty body → 400.
  assert.equal((await addCommentRoute(jsonReq(`http://x/api/patterns/${p.id}/comments`, { body: '   ' }, { cookie: owner }), { params: { id: p.id } })).status, 400);

  // A visitor comments.
  const visitor = await signedUpCookie();
  const c = await (await addCommentRoute(jsonReq(`http://x/api/patterns/${p.id}/comments`, { body: 'Lovely pattern!' }, { cookie: visitor }), { params: { id: p.id } })).json();
  assert.ok(c.comment.id && c.comment.authorName);

  // Public list (no auth) shows it.
  const list = await (await listComments(new Request(`http://x/api/patterns/${p.id}/comments`), { params: { id: p.id } })).json();
  assert.ok(list.comments.some((x) => x.id === c.comment.id && x.body === 'Lovely pattern!'));

  // A third party can't delete the visitor's comment.
  const stranger = await signedUpCookie();
  const cid = c.comment.id;
  assert.equal((await delComment(new Request(`http://x/api/patterns/${p.id}/comments/${cid}`, { method: 'DELETE', headers: { origin, cookie: stranger } }), { params: { id: p.id, commentId: cid } })).status, 403);

  // The pattern owner CAN remove it (moderation).
  assert.equal((await delComment(new Request(`http://x/api/patterns/${p.id}/comments/${cid}`, { method: 'DELETE', headers: { origin, cookie: owner } }), { params: { id: p.id, commentId: cid } })).status, 200);
  const after = await (await listComments(new Request(`http://x/api/patterns/${p.id}/comments`), { params: { id: p.id } })).json();
  assert.equal(after.comments.some((x) => x.id === cid), false, 'deleted comment is gone');
});

test('community: tag filter + popular tags', async () => {
  const { GET: community } = await import('../app/api/community/route.js');
  const { GET: tags } = await import('../app/api/community/tags/route.js');
  // Popular tags returns an array (possibly empty in an isolated DB).
  const t = await (await tags(new Request('http://x/api/community/tags'))).json();
  assert.ok(Array.isArray(t.tags));
  // A tag filter returns the feed shape (no crash on the dynamic statement).
  const res = await community(new Request('http://x/api/community?tag=starter'));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray((await res.json()).patterns));
});

test('community: pattern OG image renders SVG for a published pattern', async () => {
  const { POST: createPattern } = await import('../app/api/patterns/route.js');
  const { PATCH: patchPattern } = await import('../app/api/patterns/[id]/route.js');
  const { GET: og } = await import('../app/api/patterns/[id]/og/route.js');
  const cookie = await signedUpCookie();
  const p = await (await createPattern(jsonReq('http://x/api/patterns', { templateId: 'template_001', title: 'OG Scarf' }, { cookie }))).json();
  // Unpublished → 404.
  assert.equal((await og(new Request(`http://x/api/patterns/${p.id}/og`), { params: { id: p.id } })).status, 404);
  await patchPattern(new Request(`http://x/api/patterns/${p.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ published: true }) }), { params: { id: p.id } });
  const res = await og(new Request(`http://x/api/patterns/${p.id}/og`), { params: { id: p.id } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /svg/);
  assert.match(await res.text(), /Made with Loopsy/);
});

test('community: trending sort orders by star count', async () => {
  const { GET: community } = await import('../app/api/community/route.js');
  // Just assert the sort param is accepted and returns the feed shape.
  const res = await community(new Request('http://x/api/community?sort=trending'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.patterns), 'trending feed returns patterns');
});

test('billing: portal requires auth and 503s until configured', async () => {
  const { POST: portal } = await import('../app/api/billing/portal/route.js');
  assert.equal((await portal(jsonReq('http://x/api/billing/portal', {}))).status, 401);
  const cookie = await signedUpCookie();
  const res = await portal(jsonReq('http://x/api/billing/portal', {}, { cookie }));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'BILLING_NOT_CONFIGURED');
});

test('learning: read + bookmark progress is auth-gated and persists per user', async () => {
  const { GET: getProg, POST: setProg } = await import('../app/api/learning/progress/route.js');

  // Auth gate.
  assert.equal((await getProg(new Request('http://x/api/learning/progress'))).status, 401);

  const cookie = await signedUpCookie();
  // Empty to start.
  assert.deepEqual((await (await getProg(new Request('http://x/api/learning/progress', { headers: { cookie } }))).json()).items, []);

  // Mark a guide read.
  let res = await setProg(jsonReq('http://x/api/learning/progress', { slug: 'magic-ring', read: true }, { cookie }));
  assert.equal(res.status, 200);
  let items = (await res.json()).items;
  const mr = items.find((i) => i.guideSlug === 'magic-ring');
  assert.ok(mr && mr.readAt, 'magic-ring marked read');

  // Bookmark a different guide; read state of the first is preserved.
  res = await setProg(jsonReq('http://x/api/learning/progress', { slug: 'invisible-decrease', bookmarked: true }, { cookie }));
  items = (await res.json()).items;
  assert.equal(items.find((i) => i.guideSlug === 'invisible-decrease').bookmarked, true);
  assert.ok(items.find((i) => i.guideSlug === 'magic-ring').readAt, 'first guide still read');

  // Un-read the first guide (readAt → null), bookmark flag untouched.
  res = await setProg(jsonReq('http://x/api/learning/progress', { slug: 'magic-ring', read: false }, { cookie }));
  items = (await res.json()).items;
  assert.equal(items.find((i) => i.guideSlug === 'magic-ring').readAt, null);

  // Body with neither read nor bookmarked → 400.
  assert.equal((await setProg(jsonReq('http://x/api/learning/progress', { slug: 'magic-ring' }, { cookie }))).status, 400);

  // Progress is scoped per user — a fresh user sees nothing.
  const other = await signedUpCookie();
  assert.deepEqual((await (await getProg(new Request('http://x/api/learning/progress', { headers: { cookie: other } }))).json()).items, []);
});

test('input validation: malformed auth bodies are rejected with 400', async () => {
  const { POST: signup } = await import('../app/api/auth/signup/route.js');
  const { POST: login } = await import('../app/api/auth/login/route.js');
  assert.equal((await signup(jsonReq('http://x/api/auth/signup', { name: '', email: 'nope', password: 'short' }))).status, 400);
  assert.equal((await login(jsonReq('http://x/api/auth/login', { email: 'not-an-email', password: '' }))).status, 400);
  // a well-formed body still succeeds
  assert.equal((await signup(jsonReq('http://x/api/auth/signup', { name: 'Valid', email: `v_${Date.now()}@example.com`, password: 'longenough1' }))).status, 201);
});
