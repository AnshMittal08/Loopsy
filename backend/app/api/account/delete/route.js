import { NextResponse } from "next/server";
import { requireAuthenticatedUser, clearSessionCookie, verifyPassword } from "@/lib/auth/session";
import { getUserByEmail } from "@/lib/models/userModel";
import { deleteUserAccount } from "@/lib/models/accountModel";
import { recordAudit } from "@/lib/models/auditModel";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/delete — permanent account erasure (GDPR).
 * Requires the current password re-typed as { password, confirm: "DELETE" }.
 */
export async function POST(request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response) return response;

  let body;
  try { body = await request.json(); } catch { body = {}; }
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  // Re-verify the password so a hijacked session can't nuke an account.
  const record = await getUserByEmail(user.email);
  if (!record || !verifyPassword(String(body.password || ""), record.passwordHash)) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
  }

  await deleteUserAccount(user.id);
  recordAudit({ actorId: user.id, action: "account.delete", resource: "user", resourceId: user.id }).catch(() => {});

  const res = NextResponse.json({ ok: true }, { status: 200 });
  return clearSessionCookie(res);
}
