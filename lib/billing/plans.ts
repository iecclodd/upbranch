import type { Plan } from "@/lib/dashboard/types";
import { PLAN_LIMITS } from "@/lib/dashboard/types";

/**
 * The single source of truth for plans, pricing, perks, and feature gating.
 *
 * Everything that mentions a price or a perk — the marketing landing page, the
 * dedicated /pricing page, the in-app billing summary, and the server-side
 * gates that decide whether a paid feature runs — reads from THIS file. There
 * is no second copy to drift out of sync.
 *
 * Free is the default. Builder and Team are sold via Stripe (one Price ID per
 * plan, supplied by env, so swapping prices never touches code). Enterprise is
 * sales-led.
 */

// ----------------------------------------------------------------------------
// Feature gating
// ----------------------------------------------------------------------------

/** A capability that is unlocked by plan tier. Checked server-side only. */
export type PlanFeature =
  | "ai" // AI copilot: approval review, plain-English policy drafting, audit digest
  | "privacy_mode" // offline / privacy mode (redact tool args+results from logs)
  | "notifications" // Slack / Discord / Telegram / webhook approval alerts
  | "sandbox_advanced" // snapshots + undo, dry-run diffs, container isolation
  | "shared_policies" // shared policy packs across a team
  | "audit_export" // JSON/CSV audit export (SOC 2 evidence)
  | "multiple_approvers" // more than one human can clear approvals
  | "sso"; // SSO / SAML / RBAC

const PLAN_FEATURES: Record<Plan, PlanFeature[]> = {
  free: [],
  builder: ["ai", "privacy_mode", "notifications", "sandbox_advanced"],
  team: [
    "ai",
    "privacy_mode",
    "notifications",
    "sandbox_advanced",
    "shared_policies",
    "audit_export",
    "multiple_approvers",
  ],
  enterprise: [
    "ai",
    "privacy_mode",
    "notifications",
    "sandbox_advanced",
    "shared_policies",
    "audit_export",
    "multiple_approvers",
    "sso",
  ],
};

const PLAN_RANK: Record<Plan, number> = { free: 0, builder: 1, team: 2, enterprise: 3 };

export function planRank(plan: Plan): number {
  return PLAN_RANK[plan] ?? 0;
}

/** Whether a plan unlocks a feature. The only authority for paid-feature gates. */
export function planAllows(plan: Plan, feature: PlanFeature): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

/** The cheapest plan that unlocks a feature — used to render upgrade prompts. */
export function minPlanFor(feature: PlanFeature): Plan {
  const order: Plan[] = ["free", "builder", "team", "enterprise"];
  return order.find((p) => planAllows(p, feature)) ?? "enterprise";
}

/** Human-readable, capitalized plan name (for upgrade copy). */
export function planLabel(plan: Plan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ----------------------------------------------------------------------------
// Pricing tiers (marketing + billing)
// ----------------------------------------------------------------------------

export interface BillingTier {
  plan: Plan;
  name: string;
  /** Display price, e.g. "$0", "$29", "Custom". */
  priceLabel: string;
  /** Suffix shown next to the price, e.g. "/mo". Omitted for Custom. */
  priceSuffix?: string;
  /** Env var holding this plan's Stripe Price ID (paid self-serve plans only). */
  priceEnv?: string;
  tagline: string;
  /** The headline perks, written for both the landing page and the app. */
  features: string[];
  /** Visually emphasized as the recommended plan. */
  highlight?: boolean;
  cta: "current" | "checkout" | "contact";
}

export const BILLING_TIERS: BillingTier[] = [
  {
    plan: "free",
    name: "Free",
    priceLabel: "$0",
    priceSuffix: "/mo",
    tagline: "For a solo developer wiring up their first local MCP server.",
    features: [
      "1 project · 1 agent · 1 runner",
      "3 connected tools",
      "100 protected actions / mo",
      "Deterministic policy engine + approvals",
      "Prompt-injection shield",
      "Basic sandbox scoping",
      "7-day audit logs",
      "Community support",
    ],
    cta: "checkout",
  },
  {
    plan: "builder",
    name: "Builder",
    priceLabel: "$29",
    priceSuffix: "/mo",
    priceEnv: "STRIPE_PRICE_BUILDER",
    tagline: "For builders giving coding agents real local power, safely.",
    features: [
      "5 agents · unlimited runners",
      "10 connected tools",
      "5,000 protected actions / mo",
      "AI copilot — approval review, policy drafting & audit digest",
      "Full sandbox — snapshots, undo, dry-run diffs & container isolation",
      "Offline / privacy mode",
      "Slack, Discord & Telegram approvals",
      "MCP registry & one-click hardening",
      "30-day audit logs",
      "Email support",
    ],
    highlight: true,
    cta: "checkout",
  },
  {
    plan: "team",
    name: "Team",
    priceLabel: "$149",
    priceSuffix: "/mo",
    priceEnv: "STRIPE_PRICE_TEAM",
    tagline: "For teams letting agents touch shared repos and systems.",
    features: [
      "Unlimited agents & tools",
      "50,000 protected actions / mo",
      "Everything in Builder",
      "Shared policy packs",
      "Multiple approvers",
      "Audit export (SOC 2 evidence)",
      "1-year audit retention",
      "Priority support",
    ],
    cta: "checkout",
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    tagline: "For companies running agents against production systems.",
    features: [
      "Unlimited everything",
      "SSO / SAML & RBAC",
      "Self-hosted / on-prem runners",
      "Custom data retention",
      "DPA + compliance review",
      "Dedicated support & SLA",
    ],
    cta: "contact",
  },
];

export function billingTier(plan: Plan): BillingTier {
  return BILLING_TIERS.find((t) => t.plan === plan) ?? BILLING_TIERS[0];
}

/** The usage limits attached to a plan (agents, tools, actions). */
export function planLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

// ----------------------------------------------------------------------------
// Stripe price <-> plan mapping (read from env at runtime)
// ----------------------------------------------------------------------------

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
