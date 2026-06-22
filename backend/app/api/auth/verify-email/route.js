import { NextResponse } from "next/server";
import { consumeEmailToken } from "@/lib/models/emailTokenModel";
import { markEmailVerified } from "@/lib/models/userModel";
import { recordAudit } from "@/lib/models/auditModel";
import { clientIp, isCrossSiteRequest } from "@/lib/auth/request";
import { validate, readJsonBody } from "@/lib/validation";
import { verifyEmailSchema } from "@/lib/validation/schemas";

export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const { data, response: invalid } = validate(verifyEmailSchema, await readJsonBody(request));
    if (invalid) return invalid;
    const result = await consumeEmailToken(data.token, "verify");
    if (!result) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    await markEmailVerified(result.userId);
    await recordAudit({
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
