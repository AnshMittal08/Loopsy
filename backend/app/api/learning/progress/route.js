import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest } from "@/lib/auth/request";
import { getProgress, setState } from "@/lib/models/learningModel";
import { validate, readJsonBody } from "@/lib/validation";
import { learningStateSchema } from "@/lib/validation/schemas";

/** GET /api/learning/progress — the signed-in user's guide read + bookmark state. */
export async function GET(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    const items = await getProgress(user.id);
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load progress.", details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/learning/progress — set read and/or bookmarked for one guide.
 * Body: { slug, read?, bookmarked? }. Returns the refreshed item set.
 */
export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const { data, response: invalid } = validate(learningStateSchema, await readJsonBody(request));
    if (invalid) return invalid;

    await setState(user.id, data.slug, { read: data.read, bookmarked: data.bookmarked });
    const items = await getProgress(user.id);
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save progress.", details: error.message }, { status: 500 });
  }
}
