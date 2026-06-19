import logger from "../logger.js";

// Request-level security helpers: client IP extraction and a defense-in-depth
// CSRF/origin check that complements the SameSite=Lax session cookie.

/** Best-effort client IP from proxy headers (Railway/Vercel set x-forwarded-for). */
export function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Normalise any URL-ish string to a bare origin ("https://host[:port]"),
// lower-cased and stripped of path/trailing slash. Returns null if unparseable.
function toOrigin(value) {
  try {
    return new URL(String(value).trim()).origin.toLowerCase();
  } catch {
    return null;
  }
}

/** The canonical app origin, used to build email links. */
export function appOrigin() {
  const first = (process.env.FRONTEND_URL || "").split(",")[0];
  return toOrigin(first) || "http://localhost:5173";
}

/**
 * First-party origins. FRONTEND_URL may be a comma-separated list. Localhost is
 * added outside production. All entries are normalised so a trailing slash or
 * casing mismatch can't cause a false block.
 */
export function allowedOrigins() {
  const list = [];
  for (const part of (process.env.FRONTEND_URL || "").split(",")) {
    const o = toOrigin(part);
    if (o) list.push(o);
  }
  if (process.env.NODE_ENV !== "production") {
    list.push("http://localhost:5173", "http://localhost:3000");
  }
  return list;
}

// Host suffixes that are always accepted — covers ephemeral preview deploys.
// Set explicitly via ALLOWED_ORIGIN_SUFFIXES (comma-separated, e.g. ".vercel.app"),
// and auto-included when a configured origin is itself on *.vercel.app so Vercel
// preview URLs work without extra config.
function allowedSuffixes() {
  const suffixes = new Set();
  for (const raw of (process.env.ALLOWED_ORIGIN_SUFFIXES || "").split(",")) {
    const s = raw.trim().toLowerCase();
    if (s) suffixes.add(s.startsWith(".") ? s : `.${s}`);
  }
  for (const origin of allowedOrigins()) {
    try {
      if (new URL(origin).host.endsWith(".vercel.app")) suffixes.add(".vercel.app");
    } catch { /* ignore */ }
  }
  return [...suffixes];
}

function originAllowed(value) {
  const origin = toOrigin(value);
  if (!origin) return false;
  if (allowedOrigins().includes(origin)) return true;
  let host;
  try { host = new URL(origin).host; } catch { return false; }
  return allowedSuffixes().some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
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
  if (allowedOrigins().length === 0) return false; // cannot determine — do not block

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin || referer;
  if (!candidate) return false; // no Origin/Referer — rely on SameSite=Lax

  if (originAllowed(candidate)) return false;

  // Surface the mismatch in logs so a misconfigured FRONTEND_URL is obvious.
  logger.warn("auth.cross_site_blocked", {
    origin: origin || null,
    referer: referer || null,
    allowed: allowedOrigins(),
  });
  return true;
}
