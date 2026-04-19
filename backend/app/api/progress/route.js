import { NextResponse } from "next/server";
import { getPatternById } from "@/lib/models/patternModel";
import { createProgress } from "@/lib/models/progressModel";
import { generateId } from "@/lib/utils/helpers";

/**
 * POST /api/progress
 * Initializes a progress tracker for a pattern.
 *
 * Request body: { patternId }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { patternId } = body;

    if (!patternId) {
      return NextResponse.json(
        { error: "patternId is required." },
        { status: 400 }
      );
    }

    const pattern = getPatternById(patternId);
    if (!pattern) {
      return NextResponse.json(
        { error: `Pattern with id "${patternId}" not found.` },
        { status: 404 }
      );
    }

    const record = createProgress({
      id: generateId(),
      patternId,
      totalSteps: pattern.steps.length,
      completedSteps: [],
      progressPercentage: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        progressId: record.id,
        patternId: record.patternId,
        totalSteps: record.totalSteps,
        completedSteps: record.completedSteps,
        progressPercentage: record.progressPercentage,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to initialize progress.", details: error.message },
      { status: 500 }
    );
  }
}
