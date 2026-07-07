import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest } from "@/lib/auth/request";
import { getPublicPatternById } from "@/lib/models/patternModel";
import { addComment, getComments } from "@/lib/models/commentModel";
import { createNotification } from "@/lib/models/notificationModel";
import { validate, readJsonBody } from "@/lib/validation";
import { commentSchema } from "@/lib/validation/schemas";

/** GET /api/patterns/:id/comments — public comments on a published pattern. */
export async function GET(_request, { params }) {
  try {
    const pattern = await getPublicPatternById(params.id);
    if (!pattern) return NextResponse.json({ error: "Pattern not found." }, { status: 404 });
    const comments = await getComments(params.id);
    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load comments.", details: error.message }, { status: 500 });
  }
}

/** POST /api/patterns/:id/comments — add a comment (auth; pattern must be published). */
export async function POST(request, { params }) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const pattern = await getPublicPatternById(params.id);
    if (!pattern) return NextResponse.json({ error: "Pattern not found." }, { status: 404 });

    const { data, response: invalid } = validate(commentSchema, await readJsonBody(request));
    if (invalid) return invalid;

    const created = await addComment(params.id, user.id, data.body);
    // Fire-and-forget: a notification failure must never fail the comment.
    createNotification({
      userId: pattern.userId,
      actorId: user.id,
      type: "comment",
      resourceType: "pattern",
      resourceId: params.id,
      message: `${user.name} commented on “${pattern.title}”.`,
    }).catch(() => {});
    // Return it in the same shape the list endpoint uses, so the UI can append.
    return NextResponse.json({
      comment: { ...created, authorName: user.name, authorHandle: user.handle },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add comment.", details: error.message }, { status: 500 });
  }
}
