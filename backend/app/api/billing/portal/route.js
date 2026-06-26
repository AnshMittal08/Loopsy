import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isCrossSiteRequest, appOrigin } from "@/lib/auth/request";
import { stripe, isBillingConfigured } from "@/lib/billing/stripe";
import { getUserWithSubscriptionById } from "@/lib/models/userModel";

/**
 * POST /api/billing/portal — open the Stripe billing portal for the current
 * customer (manage / cancel / update card) and return its URL. Returns 503 when
 * billing isn't configured, and 409 when the user has no Stripe customer yet
 * (they haven't completed a checkout), so the UI can guide them to upgrade.
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

    const full = await getUserWithSubscriptionById(user.id);
    const customerId = full?.subscription?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: "No billing account yet — upgrade first.", code: "NO_CUSTOMER" }, { status: 409 });
    }

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appOrigin()}/account`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Could not open the billing portal.", details: error.message }, { status: 500 });
  }
}
