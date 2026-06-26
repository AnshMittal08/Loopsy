import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest, appOrigin } from "@/lib/auth/request";
import { stripe, isBillingConfigured } from "@/lib/billing/stripe";
import { priceIdFor } from "@/lib/billing/plans";
import { validate, readJsonBody } from "@/lib/validation";
import { checkoutSchema } from "@/lib/validation/schemas";

/**
 * POST /api/billing/checkout — start a Stripe Checkout session for a plan and
 * return its URL. Returns 503 until billing is configured (STRIPE_SECRET_KEY +
 * the per-plan price ids), so the app runs fine without billing.
 */
export async function POST(request) {
  try {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    const { user, response } = await requireAuthenticatedUser(request);
    if (response) return response;

    if (!isBillingConfigured()) {
      return NextResponse.json({ error: "Billing is not configured yet.", code: "BILLING_NOT_CONFIGURED" }, { status: 503 });
    }

    const { data, response: invalid } = validate(checkoutSchema, await readJsonBody(request));
    if (invalid) return invalid;

    const price = priceIdFor(data.plan);
    if (!price) {
      return NextResponse.json({ error: "That plan isn't available for purchase yet.", code: "PRICE_NOT_CONFIGURED" }, { status: 503 });
    }

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan: data.plan },
      subscription_data: { metadata: { userId: user.id, plan: data.plan } },
      success_url: `${appOrigin()}/account?upgraded=1`,
      cancel_url: `${appOrigin()}/account`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Could not start checkout.", details: error.message }, { status: 500 });
  }
}
