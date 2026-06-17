import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getUsageCount, getLifetimeUsageCount } from "@/lib/models/usageModel";
import { PLAN_LIMITS, FREE_VISION_TRIALS } from "@/lib/utils/planLimits";

export async function GET(request) {
  const { user, response } = requireAuthenticatedUser(request);
  if (response) return response;

  const plan = user.subscription?.plan || "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const generationLimit = limits.generation === Infinity ? null : limits.generation;
  const tutorLimit = limits.tutor === Infinity ? null : limits.tutor;

  // Vision Studio access mirrors planLimits' checkVisionAccess semantics:
  //  - free: a one-time lifetime trial
  //  - maker_pro: drawn from the monthly generation allowance
  //  - creator: unlimited
  let vision;
  if (plan === "free") {
    vision = { mode: "trial", trialLimit: FREE_VISION_TRIALS, trialUsed: getLifetimeUsageCount(user.id, "vision") };
  } else if (plan === "maker_pro") {
    vision = { mode: "generation" };
  } else {
    vision = { mode: "unlimited" };
  }

  return NextResponse.json({
    plan,
    limits: { generations: generationLimit, tutor: tutorLimit },
    used: {
      generations: getUsageCount(user.id, "generation"),
      tutor: getUsageCount(user.id, "tutor"),
    },
    vision,
  });
}
