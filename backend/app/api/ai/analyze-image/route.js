import { NextResponse } from "next/server";
import { recordError } from "@/lib/models/errorModel";
import { analyzeImageToDesignSpec } from "@/lib/services/aiService";
import { normalizeDesignSpec } from "@/lib/engine";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { checkVisionAccess, recordVisionUse } from "@/lib/utils/planLimits";

// Vision Studio (M3): photo(s) → confidence-scored, editable Design Spec.
// This is the metered step — the expensive vision call. The follow-up compile
// (POST /api/ai/generate-from-spec) is the deterministic, free continuation.

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGES = 3;
const MAX_BYTES = 5 * 1024 * 1024; // ~5 MB per image (base64 decoded)

function base64Bytes(data) {
  // Approximate decoded size from base64 length.
  return Math.floor((data.length * 3) / 4);
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Vision Studio requires the AI service, which is not configured.", code: "AI_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const access = await checkVisionAccess(user);
    if (!access.allowed) {
      const message =
        access.code === "VISION_TRIAL_USED"
          ? "You've used your free Vision Studio trial. Upgrade to Maker Pro for full photo-to-pattern."
          : `You've used all ${access.limit} AI generations for this month.`;
      return NextResponse.json({ error: message, ...access }, { status: 429 });
    }

    const body = await request.json();
    const { images, hint } = body;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "At least one image is required." }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Up to ${MAX_IMAGES} images are allowed.` }, { status: 400 });
    }
    for (const img of images) {
      if (!img || typeof img.data !== "string" || !ALLOWED_MEDIA.has(img.media_type)) {
        return NextResponse.json(
          { error: "Each image must be base64 data with a media_type of JPEG, PNG, WebP, or GIF." },
          { status: 400 }
        );
      }
      if (base64Bytes(img.data) > MAX_BYTES) {
        return NextResponse.json({ error: "Each image must be under 5 MB." }, { status: 413 });
      }
    }

    const analysis = await analyzeImageToDesignSpec(images, typeof hint === "string" ? hint : "");

    // The metered event is the analysis itself (plan-v2): record it now, before
    // the user edits and compiles, so an abandoned analysis still counts.
    await recordVisionUse(user);

    // Normalize the spec (fill defaults, drop unknown fields) before returning
    // it to the editable-chips UI. Keep the readout fields alongside it.
    const spec = normalizeDesignSpec(analysis);

    return NextResponse.json(
      {
        confidence: analysis.confidence ?? "low",
        observed: Array.isArray(analysis.observed) ? analysis.observed : [],
        feasible: analysis.feasible !== false,
        spec,
        access: { mode: access.mode, plan: access.plan },
      },
      { status: 200 }
    );
  } catch (error) {
    recordError({ route: "/api/ai/analyze-image", method: "POST", message: error.message, stack: error.stack, statusCode: 500 }).catch(() => {});
    return NextResponse.json(
      { error: "Failed to analyze the image.", details: error.message },
      { status: 500 }
    );
  }
}
