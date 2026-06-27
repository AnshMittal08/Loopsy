-- Billing: store the Stripe customer id on the subscription so we can open the
-- Stripe billing portal for a returning customer. Idempotent (IF NOT EXISTS).
BEGIN;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripeCustomerId TEXT;

COMMIT;
