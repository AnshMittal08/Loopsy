// Google OAuth 2.0 (server-side authorization-code flow, no SDK).
//
// The redirect URI is `${appOrigin()}/api/auth/google/callback` — the
// FRONTEND origin on purpose: in production the SPA's host proxies /api/* to
// the backend (vercel.json rewrite; Vite proxy in dev), so running the
// callback through it means Set-Cookie lands on the same origin the app
// reads its session from. Never point this at the Railway URL directly.
//
// Dormant until GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.

const crypto = require('crypto');
const { appOrigin } = require('./request');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const STATE_COOKIE = 'loopsy_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000;

function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return `${appOrigin()}/api/auth/google/callback`;
}

/** Build the Google consent URL + the state value to pin in a cookie. */
function buildAuthRedirect() {
  const state = crypto.randomBytes(24).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return { url: `${AUTH_URL}?${params}`, state };
}

/**
 * Exchange an authorization code for the user's verified Google profile.
 * Both calls go directly to Google over TLS, so the userinfo response is
 * trustworthy without local JWT verification.
 * @returns {Promise<{ sub, email, emailVerified, name } | null>}
 */
async function exchangeCodeForProfile(code, fetchImpl = fetch) {
  const tokenRes = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return null;
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return null;

  const infoRes = await fetchImpl(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) return null;
  const info = await infoRes.json();
  if (!info.sub) return null;

  return {
    sub: String(info.sub),
    email: info.email || null,
    emailVerified: info.email_verified === true || info.email_verified === 'true',
    name: info.name || null,
  };
}

function setStateCookie(response, state) {
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(Date.now() + STATE_TTL_MS),
  });
  return response;
}

function clearStateCookie(response) {
  response.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
  return response;
}

function readStateCookie(request) {
  return request.cookies.get(STATE_COOKIE)?.value || null;
}

module.exports = {
  googleEnabled,
  buildAuthRedirect,
  exchangeCodeForProfile,
  setStateCookie,
  clearStateCookie,
  readStateCookie,
  STATE_COOKIE,
};
