import { NextResponse } from "next/server";
import { setUserPassword } from "@/lib/models/userModel";
import { consumeEmailToken } from "@/lib/models/emailTokenModel";
import { hashPassword } from "@/lib/auth/session";
import { recordAudit } from "@/lib/models/auditModel";
import { clientIp, isCrossSiteRequest } from "@/lib/auth/request";
import { peek, hit } from "@/lib/models/rateLimitModel";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 10;

export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const ip = clientIp(request);
    const bucket = `reset:ip:${ip}`;
    if (await peek(bucket, WINDOW_MS) >= MAX_PER_IP) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }
    await hit(bucket, WINDOW_MS);

    const body = await request.json();
    const token = body.token;
    const password = body.password ?? "";

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const result = await consumeEmailToken(token, "reset");
    if (!result) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    await setUserPassword(result.userId, hashPassword(password));
    await recordAudit({
      actorId: result.userId,
      action: "auth.password_reset",
      resource: "user",
      resourceId: result.userId,
      ip,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reset password.", details: error.message }, { status: 500 });
  }
}
