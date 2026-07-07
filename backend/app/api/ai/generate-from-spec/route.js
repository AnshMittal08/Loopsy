import { NextResponse } from "next/server";
import { generatePatternFromSpec } from "@/lib/services/aiService";
import { normalizeDesignSpec, validateDesignSpec } from "@/lib/engine";
import { createPattern } from "@/lib/models/patternModel";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { recordError } from "@/lib/models/errorLogModel";

// Vision Studio (M3): compile a user-approved Design Spec into a verified
// pattern. This is the deterministic follow-through of an already-metered
// analysis (POST /api/ai/analyze-image), so it does not charge again.

export async function POST(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const body = await request.json();
    const { spec: rawSpec, difficulty, stream } = body;

    if (!rawSpec || typeof rawSpec !== "object") {
      return NextResponse.json({ error: "A design spec is required." }, { status: 400 });
    }

    // The spec was edited by the user — normalize and validate before compiling.
    const spec = normalizeDesignSpec(rawSpec);
    const validation = validateDesignSpec(spec);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "The design needs a few fixes before it can be compiled.", code: "SPEC_INVALID", issues: validation.errors },
        { status: 400 }
      );
    }

    const raw = difficulty || "beginner";
    const normalizedDifficulty = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

    if (!stream) {
      const pattern = await generatePatternFromSpec(spec, normalizedDifficulty, { sourceLabel: spec.name });
      pattern.userId = user.id;
      await createPattern(pattern);
      return NextResponse.json(pattern, { status: 201 });
    }

    // Streaming: mirror the text generator's SSE so the Create page's
    // generation theater plays identically for photo-sourced designs.
    const encoder = new TextEncoder();
    const sse = new ReadableStream({
      async start(controller) {
        const send = (event, data) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          const pattern = await generatePatternFromSpec(spec, normalizedDifficulty, {
            sourceLabel: spec.name,
            onEvent: (e) => {
              if (e.type === "step") send("step", { row: e.row, instruction: e.instruction });
              else send("status", { stage: e.stage, message: e.message });
            },
          });
          pattern.userId = user.id;
          await createPattern(pattern);
          send("pattern", pattern);
        } catch (error) {
          send("error", { error: error.message, code: error.code || "COMPILE_FAILED" });
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
    recordError({ route: "/api/ai/generate-from-spec", method: "POST", message: error?.message, stack: error?.stack }).catch(() => {});
    return NextResponse.json(
      { error: "Failed to compile the design.", details: error.message },
      { status: 500 }
    );
  }
}
