import { NextResponse } from "next/server";
import { getProgressByPatternId } from "@/lib/models/progressModel";
import { requireAuthenticatedUser } from "@/lib/auth/session";

/**
 * GET /api/progress/pattern/:patternId
 * Returns all progress records for a given pattern.
 */
export async function GET(request, { params }) {
  try {
    const { user, response } = requireAuthenticatedUser(request);
    if (response) return response;

    const records = getProgressByPatternId(params.patternId, user.id);

    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch progress.", details: error.message },
      { status: 500 }
    );
  }
}
