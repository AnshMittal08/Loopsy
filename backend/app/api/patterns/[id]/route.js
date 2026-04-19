import { NextResponse } from "next/server";
import { getPatternById } from "@/lib/models/patternModel";

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
