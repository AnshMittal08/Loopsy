import { NextResponse } from "next/server";
import { toggleStepAtomic } from "@/lib/models/progressModel";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { stepIndex } = body;

    if (stepIndex === undefined || stepIndex === null) {
      return NextResponse.json({ error: "stepIndex is required." }, { status: 400 });
    }

    if (typeof stepIndex !== "number" || !Number.isInteger(stepIndex) || stepIndex < 0) {
      return NextResponse.json({ error: "stepIndex must be a non-negative integer." }, { status: 400 });
    }

    const updated = toggleStepAtomic(params.id, stepIndex);

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
