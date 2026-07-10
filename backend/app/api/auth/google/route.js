import { NextResponse } from "next/server";
import { googleEnabled, buildAuthRedirect, setStateCookie } from "@/lib/auth/oauth";
import { appOrigin } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

/** GET /api/auth/google — kick off the Google consent flow. */
export async function GET() {
  if (!googleEnabled()) {
    return NextResponse.redirect(`${appOrigin()}/account?oauth=unavailable`, 302);
  }
  const { url, state } = buildAuthRedirect();
  const response = NextResponse.redirect(url, 302);
  return setStateCookie(response, state);
}
