import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getCollectionById, getCollectionPatternIds, deleteCollection, renameCollection } from "@/lib/models/collectionModel";
import { isCrossSiteRequest } from "@/lib/auth/request";
import { validate, readJsonBody } from "@/lib/validation";
import { renameCollectionSchema } from "@/lib/validation/schemas";
import { getPublicCardsByIds } from "@/lib/models/patternModel";

/**
 * GET /api/collections/:id — collection detail with its resolved (published)
 * pattern cards. Owner-only (collections are private to their owner for now).
 */
export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const collection = await getCollectionById(params.id);
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found." }, { status: 404 });
    }

    const ids = await getCollectionPatternIds(params.id);
    const patterns = await getPublicCardsByIds(ids);
    return NextResponse.json({ collection, patterns }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load collection.", details: error.message }, { status: 500 });
  }
}

/** DELETE /api/collections/:id — remove a collection (owner-only). */
export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    const ok = await deleteCollection(params.id, user.id);
    if (!ok) return NextResponse.json({ error: "Collection not found." }, { status: 404 });
    return NextResponse.json({ deleted: true, id: params.id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete collection.", details: error.message }, { status: 500 });
  }
}

/** PATCH /api/collections/:id — rename (owner-only). Body: { name } */
export async function PATCH(request, { params }) {
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

    const { data, response: invalid } = validate(renameCollectionSchema, await readJsonBody(request));
    if (invalid) return invalid;

    await renameCollection(params.id, user.id, data.name);
    return NextResponse.json({ ...collection, name: data.name }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to rename collection.", details: error.message }, { status: 500 });
  }
}
