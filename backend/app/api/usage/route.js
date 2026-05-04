import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getUsageCount } from "@/lib/models/usageModel";
import { PLAN_LIMITS } from "@/lib/utils/planLimits";

export async function GET(request) {
  const { user, response } = requireAuthenticatedUser(request);
  if (response) return response;

  const plan = user.subscription?.plan || "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const generationLimit = limits.generations === Infinity ? null : limits.generations;
  const tutorLimit = limits.tutor === Infinity ? null : limits.tutor;

  return NextResponse.json({
    plan,
    limits: { generations: generationLimit, tutor: tutorLimit },
    used: {
      generations: getUsageCount(user.id, "generation"),
      tutor: getUsageCount(user.id, "tutor"),
    },
  });
}
