import { NextResponse } from "next/server";
import { getAllTemplates } from "@/lib/models/templateModel";

/**
 * GET /api/templates
 * Returns all templates (summary view — no defaultPattern).
 */
export async function GET() {
  try {
    const templates = getAllTemplates();
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates.", details: error.message },
      { status: 500 }
    );
  }
}
