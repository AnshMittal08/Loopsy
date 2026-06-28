import { NextResponse } from "next/server";
import { getPopularTags } from "@/lib/models/patternModel";

/** GET /api/community/tags — most-used tags across published patterns. */
export async function GET(request) {
  try {
    const limit = Math.min(40, Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 20)));
    const tags = await getPopularTags(limit);
    return NextResponse.json({ tags }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load tags.", details: error.message }, { status: 500 });
  }
}
