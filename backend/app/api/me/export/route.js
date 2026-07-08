import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/models/accountModel";

export const dynamic = "force-dynamic";

/** GET /api/me/export — download all of the signed-in user's data as JSON. */
export async function GET(request) {
  try {
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;
    const data = await exportUserData(user.id);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="loopsy-data-${user.id}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export data.", details: error.message }, { status: 500 });
  }
}
