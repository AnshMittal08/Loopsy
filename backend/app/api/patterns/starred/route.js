import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getUserStarredIds, getPublicCardsByIds } from "@/lib/models/patternModel";

/**
 * GET /api/patterns/starred — the caller's starred patterns as feed cards.
 * Gives the star action a destination (Library → Starred). Unpublished or
 * deleted patterns silently drop out (getPublicCardsByIds filters them).
 */
export async function GET(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    const ids = await getUserStarredIds(user.id);
    const patterns = await getPublicCardsByIds(ids);
    return NextResponse.json({ patterns }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load starred patterns.", details: error.message }, { status: 500 });
  }
}
