"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { gatewayProof } from "@/lib/gateway/proof";
import { planPriceId } from "@/lib/billing/plans";
import type { Plan } from "@/lib/dashboard/types";

interface UrlResult {
  url?: string;
  error?: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Start a Stripe Checkout session for a paid plan; returns the redirect URL. */
export async function startCheckoutAction(plan: Plan): Promise<UrlResult> {
  if (!stripeConfigured()) return { error: "Billing is not configured on this deployment." };
  const priceId = planPriceId(plan);
  if (!priceId) return { error: "That plan isn't available for self-serve checkout." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Reuse or create the Stripe customer, and store the id on the profile (this
  // is what the webhook maps back to — it runs without a user session).
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id ?? undefined;
  try {
    const stripe = getStripe();
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      // profiles billing columns are not user-writable (migration 0012). Write
      // the customer id through the proof-gated RPC — this also prevents a user
      // pointing their stripe_customer_id at someone else's customer to hijack
      // the billing portal.
      await supabase.rpc("gateway_set_stripe_customer", {
        p_user_id: user.id,
        p_customer_id: customerId,
        p_proof: gatewayProof(),
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { supabase_user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${siteUrl()}/dashboard/settings?checkout=success`,
      cancel_url: `${siteUrl()}/dashboard/settings?checkout=canceled`,
    });
    if (!session.url) return { error: "Could not start checkout." };
    return { url: session.url };
  } catch {
    return { error: "Could not reach Stripe. Check the billing configuration." };
  }
}

/** Open the Stripe billing portal to manage/cancel the subscription. */
export async function openBillingPortalAction(): Promise<UrlResult> {
  if (!stripeConfigured()) return { error: "Billing is not configured on this deployment." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.stripe_customer_id) return { error: "No billing account yet — upgrade first." };

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl()}/dashboard/settings`,
    });
    return { url: session.url };
  } catch {
    return { error: "Could not open the billing portal." };
  }
}
