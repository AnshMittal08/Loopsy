import { NextResponse } from "next/server";
import {
  googleEnabled, exchangeCodeForProfile, readStateCookie, clearStateCookie,
} from "@/lib/auth/oauth";
import { resolveOAuthUser } from "@/lib/models/authProviderModel";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";
import { appOrigin } from "@/lib/auth/request";
import { recordAudit } from "@/lib/models/auditModel";
import { clientIp } from "@/lib/auth/request";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

const fail = (reason) =>
  clearStateCookie(NextResponse.redirect(`${appOrigin()}/account?oauth=${reason}`, 302));

/** GET /api/auth/google/callback — Google redirects here with ?code&state. */
export async function GET(request) {
  try {
    if (!googleEnabled()) return fail("unavailable");

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const pinned = readStateCookie(request);
    // The state cookie pins the flow to the browser that started it (CSRF /
    // login-fixation guard). Any mismatch aborts.
    if (!code || !state || !pinned || state !== pinned) return fail("failed");

    const profile = await exchangeCodeForProfile(code);
    if (!profile) return fail("failed");

    const { user, created, conflict } = await resolveOAuthUser({
      provider: "google",
      providerUserId: profile.sub,
      email: profile.email,
      emailVerified: profile.emailVerified,
      name: profile.name,
    });
    if (conflict === "unverified_email") return fail("email_conflict");
    if (!user) return fail("failed");

    recordAudit({
      actorId: user.id,
      action: created ? "auth.oauth_signup" : "auth.oauth_login",
      resource: "user", resourceId: user.id,
      meta: JSON.stringify({ provider: "google" }),
      ip: clientIp(request),
    }).catch?.(() => {});

    const session = await createUserSession(user.id);
    const response = NextResponse.redirect(
      `${appOrigin()}${created ? "/account?welcome=1" : "/"}`, 302
    );
    setSessionCookie(response, session);
    return clearStateCookie(response);
  } catch (error) {
    logger.error("auth.google_callback_failed", { error: error.message });
    return fail("failed");
  }
}
