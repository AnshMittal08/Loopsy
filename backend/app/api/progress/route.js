import { NextResponse } from "next/server";
import { getPatternById } from "@/lib/models/patternModel";
import { getOrCreateProgress } from "@/lib/models/progressModel";
import { generateId } from "@/lib/utils/helpers";

export async function POST(request) {
  try {
    const body = await request.json();
    const { patternId } = body;

    if (!patternId) {
      return NextResponse.json({ error: "patternId is required." }, { status: 400 });
    }

    const pattern = getPatternById(patternId);
    if (!pattern) {
      return NextResponse.json(
        { error: `Pattern with id "${patternId}" not found.` },
        { status: 404 }
      );
    }

    // Idempotent: returns existing record if one already exists for this pattern
    const record = getOrCreateProgress({
      id: generateId(),
      patternId,
      totalSteps: pattern.steps.length,
      steps: pattern.steps.map(s => ({ row: s.row ?? s, completed: false })),
      progressPercentage: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to initialize progress.", details: error.message },
      { status: 500 }
    );
  }
}
