import { NextResponse } from "next/server";
import { getDesignById, linkPattern, updateDesign, deleteDesign } from "@/lib/models/designModel";
import { isCrossSiteRequest, clientIp } from "@/lib/auth/request";
import { recordAudit } from "@/lib/models/auditModel";
import { validate, readJsonBody } from "@/lib/validation";
import { createDesignSchema } from "@/lib/validation/schemas";
import { requireAuthenticatedUser } from "@/lib/auth/session";

// Public read of a design (for shareable /d/:id pages in a later M4 step).
export async function GET(_request, { params }) {
  try {
    const design = await getDesignById(params.id);
    if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    return NextResponse.json(design);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load design.", details: error.message }, { status: 500 });
  }
}

// Link a compiled pattern to a design (owner only).
export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const design = await getDesignById(params.id);
    if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    if (design.userId !== user.id) return NextResponse.json({ error: "Not your design." }, { status: 403 });

    const { patternId } = await request.json();
    if (!patternId) return NextResponse.json({ error: "patternId is required." }, { status: 400 });

    await linkPattern(params.id, patternId);
    return NextResponse.json(await getDesignById(params.id));
  } catch (error) {
    return NextResponse.json({ error: "Failed to update design.", details: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/designs/:id — save a design in place (name + spec, owner only).
 * This is what makes designs re-editable documents instead of one-shot saves.
 */
export async function PUT(request, { params }) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const design = await getDesignById(params.id);
    if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    if (design.userId !== user.id) return NextResponse.json({ error: "Not your design." }, { status: 403 });

    const { data, response: invalid } = validate(createDesignSchema, await readJsonBody(request));
    if (invalid) return invalid;

    const updated = await updateDesign(params.id, { name: data.name, spec: data.spec });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save design.", details: error.message }, { status: 500 });
  }
}

/** DELETE /api/designs/:id — soft-delete a design (owner only, audit-logged). */
export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const design = await getDesignById(params.id);
    if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    if (design.userId !== user.id) return NextResponse.json({ error: "Not your design." }, { status: 403 });

    await deleteDesign(params.id);
    await recordAudit({ actorId: user.id, action: "design.delete", resource: "design", resourceId: params.id, ip: clientIp(request) });
    return NextResponse.json({ deleted: true, id: params.id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete design.", details: error.message }, { status: 500 });
  }
}
