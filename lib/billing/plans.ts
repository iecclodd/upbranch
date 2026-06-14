import type { Plan } from "@/lib/dashboard/types";

/**
 * Billing tiers. Free is default; Builder and Team are sold via Stripe;
 * Enterprise is sales-led. Each paid tier maps to a Stripe Price ID supplied
 * via env (one per plan), so swapping prices never needs a code change.
 */
export interface BillingTier {
  plan: Plan;
  name: string;
  priceLabel: string;
  priceEnv?: string; // env var holding the Stripe price id
  blurb: string;
  features: string[];
  cta: "current" | "checkout" | "contact";
}

export const BILLING_TIERS: BillingTier[] = [
  {
    plan: "free",
    name: "Free",
    priceLabel: "$0",
    blurb: "For a solo developer wiring up their first local MCP.",
    features: ["1 agent", "1 runner", "Manual approvals", "Regex shield", "7-day logs"],
    cta: "current",
  },
  {
    plan: "builder",
    name: "Builder",
    priceLabel: "$20/mo",
    priceEnv: "STRIPE_PRICE_BUILDER",
    blurb: "AI risk analysis, undo, and the sandbox for serious daily use.",
    features: [
      "5 agents · unlimited runners",
      "AI risk summaries + policy drafting",
      "Sandbox: snapshots, dry-run, scoping",
      "Offline / privacy mode",
      "30-day logs",
    ],
    cta: "checkout",
  },
  {
    plan: "team",
    name: "Team",
    priceLabel: "$80/mo",
    priceEnv: "STRIPE_PRICE_TEAM",
    blurb: "Shared policies, Slack approvals, and audit export for a team.",
    features: [
      "50 agents",
      "Slack / mobile approvals",
      "Shared policy packs",
      "Audit export (SOC 2 evidence)",
      "Priority support",
    ],
    cta: "checkout",
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    blurb: "SSO, on-prem runners, and compliance review.",
    features: ["Unlimited everything", "SSO / SAML", "Self-hosted control plane", "DPA + compliance"],
    cta: "contact",
  },
];

/** Stripe price id → internal plan, read from env at runtime. */
export function priceToPlan(priceId: string | null | undefined): Plan {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_BUILDER) return "builder";
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team";
  return "free";
}

export function planPriceId(plan: Plan): string | undefined {
  if (plan === "builder") return process.env.STRIPE_PRICE_BUILDER;
  if (plan === "team") return process.env.STRIPE_PRICE_TEAM;
  return undefined;
}
