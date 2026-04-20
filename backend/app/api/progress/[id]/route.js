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

    // Toggle step completion status
    const updatedSteps = record.steps.map((step, idx) => {
      if (idx === stepIndex) {
        return { ...step, completed: !step.completed };
      }
      return step;
    });

    const completedCount = updatedSteps.filter(s => s.completed).length;
    const progressPercentage = calcPercentage(completedCount, record.totalSteps);

    const updated = updateProgress(params.id, { steps: updatedSteps, progressPercentage });

    return NextResponse.json(
      {
        id: updated.id,
        patternId: updated.patternId,
        totalSteps: updated.totalSteps,
        steps: updated.steps,
        progressPercentage: updated.progressPercentage,
        createdAt: updated.createdAt,
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
