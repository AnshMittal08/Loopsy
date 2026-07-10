import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/models/userModel";
import { createEmailToken } from "@/lib/models/emailTokenModel";
import { sendEmail } from "@/lib/email/mailer";
import { clientIp, isCrossSiteRequest, appOrigin } from "@/lib/auth/request";
import { peek, hit } from "@/lib/models/rateLimitModel";
import { verifyTurnstile } from "@/lib/auth/turnstile";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const ip = clientIp(request);
    const bucket = `forgot:ip:${ip}`;
    if (await peek(bucket, WINDOW_MS) >= MAX_PER_IP) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }
    await hit(bucket, WINDOW_MS);

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!(await verifyTurnstile(body?.turnstileToken, ip))) {
      return NextResponse.json({ error: "Verification failed — please retry the challenge." }, { status: 403 });
    }

    if (email) {
      const userRecord = await getUserByEmail(email);
      if (userRecord) {
        const token = await createEmailToken({ userId: userRecord.id, type: "reset", ttlMs: RESET_TTL_MS });
        const link = `${appOrigin()}/reset-password?token=${token}`;
        await sendEmail({
          to: email,
          subject: "Reset your Loopsy password",
          text: `Reset your password using this link (valid for 1 hour): ${link}`,
          html: `<p>We received a request to reset your Loopsy password.</p>
                 <p><a href="${link}">Reset your password</a> (valid for 1 hour).</p>
                 <p>If you didn't request this, you can safely ignore this email.</p>`,
        });
      }
    }

    // Always generic — never reveal whether the email is registered.
    return NextResponse.json(
      { ok: true, message: "If that email has an account, a reset link is on its way." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request.", details: error.message }, { status: 500 });
  }
}
