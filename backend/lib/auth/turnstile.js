// Cloudflare Turnstile verification — bot protection on signup, magic-link
// and forgot-password. Dormant until TURNSTILE_SECRET_KEY is set: without it
// every request passes, so dev and self-hosters need no setup. The matching
// TURNSTILE_SITE_KEY is served to the SPA via /api/auth/providers.

const logger = require('../logger');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Check a widget token. Fail-closed when configured (an unverifiable token is
 * rejected); pass-through when not configured.
 * @returns {Promise<boolean>}
 */
async function verifyTurnstile(token, ip = null, fetchImpl = fetch) {
  if (!turnstileEnabled()) return true;
  if (!token || typeof token !== 'string') return false;
  try {
    const res = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (error) {
    logger.error('turnstile.verify_failed', { error: error.message });
    return false;
  }
}

module.exports = { turnstileEnabled, verifyTurnstile };
