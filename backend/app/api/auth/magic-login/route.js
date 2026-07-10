import { NextResponse } from "next/server";
import { consumeEmailToken } from "@/lib/models/emailTokenModel";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";
import { getUserWithSubscriptionById, markEmailVerified } from "@/lib/models/userModel";
import { isCrossSiteRequest, clientIp } from "@/lib/auth/request";
import { recordAudit } from "@/lib/models/auditModel";
import { readJsonBody } from "@/lib/validation";

/** POST /api/auth/magic-login — consume a sign-in link token → session. */
export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const body = await readJsonBody(request).catch(() => ({}));
    const consumed = await consumeEmailToken(String(body?.token || ""), "magic");
    if (!consumed) {
      return NextResponse.json(
        { error: "This sign-in link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const user = await getUserWithSubscriptionById(consumed.userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "This account is no longer available." }, { status: 400 });
    }

    // Clicking a link sent to the address proves control of it.
    if (!user.emailVerified) await markEmailVerified(user.id);

    recordAudit({
      actorId: user.id, action: "auth.magic_login",
      resource: "user", resourceId: user.id, ip: clientIp(request),
    }).catch(() => {});

    const session = await createUserSession(user.id);
    const response = NextResponse.json({ user }, { status: 200 });
    return setSessionCookie(response, session);
  } catch (error) {
    return NextResponse.json({ error: "Sign-in failed.", details: error.message }, { status: 500 });
  }
}
