import { NextResponse } from "next/server";
import { getDesignById, linkPattern } from "@/lib/models/designModel";
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
