import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    return NextResponse.json({ user: user ?? null }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch session.", details: error.message },
      { status: 500 }
    );
  }
}
