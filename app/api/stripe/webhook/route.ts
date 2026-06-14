import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { priceToPlan } from "@/lib/billing/plans";
import { gatewayClient } from "@/lib/gateway/db";
import { gatewayProof } from "@/lib/gateway/proof";

/**
 * Stripe webhook. Two non-negotiables (App Router):
 *  - read the RAW body via req.text() — re-serializing breaks the HMAC.
 *  - run on the Node runtime so the sync constructEvent works.
 * Plan sync goes through the proof-gated billing_sync RPC (no service-role
 * key in this project); only our server can derive the proof.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  // Basil/Dahlia moved current_period_end onto the subscription ITEM.
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  const priceId = item?.price?.id ?? null;
  const active = sub.status === "active" || sub.status === "trialing";
  const plan = active ? priceToPlan(priceId) : "free";

  const db = gatewayClient();
  await db.rpc("billing_sync", {
    p_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    p_subscription_id: sub.id,
    p_price_id: priceId,
    p_plan: plan,
    p_status: sub.status,
    p_period_end: periodEnd ? periodEnd.toISOString() : null,
    p_cancel_at_period_end: sub.cancel_at_period_end ?? false,
    p_proof: gatewayProof(),
  });
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Stripe webhook not configured.", { status: 500 });
  }
  const body = await req.text(); // RAW — do not parse
  const sig = req.headers.get("stripe-signature") ?? "";

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return new Response(`Webhook signature error: ${err instanceof Error ? err.message : "bad"}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch {
    // 500 → Stripe retries.
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
