import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { toggleStar, getPublicPatternById } from "@/lib/models/patternModel";
import { createNotification } from "@/lib/models/notificationModel";

/**
 * POST /api/patterns/:id/star
 * Toggle a star on a published pattern. Returns { starred, starCount }.
 */
export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    const result = await toggleStar(params.id, user.id);
    if (result.starred) {
      // Fire-and-forget: a notification failure must never fail the star.
      getPublicPatternById(params.id)
        .then((p) => p && createNotification({
          userId: p.userId,
          actorId: user.id,
          type: "star",
          resourceType: "pattern",
          resourceId: params.id,
          message: `${user.name} starred your pattern “${p.title}”.`,
        }))
        .catch(() => {});
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to toggle star.", details: error.message }, { status: 500 });
  }
}
