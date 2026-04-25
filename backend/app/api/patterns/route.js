import { NextResponse } from "next/server";
import { getAllPatterns } from "@/lib/models/patternModel";
import { generatePattern } from "@/lib/services/patternService";
import { getAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/session";

/**
 * GET /api/patterns
 * Returns all created patterns (history).
 */
export async function GET(request) {
  try {
    const user = getAuthenticatedUser(request);
    const patterns = user ? getAllPatterns(user.id) : [];
    return NextResponse.json(patterns, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch patterns.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patterns
 * Creates a new pattern from a template + customization.
 *
 * Request body: { templateId, title, customization: { color, size } }
 */
export async function POST(request) {
  try {
    const { user, response } = requireAuthenticatedUser(request);
    if (response) return response;

    const body = await request.json();
    const { templateId, title, customization } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required." },
        { status: 400 }
      );
    }

    const { pattern, error } = generatePattern(templateId, title, customization ?? {}, { userId: user.id });

    if (error) {
      return NextResponse.json({ error }, { status: 404 });
    }

    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create pattern.", details: error.message },
      { status: 500 }
    );
  }
}
