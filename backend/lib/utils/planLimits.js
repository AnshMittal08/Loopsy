const {
  getUsageCount,
  incrementUsage,
  getLifetimeUsageCount,
  incrementLifetimeUsage,
} = require('../models/usageModel');

// Keyed by the same type strings the routes pass to checkRateLimit/recordUsage
// and the counter stores under ('generation', 'tutor'). (Previously keyed
// 'generations', which silently never matched 'generation' — so the limit was
// never enforced.)
const PLAN_LIMITS = {
  free:      { generation: 3,        tutor: 3          },
  maker_pro: { generation: 30,       tutor: Infinity   },
  creator:   { generation: Infinity, tutor: Infinity   },
};

// Vision Studio (M3): the expensive vision analysis is the metered event.
// Free gets a single lifetime trial (the upgrade hook); paid plans spend a
// monthly generation; Creator is unlimited.
const FREE_VISION_TRIALS = 1;

function planOf(user) {
  return user.subscription?.plan || 'free';
}

function checkRateLimit(user, type) {
  const plan = planOf(user);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const limit = limits[type] ?? PLAN_LIMITS.free[type];
  if (limit === Infinity) return { allowed: true };
  const used = getUsageCount(user.id, type);
  if (used >= limit) return { allowed: false, limit, used, plan };
  return { allowed: true };
}

function recordUsage(userId, type) {
  incrementUsage(userId, type);
}

/**
 * Gate a Vision Studio analysis.
 *  - creator: unlimited
 *  - maker_pro: counts as a monthly generation
 *  - free: one lifetime trial
 * @returns {{ allowed: boolean, mode?: string, code?: string, ... }}
 */
function checkVisionAccess(user) {
  const plan = planOf(user);

  if (plan === 'creator') return { allowed: true, mode: 'unlimited', plan };

  if (plan === 'maker_pro') {
    const gen = checkRateLimit(user, 'generation');
    return gen.allowed
      ? { allowed: true, mode: 'generation', plan }
      : { ...gen, mode: 'generation', code: 'RATE_LIMIT_EXCEEDED' };
  }

  // free — lifetime trial
  const used = getLifetimeUsageCount(user.id, 'vision');
  if (used >= FREE_VISION_TRIALS) {
    return { allowed: false, mode: 'trial', code: 'VISION_TRIAL_USED', plan, limit: FREE_VISION_TRIALS, used };
  }
  return { allowed: true, mode: 'trial', plan, remaining: FREE_VISION_TRIALS - used };
}

/** Record a Vision Studio analysis against the right counter for the plan. */
function recordVisionUse(user) {
  const plan = planOf(user);
  if (plan === 'creator') return;
  if (plan === 'maker_pro') return incrementUsage(user.id, 'generation');
  incrementLifetimeUsage(user.id, 'vision');
}

module.exports = {
  PLAN_LIMITS,
  FREE_VISION_TRIALS,
  checkRateLimit,
  recordUsage,
  checkVisionAccess,
  recordVisionUse,
};
