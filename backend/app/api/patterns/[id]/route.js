import { NextResponse } from "next/server";
import { getPatternById, deletePattern } from "@/lib/models/patternModel";

/**
 * GET /api/patterns/:id
 * Returns full details of a single pattern.
 */
export async function GET(request, { params }) {
  try {
    const pattern = getPatternById(params.id);

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
    const pattern = getPatternById(params.id);

    if (!pattern) {
      return NextResponse.json(
        { error: `Pattern with id "${params.id}" not found.` },
        { status: 404 }
      );
    }

    deletePattern(params.id);
    return NextResponse.json({ deleted: true, id: params.id }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete pattern.", details: error.message },
      { status: 500 }
    );
  }
}
