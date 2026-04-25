import { NextResponse } from "next/server";
import { destroySessionForRequest, clearSessionCookie } from "@/lib/auth/session";

export async function POST(request) {
  try {
    destroySessionForRequest(request);
    const response = NextResponse.json({ ok: true }, { status: 200 });
    return clearSessionCookie(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to sign out.", details: error.message },
      { status: 500 }
    );
  }
}
