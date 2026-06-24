import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { normalizeDesignSpec } from "@/lib/engine";
import { createDesign, getDesignsForUser } from "@/lib/models/designModel";
import { validate, readJsonBody } from "@/lib/validation";
import { createDesignSchema } from "@/lib/validation/schemas";

// Design Canvas (M4): persist a canvas state so it can be revisited and shared.

export async function POST(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    const { data, response: invalid } = validate(createDesignSchema, await readJsonBody(request));
    if (invalid) return invalid;
    const { name, spec } = data;

    const design = await createDesign({
      userId: user.id,
      name: name || spec.name || "Untitled design",
      spec: normalizeDesignSpec(spec),
    });
    return NextResponse.json(design, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save design.", details: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    return NextResponse.json(await getDesignsForUser(user.id));
  } catch (error) {
    return NextResponse.json({ error: "Failed to load designs.", details: error.message }, { status: 500 });
  }
}
