import { NextResponse } from "next/server";
import { generateId } from "@/lib/utils/helpers";
import { createUser, getUserByEmail } from "@/lib/models/userModel";
import { hashPassword, createUserSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const password = body.password ?? "";

    if (!email || !name || password.length < 8) {
      return NextResponse.json(
        { error: "Name, email, and a password with at least 8 characters are required." },
        { status: 400 }
      );
    }

    if (getUserByEmail(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const timestamp = new Date().toISOString();
    const user = createUser({
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

    const session = createUserSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    return setSessionCookie(response, session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account.", details: error.message },
      { status: 500 }
    );
  }
}
