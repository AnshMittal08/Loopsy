import { NextResponse } from "next/server";
import { generatePatternFromAI } from "@/lib/services/aiService";
import { createPattern } from "@/lib/models/patternModel";

/**
 * POST /api/ai/regenerate
 * Generates an alternative crochet pattern using AI.
 * (Currently shares identical logic to generate-pattern, 
 * but provides a distinct endpoint for semantic separation 
 * or future variation logic).
 *
 * Request body: { prompt, difficulty }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, difficulty } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    // You could inject something like "Provide an alternative variation to..." here in the future
    const pattern = await generatePatternFromAI(prompt, difficulty || "beginner");
    
    // Persist the generated pattern so it can be tracked later.
    createPattern(pattern);

    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to regenerate pattern via AI.", details: error.message },
      { status: 500 }
    );
  }
}
