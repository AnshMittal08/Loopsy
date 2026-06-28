import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest, clientIp } from "@/lib/auth/request";
import { getPublicPatternById } from "@/lib/models/patternModel";
import { getCommentById, deleteComment } from "@/lib/models/commentModel";
import { recordAudit } from "@/lib/models/auditModel";

/**
 * DELETE /api/patterns/:id/comments/:commentId
 * The comment's author OR the pattern's owner may remove it (soft delete).
 */
export async function DELETE(request, { params }) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const comment = await getCommentById(params.commentId);
    if (!comment || comment.patternId !== params.id) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    const pattern = await getPublicPatternById(params.id);
    const isAuthor = comment.userId === user.id;
    const isOwner = pattern && pattern.userId === user.id;
    if (!isAuthor && !isOwner) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    await deleteComment(params.commentId);
    await recordAudit({
      actorId: user.id, action: "comment.delete", resource: "comment", resourceId: params.commentId,
      meta: { patternId: params.id, as: isAuthor ? "author" : "owner" }, ip: clientIp(request),
    });
    return NextResponse.json({ deleted: true, id: params.commentId }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete comment.", details: error.message }, { status: 500 });
  }
}
