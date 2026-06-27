import { NextResponse } from "next/server";
import { stripe, isBillingConfigured } from "@/lib/billing/stripe";
import { planForPriceId } from "@/lib/billing/plans";
import { setUserPlan, setStripeCustomerId } from "@/lib/models/userModel";
import { recordAudit } from "@/lib/models/auditModel";

// Stripe sends raw JSON we must verify against the signing secret, so we read
// the raw body (no JSON parsing). Entitlements are derived from the resulting
// plan via lib/utils/planLimits.js.
export async function POST(request) {
  if (!isBillingConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing webhooks are not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const raw = await request.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.client_reference_id || s.metadata?.userId;
        const plan = s.metadata?.plan;
        if (userId && plan) {
          await setUserPlan(userId, plan, "active");
          if (s.customer) await setStripeCustomerId(userId, s.customer);
          await recordAudit({ actorId: userId, action: "billing.plan_changed", resource: "subscription", resourceId: userId, meta: { plan, via: "checkout" } });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        const plan = planForPriceId(sub.items?.data?.[0]?.price?.id);
        if (userId && plan) {
          await setUserPlan(userId, plan, sub.status === "active" ? "active" : sub.status);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId) {
          await setUserPlan(userId, "free", "canceled");
          await recordAudit({ actorId: userId, action: "billing.plan_changed", resource: "subscription", resourceId: userId, meta: { plan: "free", via: "cancellation" } });
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Webhook handler error.", details: error.message }, { status: 500 });
  }
}
