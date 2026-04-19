import { NextResponse } from "next/server";
import { getTemplateById } from "@/lib/models/templateModel";

/**
 * GET /api/templates/:id
 * Returns full template details including defaultPattern.
 */
export async function GET(request, { params }) {
  try {
    const template = getTemplateById(params.id);

    if (!template) {
      return NextResponse.json(
        { error: `Template with id "${params.id}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch template.", details: error.message },
      { status: 500 }
    );
  }
}
