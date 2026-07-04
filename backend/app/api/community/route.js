import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getCommunityFeed, getUserStarredIds } from "@/lib/models/patternModel";
import { getAllTemplates } from "@/lib/models/templateModel";

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
    const sort = searchParams.get("sort") === "trending" ? "trending" : "recent";
    const tag = (searchParams.get("tag") || "").trim() || null;

    const [patterns, starredIds] = await Promise.all([
      getCommunityFeed({ limit, offset, sort, tag }),
      (async () => {
        const user = await getAuthenticatedUser(request);
        return user ? getUserStarredIds(user.id) : [];
      })(),
    ]);

    // Cold-start seeding: the feed must never look empty. On the first page of
    // the untagged feed, include a slice of the verified catalog so day-one
    // visitors always land on real, makeable content (clearly labeled).
    let catalog = [];
    if (offset === 0 && !tag) {
      const templates = await getAllTemplates();
      catalog = templates
        .filter((t) => t.verified)
        .slice(0, 8)
        .map((t) => ({
          id: t.id,
          title: t.name,
          difficulty: t.difficulty,
          category: t.category,
          tags: t.tags,
          verified: t.verified,
          imageUrl: t.imageUrl ?? null,
          isTemplate: true,
        }));
    }

    return NextResponse.json({ patterns, starredIds, catalog }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load community feed.", details: error.message }, { status: 500 });
  }
}
