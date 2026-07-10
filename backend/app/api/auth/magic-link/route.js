import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/models/userModel";
import { createEmailToken } from "@/lib/models/emailTokenModel";
import { sendEmail } from "@/lib/email/mailer";
import { clientIp, isCrossSiteRequest, appOrigin } from "@/lib/auth/request";
import { peek, hit } from "@/lib/models/rateLimitModel";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { readJsonBody } from "@/lib/validation";

const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 60 * 60 * 1000;    // 1 hour
const MAX_PER_IP = 10;
const MAX_PER_EMAIL = 4;

// The response is identical whether or not the account exists — the endpoint
// must not be an account-enumeration oracle.
const GENERIC = { ok: true, message: "If that email has an account, a sign-in link is on its way." };

/** POST /api/auth/magic-link — email a passwordless sign-in link. */
export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const body = await readJsonBody(request).catch(() => ({}));
    const email = String(body?.email || "").toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!(await verifyTurnstile(body?.turnstileToken, ip))) {
      return NextResponse.json({ error: "Verification failed — please retry the challenge." }, { status: 403 });
    }
    if (
      (await peek(`magic:ip:${ip}`, WINDOW_MS)) >= MAX_PER_IP ||
      (await peek(`magic:email:${email}`, WINDOW_MS)) >= MAX_PER_EMAIL
    ) {
      return NextResponse.json({ error: "Too many link requests. Please try again later." }, { status: 429 });
    }
    await hit(`magic:ip:${ip}`, WINDOW_MS);
    await hit(`magic:email:${email}`, WINDOW_MS);

    const user = await getUserByEmail(email);
    if (user && !user.deletedAt) {
      const token = await createEmailToken({ userId: user.id, type: "magic", ttlMs: MAGIC_TTL_MS });
      const link = `${appOrigin()}/magic-login?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Your Loopsy sign-in link",
        text: `Sign in to Loopsy (valid 15 minutes): ${link}\n\nIf you didn't request this, ignore this email.`,
        html: `<p><a href="${link}">Sign in to Loopsy</a> (valid for 15 minutes).</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    }

    return NextResponse.json(GENERIC, { status: 200 });
  } catch {
    // Same generic answer on internal failure — still no oracle.
    return NextResponse.json(GENERIC, { status: 200 });
  }
}
