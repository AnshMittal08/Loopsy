import { NextResponse } from "next/server";
import { getPatternById, deletePattern, setPatternPublished } from "@/lib/models/patternModel";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { clientIp } from "@/lib/auth/request";

/**
 * GET /api/patterns/:id
 * Returns full details of a single pattern.
 */
export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const pattern = await getPatternById(params.id, user.id);

    if (!pattern) {
      return NextResponse.json(
        { error: `Pattern with id "${params.id}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(pattern, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pattern.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/patterns/:id
 * Deletes a pattern and its associated progress records.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const pattern = await getPatternById(params.id, user.id);

    if (!pattern) {
      return NextResponse.json(
        { error: `Pattern with id "${params.id}" not found.` },
        { status: 404 }
      );
    }

    await deletePattern(params.id, user.id, { ip: clientIp(request) });
    return NextResponse.json({ deleted: true, id: params.id }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete pattern.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/patterns/:id
 * Toggle publish state. Body: { published: boolean }
 */
export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    if (typeof body.published !== "boolean") {
      return NextResponse.json({ error: "published (boolean) is required." }, { status: 400 });
    }

    const changed = await setPatternPublished(params.id, user.id, body.published);
    if (!changed) {
      return NextResponse.json({ error: "Pattern not found." }, { status: 404 });
    }
    return NextResponse.json({ published: body.published }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update pattern.", details: error.message }, { status: 500 });
  }
}
