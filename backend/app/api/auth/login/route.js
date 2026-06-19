import { NextResponse } from "next/server";
import { getUserByEmail, getUserWithSubscriptionById } from "@/lib/models/userModel";
import { verifyPassword, createUserSession, setSessionCookie } from "@/lib/auth/session";
import { clientIp, isCrossSiteRequest } from "@/lib/auth/request";
import { peek, hit, clear } from "@/lib/models/rateLimitModel";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_ACCOUNT = 5; // failed attempts per (ip, email)
const MAX_PER_IP = 20; // failed attempts per ip (shared-NAT tolerant)

export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const ip = clientIp(request);
    const ipBucket = `login:ip:${ip}`;
    const acctBucket = `login:acct:${ip}:${email}`;

    if (peek(ipBucket, WINDOW_MS) >= MAX_PER_IP || peek(acctBucket, WINDOW_MS) >= MAX_PER_ACCOUNT) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    const userRecord = getUserByEmail(email);
    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      hit(ipBucket, WINDOW_MS);
      hit(acctBucket, WINDOW_MS);
      // Identical message + status whether or not the account exists (no enumeration).
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    clear(acctBucket); // a real sign-in resets that account's counter

    const user = getUserWithSubscriptionById(userRecord.id);
    const session = createUserSession(user.id);
    const response = NextResponse.json({ user }, { status: 200 });
    return setSessionCookie(response, session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to sign in.", details: error.message },
      { status: 500 }
    );
  }
}
