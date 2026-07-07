import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { listNotifications, unreadCount, markAllRead } from "@/lib/models/notificationModel";

export const dynamic = "force-dynamic";

/** GET /api/notifications — latest 20 + unread count for the bell. */
export async function GET(request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response) return response;
  const [notifications, unread] = await Promise.all([
    listNotifications(user.id, 20),
    unreadCount(user.id),
  ]);
  return NextResponse.json({ notifications, unread });
}

/** POST /api/notifications — mark everything read (opening the menu). */
export async function POST(request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response) return response;
  await markAllRead(user.id);
  return NextResponse.json({ ok: true });
}
