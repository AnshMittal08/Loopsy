import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/session";
import { getUserWithSubscriptionById, updateUserProfile } from "@/lib/models/userModel";
import { validate, readJsonBody } from "@/lib/validation";
import { updateProfileSchema } from "@/lib/validation/schemas";

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

/**
 * PATCH /api/me — update the signed-in user's profile (name, skill level).
 */
export async function PATCH(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const { data, response: invalid } = validate(updateProfileSchema, await readJsonBody(request));
    if (invalid) return invalid;

    await updateUserProfile(user.id, { name: data.name, skillLevel: data.skillLevel ?? user.skillLevel ?? "beginner" });
    const updated = await getUserWithSubscriptionById(user.id);
    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile.", details: error.message }, { status: 500 });
  }
}
