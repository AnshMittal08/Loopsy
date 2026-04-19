import { NextResponse } from "next/server";
import { getProgressById, updateProgress } from "@/lib/models/progressModel";
import { calcPercentage } from "@/lib/utils/helpers";

/**
 * PATCH /api/progress/:id
 * Marks a step as complete and recalculates progressPercentage.
 *
 * Request body: { stepIndex }
 */
export async function PATCH(request, { params }) {
  try {
    const record = getProgressById(params.id);

    if (!record) {
      return NextResponse.json(
        { error: `Progress record with id "${params.id}" not found.` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { stepIndex } = body;

    if (stepIndex === undefined || stepIndex === null) {
      return NextResponse.json(
        { error: "stepIndex is required." },
        { status: 400 }
      );
    }

    if (typeof stepIndex !== "number" || !Number.isInteger(stepIndex) || stepIndex < 0) {
      return NextResponse.json(
        { error: "stepIndex must be a non-negative integer." },
        { status: 400 }
      );
    }

    if (stepIndex >= record.totalSteps) {
      return NextResponse.json(
        { error: `stepIndex ${stepIndex} is out of range. Pattern has ${record.totalSteps} steps (0–${record.totalSteps - 1}).` },
        { status: 400 }
      );
    }

    // Add step only if not already completed
    const completedSteps = record.completedSteps.includes(stepIndex)
      ? record.completedSteps
      : [...record.completedSteps, stepIndex].sort((a, b) => a - b);

    const progressPercentage = calcPercentage(completedSteps.length, record.totalSteps);

    const updated = updateProgress(params.id, { completedSteps, progressPercentage });

    return NextResponse.json(
      {
        progressId: updated.id,
        patternId: updated.patternId,
        totalSteps: updated.totalSteps,
        completedSteps: updated.completedSteps,
        progressPercentage: updated.progressPercentage,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update progress.", details: error.message },
      { status: 500 }
    );
  }
}
