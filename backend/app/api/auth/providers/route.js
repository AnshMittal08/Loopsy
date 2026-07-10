import { NextResponse } from "next/server";
import { googleEnabled } from "@/lib/auth/oauth";
import { turnstileEnabled } from "@/lib/auth/turnstile";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/providers — which optional auth features are live, so the
 * SPA renders exactly the buttons/widgets this deployment supports.
 * Public + cacheable; exposes only the PUBLIC Turnstile site key.
 */
export async function GET() {
  return NextResponse.json(
    {
      google: googleEnabled(),
      magicLink: true,
      turnstileSiteKey: turnstileEnabled() ? (process.env.TURNSTILE_SITE_KEY || null) : null,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
