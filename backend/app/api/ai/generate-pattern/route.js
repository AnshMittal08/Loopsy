import { NextResponse } from "next/server";
import { generatePatternFromAI } from "@/lib/services/aiService";
import { createPattern } from "@/lib/models/patternModel";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { checkRateLimit, recordUsage } from "@/lib/utils/planLimits";

export async function POST(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const check = await checkRateLimit(user, "generation");
    if (!check.allowed) {
      return NextResponse.json(
        { error: `You've used all ${check.limit} AI generations for this month.`, code: "RATE_LIMIT_EXCEEDED", limit: check.limit, used: check.used, plan: check.plan },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { prompt, difficulty, stream } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const raw = difficulty || "beginner";
    const normalizedDifficulty = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

    if (!stream) {
      const pattern = await generatePatternFromAI(prompt, normalizedDifficulty);
      // A fallback means every AI provider failed (e.g. no API key on the
      // backend). Surface it as an outage — don't save a junk pattern and
      // don't burn the user's quota on a failed generation.
      if (pattern.isFallback) {
        return NextResponse.json(
          { error: "AI generation is temporarily unavailable. Please try again in a moment.", code: "AI_UNAVAILABLE" },
          { status: 503 }
        );
      }
      pattern.userId = user.id;
      await createPattern(pattern);

      await recordUsage(user.id, "generation");
      return NextResponse.json(pattern, { status: 201 });
    }

    // Streaming mode (plan-v2): the generation theater is real, not simulated.
    // Server-sent events: `status` (pipeline stage), `step` (a computed row),
    // then a final `pattern` (the saved record) or `error`.
    const encoder = new TextEncoder();
    const sse = new ReadableStream({
      async start(controller) {
        const send = (event, data) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const pattern = await generatePatternFromAI(prompt, normalizedDifficulty, (e) => {
            if (e.type === "step") send("step", { row: e.row, instruction: e.instruction });
            else send("status", { stage: e.stage, message: e.message });
          });
          // Fallback = every provider failed; treat as an outage, not a result.
          if (pattern.isFallback) {
            send("error", { error: "AI generation is temporarily unavailable. Please try again in a moment.", code: "AI_UNAVAILABLE" });
            return;
          }
          pattern.userId = user.id;
          await createPattern(pattern);

          await recordUsage(user.id, "generation");
          send("pattern", pattern);
        } catch (error) {
          send("error", { error: "Failed to generate pattern via AI.", details: error.message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sse, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate pattern via AI.", details: error.message },
      { status: 500 }
    );
  }
}
