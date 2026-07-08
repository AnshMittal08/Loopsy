import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/session";
import { getUserWithSubscriptionById, updateUserProfile, assignHandleIfMissing, getUserByEmail } from "@/lib/models/userModel";
import { verifyPassword, clearSessionCookie } from "@/lib/auth/session";
import { deleteUserAccount } from "@/lib/models/accountModel";
import { validate, readJsonBody } from "@/lib/validation";
import { updateProfileSchema } from "@/lib/validation/schemas";

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    // Self-healing: users created before handles existed get one on first load.
    if (user && !user.handle) {
      user.handle = await assignHandleIfMissing(user.id, user.name);
    }
    return NextResponse.json({ user: user ?? null }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch session.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/me — update the signed-in user's profile (name, skill level).
 */
export async function PATCH(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const { data, response: invalid } = validate(updateProfileSchema, await readJsonBody(request));
    if (invalid) return invalid;

    await updateUserProfile(user.id, { name: data.name, skillLevel: data.skillLevel ?? user.skillLevel ?? "beginner", bio: data.bio ?? user.bio ?? null });
    const updated = await getUserWithSubscriptionById(user.id);
    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile.", details: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/me — permanently delete the signed-in account and all data.
 * Requires the current password (re-auth) to guard against hijacked sessions
 * and accidental clicks. Published patterns are removed with the account.
 */
export async function DELETE(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const body = await readJsonBody(request).catch(() => ({}));
    const password = body?.password;
    const record = await getUserByEmail(user.email);
    if (!record || !password || !verifyPassword(password, record.passwordHash)) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 403 });
    }

    await deleteUserAccount(user.id);
    const res = NextResponse.json({ ok: true }, { status: 200 });
    clearSessionCookie(res);
    return res;
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete account.", details: error.message }, { status: 500 });
  }
}
