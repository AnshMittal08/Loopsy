import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/models/accountModel";
import { recordAudit } from "@/lib/models/auditModel";

export const dynamic = "force-dynamic";

/** GET /api/account/export — download everything we hold as JSON (GDPR access). */
export async function GET(request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response) return response;

  const data = await exportUserData(user.id);
  recordAudit({ actorId: user.id, action: "account.export", resource: "user", resourceId: user.id }).catch(() => {});

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="loopsy-data-${user.id}.json"`,
    },
  });
}
