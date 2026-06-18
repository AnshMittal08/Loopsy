import { NextResponse } from "next/server";
import { compileChart, compileMedallion } from "@/lib/engine/chart";
import { validatePattern } from "@/lib/engine";
import { createPattern } from "@/lib/models/patternModel";
import { generateId } from "@/lib/utils/helpers";
import { requireAuthenticatedUser } from "@/lib/auth/session";

// Colorwork (M4 "Draw"): a pixel grid → exact, verified pattern. Either a flat
// panel worked in rows, or a medallion worked in the round (a 3D disc/dome).
// Fully deterministic (no AI), so it isn't rate-limited.

function buildChartPattern({ name, yarnWeight, cols, rows, grid, difficulty, construction }) {
  const round = construction === "round";
  const out = round
    ? compileMedallion({ name, yarnWeight, cols, rows, grid })
    : compileChart({ name, yarnWeight, cols, rows, grid });
  if (!out.ok) {
    const err = new Error(out.errors?.[0] || "Could not compile the chart.");
    err.code = "CHART_INVALID";
    throw err;
  }
  const validation = validatePattern(out.steps);
  const hours = Math.max(1, Math.round(out.stitchTotal / 300));
  return {
    id: generateId(),
    title: name || (round ? "Medallion" : "Colourwork chart"),
    difficulty: (difficulty || "intermediate").charAt(0).toUpperCase() + (difficulty || "intermediate").slice(1),
    category: round ? "Home Decor" : "Colorwork",
    tags: round ? ["colorwork", "medallion", "in-the-round"] : ["colorwork", "chart", "tapestry"],
    materials: out.materials,
    hookSize: out.hookSize,
    yarnWeight: out.yarnWeight,
    timeEstimate: hours <= 1 ? "1–2 hrs" : `${hours}–${hours + 2} hrs`,
    finishedSize: out.finishedSize,
    notes: round
      ? [
          "Worked in the round from the centre out — the drawing is sampled ring by ring.",
          "Change colour on the final yarn-over of the previous stitch; mark the start of each round.",
          "Leave the increases off the last 2 rounds to cup it into a dome.",
        ]
      : [
          "Worked flat in single crochet from a colour chart, one stitch per square.",
          "Change to the next colour by drawing it through on the final yarn-over of the previous stitch.",
          "Carry unused colours loosely along the back, or use separate bobbins for big blocks.",
        ],
    steps: out.steps.map(({ row, instruction }) => ({ row, instruction })),
    verified: validation.verified,
    isExperimental: false,
    isAIGenerated: false,
    fromChart: true,
    promptSummary: null,
    createdAt: new Date().toISOString(),
    isFallback: false,
  };
}

export async function POST(request) {
  try {
    const { user, response } = requireAuthenticatedUser(request);
    if (response) return response;

    const body = await request.json();
    const { name, yarnWeight, cols, rows, grid, difficulty, construction, stream } = body;
    if (!Array.isArray(grid) || !cols || !rows) {
      return NextResponse.json({ error: "A chart grid is required." }, { status: 400 });
    }

    if (!stream) {
      const pattern = buildChartPattern({ name, yarnWeight, cols, rows, grid, difficulty, construction });
      pattern.userId = user.id;
      createPattern(pattern);
      return NextResponse.json(pattern, { status: 201 });
    }

    const encoder = new TextEncoder();
    const sse = new ReadableStream({
      async start(controller) {
        const send = (event, data) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        try {
          send("status", { stage: "charting", message: "Reading your chart…" });
          const pattern = buildChartPattern({ name, yarnWeight, cols, rows, grid, difficulty, construction });
          send("status", { stage: "writing", message: "Writing every row…" });
          for (const s of pattern.steps) send("step", { row: s.row, instruction: s.instruction });
          pattern.userId = user.id;
          createPattern(pattern);
          send("pattern", pattern);
        } catch (error) {
          send("error", { error: error.message, code: error.code || "CHART_FAILED" });
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
    return NextResponse.json({ error: "Failed to generate the chart pattern.", details: error.message }, { status: 500 });
  }
}
