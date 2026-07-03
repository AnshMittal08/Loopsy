import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest } from "@/lib/auth/request";
import { getPublicPatternById, createPattern } from "@/lib/models/patternModel";
import { generateId } from "@/lib/utils/helpers";

/**
 * POST /api/patterns/:id/import
 * Copy a PUBLISHED community pattern into the caller's own projects so they
 * can track it. The copy is private (not published), owned by the caller, and
 * preserves the verified/experimental flags — the math is the math regardless
 * of who follows it. This is what makes "Track this in My Projects" real.
 */
export async function POST(request, { params }) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const source = await getPublicPatternById(params.id);
    if (!source) {
      return NextResponse.json({ error: "Pattern not found or not published." }, { status: 404 });
    }

    const copy = await createPattern({
      id: generateId(),
      userId: user.id,
      title: source.title,
      templateId: source.templateId ?? null,
      customization: { color: source.customization?.color ?? null, size: source.customization?.size ?? "medium" },
      steps: source.steps ?? [],
      difficulty: source.difficulty ?? null,
      category: source.category ?? null,
      tags: source.tags ?? [],
      materials: source.materials ?? [],
      hookSize: source.hookSize ?? null,
      yarnWeight: source.yarnWeight ?? null,
      timeEstimate: source.timeEstimate ?? null,
      finishedSize: source.finishedSize ?? null,
      notes: source.notes ?? [],
      promptSummary: source.authorName ? `Saved from the community — by ${source.authorName}` : "Saved from the community",
      isAIGenerated: Boolean(source.isAIGenerated),
      isFallback: false,
      verified: Boolean(source.verified),
      isExperimental: Boolean(source.isExperimental),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ pattern: copy }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Could not save this pattern to your projects.", details: error.message }, { status: 500 });
  }
}
