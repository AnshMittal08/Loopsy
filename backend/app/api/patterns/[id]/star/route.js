import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { toggleStar } from "@/lib/models/patternModel";

/**
 * POST /api/patterns/:id/star
 * Toggle a star on a published pattern. Returns { starred, starCount }.
 */
export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    const result = await toggleStar(params.id, user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to toggle star.", details: error.message }, { status: 500 });
  }
}
