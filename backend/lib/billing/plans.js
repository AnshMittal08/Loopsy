// Maps Loopsy plans <-> Stripe price IDs (supplied via env). The plan
// *entitlements* live in lib/utils/planLimits.js — this module is only the
// purchase mapping. Configure STRIPE_PRICE_MAKER_PRO / STRIPE_PRICE_CREATOR.

const PLAN_PRICE_ENV = {
  maker_pro: "STRIPE_PRICE_MAKER_PRO",
  creator: "STRIPE_PRICE_CREATOR",
};

/** The Stripe price id configured for a plan (or null if unset). */
function priceIdFor(plan) {
  const envKey = PLAN_PRICE_ENV[plan];
  return envKey ? process.env[envKey] || null : null;
}

/** Reverse lookup: which plan a Stripe price id corresponds to (or null). */
function planForPriceId(priceId) {
  if (!priceId) return null;
  for (const [plan, envKey] of Object.entries(PLAN_PRICE_ENV)) {
    if (process.env[envKey] && process.env[envKey] === priceId) return plan;
  }
  return null;
}

const PURCHASABLE_PLANS = Object.keys(PLAN_PRICE_ENV);

module.exports = { priceIdFor, planForPriceId, PURCHASABLE_PLANS };
