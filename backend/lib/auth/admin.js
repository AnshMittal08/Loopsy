// Admin gate — env-driven allowlist, no schema change.
//
// ADMIN_EMAILS is a comma-separated list of account emails (case-insensitive).
// Unset ⇒ no admins ⇒ every admin route 404s, so the surface is invisible
// unless explicitly configured. 404 (not 403) on purpose: non-admins get no
// confirmation that an admin surface exists.

const { NextResponse } = require('next/server');
const { requireAuthenticatedUser } = require('./session');

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdminUser(request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response) return { user: null, response };
  if (!adminEmails().includes(String(user.email || '').toLowerCase())) {
    return { user: null, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { user, response: null };
}

module.exports = { requireAdminUser, adminEmails };
