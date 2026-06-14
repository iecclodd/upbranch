import Stripe from "stripe";

/**
 * Server-only Stripe client, constructed LAZILY. Importing this module must
 * never throw when STRIPE_SECRET_KEY is unset — otherwise any page whose module
 * graph happens to pull in billing code (e.g. /dashboard/settings, which hosts
 * the sign-out button) fails to render on an unconfigured deploy. Only
 * getStripe() can throw, and only when billing is actually exercised.
 * STRIPE_SECRET_KEY is server-only — never import this from a Client Component.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!_stripe) {
    // Pin the API version so behavior is deterministic across deploys.
    _stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia", typescript: true });
  }
  return _stripe;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
