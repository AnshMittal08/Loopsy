import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { appOrigin } from "@/lib/auth/request";
import { peek, hit } from "@/lib/models/rateLimitModel";
import { createEmailToken } from "@/lib/models/emailTokenModel";
import { sendEmail } from "@/lib/email/mailer";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_USER = 3;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/auth/resend-verification — re-send the email-verification link to
 * the signed-in user. No-op if already verified. Throttled per user.
 */
export async function POST(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const bucket = `resend:${user.id}`;
    if (await peek(bucket, WINDOW_MS) >= MAX_PER_USER) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a while before trying again." },
        { status: 429 }
      );
    }
    await hit(bucket, WINDOW_MS);

    const token = await createEmailToken({ userId: user.id, type: "verify", ttlMs: VERIFY_TTL_MS });
    const link = `${appOrigin()}/verify-email?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Verify your Loopsy email",
      text: `Confirm your email (valid 24h): ${link}`,
      html: `<p><a href="${link}">Verify your email</a> (valid for 24 hours).</p>`,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to resend verification.", details: error.message }, { status: 500 });
  }
}
