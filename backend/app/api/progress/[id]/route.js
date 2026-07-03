import { NextResponse } from "next/server";
import { toggleStepAtomic, updateNotes, getProgressById } from "@/lib/models/progressModel";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const body = await request.json();
    const { stepIndex, completed, notes } = body;

    // Notes-only update (maker's own project notes).
    if (stepIndex === undefined && typeof notes === "string") {
      const ok = await updateNotes(params.id, user.id, notes.slice(0, 4000));
      if (!ok) return NextResponse.json({ error: "Progress record not found." }, { status: 404 });
      return NextResponse.json(await getProgressById(params.id, user.id), { status: 200 });
    }

    if (stepIndex === undefined || stepIndex === null) {
      return NextResponse.json({ error: "stepIndex is required." }, { status: 400 });
    }

    if (typeof stepIndex !== "number" || !Number.isInteger(stepIndex) || stepIndex < 0) {
      return NextResponse.json({ error: "stepIndex must be a non-negative integer." }, { status: 400 });
    }

    // Optional explicit desired state makes offline replays idempotent.
    const desired = typeof completed === "boolean" ? completed : undefined;
    const updated = await toggleStepAtomic(params.id, user.id, stepIndex, desired);

    if (!updated) {
      return NextResponse.json(
        { error: `Progress record "${params.id}" not found or stepIndex out of range.` },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update progress.", details: error.message },
      { status: 500 }
    );
  }
}
