// Request-level security helpers: client IP extraction and a defense-in-depth
// CSRF/origin check that complements the SameSite=Lax session cookie.

/** Best-effort client IP from proxy headers (Railway/Vercel set x-forwarded-for). */
export function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/** The canonical app origin, used to build email links. */
export function appOrigin() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

/** Origins we trust as first-party. Localhost is added outside production. */
export function allowedOrigins() {
  const list = [];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL);
  if (process.env.NODE_ENV !== "production") {
    list.push("http://localhost:5173", "http://localhost:3000");
  }
  return list;
}

/**
 * True when a state-changing request is provably cross-site.
 *
 * Fails CLOSED for a mismatched Origin (an attacker's page sends its own
 * Origin), and fails OPEN when no allowlist can be determined (e.g. a
 * misconfigured deploy with FRONTEND_URL unset) so we never lock out a real
 * deployment — config validation surfaces that misconfiguration separately.
 * SameSite=Lax remains the primary CSRF control; this is a second layer.
 */
export function isCrossSiteRequest(request) {
  const origins = allowedOrigins();
  if (origins.length === 0) return false; // cannot determine — do not block

  const origin = request.headers.get("origin");
  if (origin) return !origins.includes(origin);

  // No Origin header (some same-origin requests omit it): fall back to Referer.
  const referer = request.headers.get("referer");
  if (referer) return !origins.some((o) => referer.startsWith(o));

  return false;
}
