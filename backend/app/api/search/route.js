import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { searchTemplates, searchPatterns, searchDesigns } from "@/lib/models/searchModel";

/**
 * GET /api/search?q=...
 * Searches the public template catalog, and — when signed in — the caller's
 * own patterns and designs. Returns grouped results. Auth is optional: guests
 * still get template results.
 */
export async function GET(request) {
  try {
    const q = (new URL(request.url).searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json({ query: q, templates: [], patterns: [], designs: [] });
    }

    const user = await getAuthenticatedUser(request);

    const [templates, patterns, designs] = await Promise.all([
      searchTemplates(q),
      user ? searchPatterns(user.id, q) : Promise.resolve([]),
      user ? searchDesigns(user.id, q) : Promise.resolve([]),
    ]);

    return NextResponse.json({ query: q, templates, patterns, designs });
  } catch (error) {
    return NextResponse.json({ error: "Search failed.", details: error.message }, { status: 500 });
  }
}
