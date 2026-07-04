import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest, clientIp } from "@/lib/auth/request";
import { fileReport, reportsInLastDay } from "@/lib/models/reportModel";
import { getPublicPatternById } from "@/lib/models/patternModel";
import { getCommentById } from "@/lib/models/commentModel";
import { recordAudit } from "@/lib/models/auditModel";
import { validate, readJsonBody } from "@/lib/validation";
import { reportSchema } from "@/lib/validation/schemas";

const MAX_REPORTS_PER_DAY = 20;

/**
 * POST /api/reports — flag a pattern or comment for review.
 * Auth required; duplicates by the same reporter are acknowledged silently;
 * a per-user daily cap blunts report-bombing.
 */
export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const { data, response: invalid } = validate(reportSchema, await readJsonBody(request));
    if (invalid) return invalid;

    if ((await reportsInLastDay(user.id)) >= MAX_REPORTS_PER_DAY) {
      return NextResponse.json({ error: "Too many reports today — thank you, we have plenty to review." }, { status: 429 });
    }

    // The flagged thing must actually exist (and be public where applicable).
    if (data.resourceType === "pattern") {
      if (!(await getPublicPatternById(data.resourceId))) {
        return NextResponse.json({ error: "Pattern not found." }, { status: 404 });
      }
    } else if (!(await getCommentById(data.resourceId))) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    const result = await fileReport({ reporterId: user.id, ...data });
    if (!result.duplicate) {
      await recordAudit({ actorId: user.id, action: "report.file", resource: data.resourceType, resourceId: data.resourceId, meta: { reason: data.reason }, ip: clientIp(request) });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Could not file the report.", details: error.message }, { status: 500 });
  }
}
