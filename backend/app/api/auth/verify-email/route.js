import { NextResponse } from "next/server";
import { consumeEmailToken } from "@/lib/models/emailTokenModel";
import { markEmailVerified } from "@/lib/models/userModel";
import { recordAudit } from "@/lib/models/auditModel";
import { clientIp, isCrossSiteRequest } from "@/lib/auth/request";

export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const { token } = await request.json();
    const result = consumeEmailToken(token, "verify");
    if (!result) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    markEmailVerified(result.userId);
    recordAudit({
      actorId: result.userId,
      action: "auth.email_verified",
      resource: "user",
      resourceId: result.userId,
      ip: clientIp(request),
    });

    return NextResponse.json({ verified: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to verify email.", details: error.message }, { status: 500 });
  }
}
