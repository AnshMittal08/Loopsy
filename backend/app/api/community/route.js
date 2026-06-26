import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getCommunityFeed, getUserStarredIds } from "@/lib/models/patternModel";

/**
 * GET /api/community?limit=24&offset=0
 * Returns the paginated public pattern feed. Includes the caller's starred set
 * so the UI can hydrate star buttons in one round-trip.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(48, Math.max(1, Number(searchParams.get("limit") || 24)));
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));

    const [patterns, starredIds] = await Promise.all([
      getCommunityFeed({ limit, offset }),
      (async () => {
        const user = await getAuthenticatedUser(request);
        return user ? getUserStarredIds(user.id) : [];
      })(),
    ]);

    return NextResponse.json({ patterns, starredIds }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load community feed.", details: error.message }, { status: 500 });
  }
}
