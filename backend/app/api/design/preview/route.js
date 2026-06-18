import { NextResponse } from "next/server";
import { compileDesignSpec, validatePattern } from "@/lib/engine";
import { requireAuthenticatedUser } from "@/lib/auth/session";

// Live design feedback: compile a spec and return just a summary (no AI, no
// save, no rate limit) so the canvas can show "≈ N rounds · verified ✓" while
// the maker designs — surfacing the verified-math moat during design, not only
// after Generate.

export async function POST(request) {
  try {
    const { user, response } = requireAuthenticatedUser(request);
    if (response) return response;

    const { spec } = await request.json();
    if (!spec || typeof spec !== "object") {
      return NextResponse.json({ ok: false, error: "A spec is required." }, { status: 400 });
    }

    const compiled = compileDesignSpec(spec);
    if (!compiled.ok) {
      return NextResponse.json({ ok: false, errors: compiled.errors || ["Not compilable yet."] });
    }

    const validation = validatePattern(compiled.steps);
    const totalStitches = compiled.parts.reduce(
      (sum, p) => sum + (p.maxStitchCount || 0) * (p.quantity || 1),
      0
    );

    return NextResponse.json({
      ok: true,
      verified: validation.verified,
      rows: compiled.steps.length,
      partCount: compiled.parts.length,
      peakStitches: totalStitches,
      finishedSize: compiled.finishedSize,
      hookSize: compiled.hookSize,
      yarnWeight: compiled.yarnWeight,
      parts: compiled.parts.map((p) => ({ name: p.name, maxStitch: p.maxStitchCount, quantity: p.quantity })),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
