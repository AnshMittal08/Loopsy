const Stripe = require("stripe");

// Lazily-constructed Stripe client. Billing is "off" (routes return 503) until
// STRIPE_SECRET_KEY is set, so the app runs identically without it.
let client = null;

function isBillingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function stripe() {
  if (!isBillingConfigured()) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

module.exports = { stripe, isBillingConfigured };
