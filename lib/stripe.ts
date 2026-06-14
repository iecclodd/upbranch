import Stripe from "stripe";

/**
 * Server-only Stripe client. Pinned to the SDK's current dated API version so
 * behavior is deterministic across deploys. STRIPE_SECRET_KEY is server-only —
 * never import this from a Client Component.
 */
// Pin the API version so behavior is deterministic across deploys.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
