import { NextResponse } from "next/server";
import { generateId } from "@/lib/utils/helpers";
import { createUser, getUserByEmail } from "@/lib/models/userModel";
import { hashPassword, createUserSession, setSessionCookie } from "@/lib/auth/session";
import { clientIp, isCrossSiteRequest, appOrigin } from "@/lib/auth/request";
import { peek, hit } from "@/lib/models/rateLimitModel";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { createEmailToken } from "@/lib/models/emailTokenModel";
import { sendEmail } from "@/lib/email/mailer";
import { validate, readJsonBody } from "@/lib/validation";
import { signupSchema } from "@/lib/validation/schemas";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SIGNUPS_PER_IP = 10; // throttle mass account creation

export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const ip = clientIp(request);
    const signupBucket = `signup:ip:${ip}`;
    if (await peek(signupBucket, SIGNUP_WINDOW_MS) >= MAX_SIGNUPS_PER_IP) {
      return NextResponse.json(
        { error: "Too many accounts created from here. Please try again later." },
        { status: 429 }
      );
    }

    const rawBody = await readJsonBody(request);
    if (!(await verifyTurnstile(rawBody?.turnstileToken, ip))) {
      return NextResponse.json({ error: "Verification failed — please retry the challenge." }, { status: 403 });
    }

    const { data, response: invalid } = validate(signupSchema, rawBody);
    if (invalid) return invalid;
    const { email, name, password } = data;

    if (await getUserByEmail(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const timestamp = new Date().toISOString();
    const user = await createUser({
      id: generateId(),
      email,
      name,
      passwordHash: hashPassword(password),
      createdAt: timestamp,
      subscription: {
        id: generateId(),
        plan: "free",
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp
      }
    });

    await hit(signupBucket, SIGNUP_WINDOW_MS);

    // Fire a verification email (non-blocking on failure — the account is usable).
    try {
      const token = await createEmailToken({ userId: user.id, type: "verify", ttlMs: VERIFY_TTL_MS });
      const link = `${appOrigin()}/verify-email?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Verify your Loopsy email",
        text: `Welcome to Loopsy! Confirm your email (valid 24h): ${link}`,
        html: `<p>Welcome to Loopsy!</p><p><a href="${link}">Verify your email</a> (valid for 24 hours).</p>`,
      });
    } catch { /* verification email is best-effort */ }

    const session = await createUserSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    return setSessionCookie(response, session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account.", details: error.message },
      { status: 500 }
    );
  }
}
