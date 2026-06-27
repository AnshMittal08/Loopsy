import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest } from "@/lib/auth/request";
import { getCollectionById, setPatternInCollection } from "@/lib/models/collectionModel";
import { validate, readJsonBody } from "@/lib/validation";
import { collectionItemSchema } from "@/lib/validation/schemas";

/**
 * POST /api/collections/:id/patterns — add or remove a pattern.
 * Body: { patternId, present: boolean }. Owner-only.
 */
export async function POST(request, { params }) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const collection = await getCollectionById(params.id);
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found." }, { status: 404 });
    }

    const { data, response: invalid } = validate(collectionItemSchema, await readJsonBody(request));
    if (invalid) return invalid;

    await setPatternInCollection(params.id, data.patternId, data.present);
    return NextResponse.json({ ok: true, present: data.present }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update collection.", details: error.message }, { status: 500 });
  }
}
