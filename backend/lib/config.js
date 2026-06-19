// Boot-time configuration validation. Fails LOUD (not fatal) so a
// misconfigured production deploy is obvious in logs without crashing every
// route. Skipped during `next build` (envs are typically injected at runtime).

const REQUIRED_IN_PROD = [
  ["FRONTEND_URL", "CORS and the CSRF origin-check fail closed / cannot pin an origin without it."],
];

const RECOMMENDED = [
  ["ANTHROPIC_API_KEY", "AI generation falls back to local Ollama when unset."],
];

let validated = false;

function validateConfig() {
  if (validated) return;
  validated = true;

  // Don't shout during the build phase — runtime env may differ.
  if ((process.env.NEXT_PHASE || "").includes("build")) return;

  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    for (const [key, why] of REQUIRED_IN_PROD) {
      if (!process.env[key]) {
        console.error(`[config] Missing required env ${key} in production — ${why}`);
      }
    }
  }

  for (const [key, why] of RECOMMENDED) {
    if (!process.env[key]) {
      console.warn(`[config] Recommended env ${key} is not set — ${why}`);
    }
  }
}

module.exports = { validateConfig };
