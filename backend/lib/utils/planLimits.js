const { getUsageCount, incrementUsage } = require('../models/usageModel');

const PLAN_LIMITS = {
  free:      { generations: 3,        tutor: 3          },
  maker_pro: { generations: 30,       tutor: Infinity   },
  creator:   { generations: Infinity, tutor: Infinity   },
};

function checkRateLimit(user, type) {
  const plan = user.subscription?.plan || 'free';
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

module.exports = { PLAN_LIMITS, checkRateLimit, recordUsage };
