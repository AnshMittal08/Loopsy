import { NextResponse } from "next/server";
import { getPublicPatternById } from "@/lib/models/patternModel";

/**
 * GET /api/patterns/:id/public
 * Returns a published pattern's full detail for the public pattern page.
 * No auth required — the pattern must have publishedAt set.
 */
export async function GET(_request, { params }) {
  try {
    const pattern = await getPublicPatternById(params.id);
    if (!pattern) {
      return NextResponse.json({ error: "Pattern not found or not published." }, { status: 404 });
    }
    return NextResponse.json(pattern, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pattern.", details: error.message }, { status: 500 });
  }
}
