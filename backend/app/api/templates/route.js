import { NextResponse } from "next/server";
import { getAllTemplates, getFilteredTemplates } from "@/lib/models/templateModel";

/**
 * GET /api/templates
 * Returns all templates (summary view — no defaultPattern).
 * Optional query params: ?difficulty=Beginner&category=Wearable&q=scarf
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const category = searchParams.get("category");
    const search = searchParams.get("q");

    const hasFilters = difficulty || category || search;
    const templates = hasFilters
      ? getFilteredTemplates({ difficulty, category, search })
      : getAllTemplates();

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates.", details: error.message },
      { status: 500 }
    );
  }
}
