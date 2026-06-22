import { NextResponse } from "next/server";

/** Parse a request body as JSON, tolerant of empty/invalid payloads (→ {}). */
export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/**
 * Validate `data` against a zod schema at the API boundary.
 * @returns {{ data: object, response: null } | { data: null, response: Response }}
 *   On success returns the parsed (coerced) data; on failure returns a 400
 *   Response carrying the first validation issue's message.
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues?.[0]?.message || "Invalid request.";
    return { data: null, response: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { data: result.data, response: null };
}
