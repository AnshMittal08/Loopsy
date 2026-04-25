import { NextResponse } from "next/server";
import { getUserByEmail, getUserWithSubscriptionById } from "@/lib/models/userModel";
import { verifyPassword, createUserSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const userRecord = getUserByEmail(email);
    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

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
