import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest } from "@/lib/auth/request";
import { createCollection, getUserCollections } from "@/lib/models/collectionModel";
import { validate, readJsonBody } from "@/lib/validation";
import { createCollectionSchema } from "@/lib/validation/schemas";

/** GET /api/collections — the signed-in user's collections (with item counts). */
export async function GET(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    const collections = await getUserCollections(user.id);
    return NextResponse.json(collections, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load collections.", details: error.message }, { status: 500 });
  }
}

/** POST /api/collections — create a new collection. Body: { name } */
export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const { data, response: invalid } = validate(createCollectionSchema, await readJsonBody(request));
    if (invalid) return invalid;

    const collection = await createCollection(user.id, data.name);
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create collection.", details: error.message }, { status: 500 });
  }
}
