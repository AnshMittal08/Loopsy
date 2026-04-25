import crypto from "crypto";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/utils/helpers";
import { getUserWithSubscriptionById } from "@/lib/models/userModel";
import { createSession, getSessionByToken, deleteSessionByToken } from "@/lib/models/sessionModel";

export const SESSION_COOKIE_NAME = "stitchflow_session";
const SESSION_TTL_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;

  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(derived, "hex"));
}

export function createUserSession(userId) {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  return createSession({
    id: generateId(),
    userId,
    token: crypto.randomBytes(32).toString("hex"),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  });
}

export function readSessionToken(request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const parts = cookieHeader.split(";").map((part) => part.trim());

  for (const part of parts) {
    if (part.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return decodeURIComponent(part.slice(SESSION_COOKIE_NAME.length + 1));
    }
  }

  return null;
}

export function getAuthenticatedUser(request) {
  const token = readSessionToken(request);
  if (!token) return null;

  const session = getSessionByToken(token);
  if (!session) return null;

  const user = getUserWithSubscriptionById(session.userId);
  if (!user) return null;

  return {
    ...user,
    sessionToken: token
  };
}

export function setSessionCookie(response, session) {
  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt)
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
  return response;
}

export function requireAuthenticatedUser(request) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "You must sign in to continue." }, { status: 401 })
    };
  }

  return { user, response: null };
}

export function destroySessionForRequest(request) {
  const token = readSessionToken(request);
  if (token) {
    deleteSessionByToken(token);
  }
}
