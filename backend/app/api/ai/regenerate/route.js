import { NextResponse } from "next/server";
import { generatePatternFromAI } from "@/lib/services/aiService";
import { createPattern } from "@/lib/models/patternModel";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { checkRateLimit, recordUsage } from "@/lib/utils/planLimits";

export async function POST(request) {
  try {
    const { user, response } = requireAuthenticatedUser(request);
    if (response) return response;

    const check = checkRateLimit(user, "generation");
    if (!check.allowed) {
      return NextResponse.json(
        { error: `You've used all ${check.limit} AI generations for this month.`, code: "RATE_LIMIT_EXCEEDED", limit: check.limit, used: check.used, plan: check.plan },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { prompt, difficulty } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const raw = difficulty || "beginner";
    const normalizedDifficulty = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    const pattern = await generatePatternFromAI(prompt, normalizedDifficulty);
    // Fallback = every provider failed; surface as an outage, don't save or charge.
    if (pattern.isFallback) {
      return NextResponse.json(
        { error: "AI generation is temporarily unavailable. Please try again in a moment.", code: "AI_UNAVAILABLE" },
        { status: 503 }
      );
    }
    pattern.userId = user.id;
    createPattern(pattern);

    recordUsage(user.id, "generation");
    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to regenerate pattern via AI.", details: error.message },
      { status: 500 }
    );
  }
}
