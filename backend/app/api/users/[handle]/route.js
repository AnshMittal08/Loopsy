import { NextResponse } from "next/server";
import { getUserByHandle } from "@/lib/models/userModel";
import { getPublishedPatternsByUser } from "@/lib/models/patternModel";

/**
 * GET /api/users/:handle
 * Public creator profile: their published patterns + aggregate stats.
 * No auth required; only published patterns and non-private fields are exposed.
 */
export async function GET(_request, { params }) {
  try {
    const creator = await getUserByHandle(params.handle);
    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    const patterns = await getPublishedPatternsByUser(creator.id, { limit: 48, offset: 0 });
    const totalStars = patterns.reduce((sum, p) => sum + (p.starCount || 0), 0);

    return NextResponse.json({
      creator: { name: creator.name, handle: creator.handle, bio: creator.bio ?? null, createdAt: creator.createdAt },
      patterns,
      stats: { published: patterns.length, totalStars },
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load profile.", details: error.message }, { status: 500 });
  }
}
