"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { gatewayProof } from "@/lib/gateway/proof";
import { planPriceId } from "@/lib/billing/plans";
import type { Plan } from "@/lib/dashboard/types";

interface UrlResult {
  url?: string;
  error?: string;
}

interface BillingResult {
  ok?: boolean;
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
      success_url: `${siteUrl()}/dashboard/settings/billing?checkout=success`,
      cancel_url: `${siteUrl()}/dashboard/settings/billing?checkout=canceled`,
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
      return_url: `${siteUrl()}/dashboard/settings/billing`,
    });
    return { url: session.url };
  } catch {
    return { error: "Could not open the billing portal." };
  }
}

/** Schedule the subscription to end at the period boundary (Stripe). */
export async function cancelSubscriptionAction(): Promise<BillingResult> {
  return setCancelAtPeriodEnd(true);
}

/** Undo a scheduled cancellation — keep the subscription active. */
export async function resumeSubscriptionAction(): Promise<BillingResult> {
  return setCancelAtPeriodEnd(false);
}

async function setCancelAtPeriodEnd(cancel: boolean): Promise<BillingResult> {
  if (!stripeConfigured()) return { error: "Billing is not configured on this deployment." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.stripe_subscription_id) return { error: "No active subscription found." };
  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: cancel,
    });
    // The webhook syncs cancel_at_period_end back to the profile.
    revalidatePath("/dashboard/settings/billing");
    return { ok: true };
  } catch {
    return { error: "Could not update the subscription. Try the billing portal." };
  }
}

/**
 * Manual plan switch for LOCAL TESTING when Stripe isn't configured. Refuses
 * unless BOTH conditions hold, so it can never become a production self-upgrade
 * hole even if one is misconfigured:
 *   1. NODE_ENV !== "production", AND
 *   2. POLYSHIELD_ALLOW_MANUAL_PLAN=1 (a server env var an attacker can't set).
 * Note: the dev_set_plan RPC's proof gate blocks a DIRECT external RPC call
 * (without the vault key) but does NOT gate this server action — the server
 * supplies its own proof — so the NODE_ENV + env-flag pair is the real defense
 * against a logged-in user self-upgrading. It only ever changes the caller's
 * own plan.
 */
export async function devSetPlanAction(plan: Plan): Promise<BillingResult> {
  if (process.env.NODE_ENV === "production" || process.env.POLYSHIELD_ALLOW_MANUAL_PLAN !== "1") {
    return { error: "Manual plan switching is disabled on this deployment." };
  }
  if (!["free", "builder", "team", "enterprise"].includes(plan)) {
    return { error: "Unknown plan." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const { data, error } = await supabase.rpc("dev_set_plan", {
    p_user_id: user.id,
    p_plan: plan,
    p_proof: gatewayProof(),
  });
  if (error || data !== true) {
    return { error: "Could not change the plan (check migration 0014 is applied and the vault key is set)." };
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
