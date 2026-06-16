"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, CreditCard, Loader2, Sparkles, X } from "lucide-react";
import {
  cancelSubscriptionAction,
  devSetPlanAction,
  openBillingPortalAction,
  resumeSubscriptionAction,
  startCheckoutAction,
} from "@/app/dashboard/billing-actions";
import { GlassCard } from "@/components/dashboard/primitives";
import { BILLING_TIERS, billingTier } from "@/lib/billing/plans";
import type { Plan, PlanStatus } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export interface BillingManagerProps {
  plan: Plan;
  planStatus: PlanStatus;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  hasBilling: boolean;
  stripeReady: boolean;
  allowManualPlan: boolean;
}

const STATUS_TONE: Record<PlanStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  trialing: "bg-violet/10 text-violet",
  past_due: "bg-rose-500/10 text-rose-700",
  canceled: "bg-ink/10 text-foreground/60",
};

export function BillingManager(props: BillingManagerProps) {
  const { plan, planStatus, periodEnd, cancelAtPeriodEnd, hasBilling, stripeReady, allowManualPlan } = props;
  const tier = billingTier(plan);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  function portal() {
    setError(null);
    start(async () => {
      const r = await openBillingPortalAction();
      if (r.error) return setError(r.error);
      if (r.url) window.location.href = r.url;
    });
  }
  function setCancel(cancel: boolean) {
    setError(null);
    start(async () => {
      const r = cancel ? await cancelSubscriptionAction() : await resumeSubscriptionAction();
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{tier.name}</h2>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_TONE[planStatus])}>
                {planStatus.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{tier.tagline}</p>
            <p className="mt-2 text-sm text-foreground/70">
              <span className="text-2xl font-semibold text-foreground">{tier.priceLabel}</span>
              {tier.priceSuffix ? <span className="text-muted-foreground">{tier.priceSuffix}</span> : null}
            </p>
            {periodEnd ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {cancelAtPeriodEnd ? "Ends" : "Renews"} {new Date(periodEnd).toLocaleDateString()}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowPlans(true)}
            className="rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-deep"
          >
            {plan === "free" ? "Upgrade plan" : "Change plan"}
          </button>
        </div>

        {cancelAtPeriodEnd ? (
          <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your plan is set to end on {periodEnd ? new Date(periodEnd).toLocaleDateString() : "the period end"}. You
            keep access until then.
          </div>
        ) : null}

        {hasBilling ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/5 pt-5">
            <button
              type="button"
              onClick={portal}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5 disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Payment & invoices
            </button>
            {cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={() => setCancel(false)}
                disabled={pending}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground hover:bg-ink/5 disabled:opacity-60"
              >
                Resume plan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCancel(true)}
                disabled={pending}
                className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
              >
                Cancel plan
              </button>
            )}
          </div>
        ) : null}

        {!stripeReady ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Checkout isn&apos;t configured on this deployment yet. See{" "}
            <Link href="/pricing" className="font-medium text-violet hover:underline">
              plans &amp; pricing
            </Link>
            .
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </GlassCard>

      {allowManualPlan ? <ManualPlanSwitch current={plan} /> : null}

      {showPlans ? (
        <PlanChangeModal current={plan} stripeReady={stripeReady} onClose={() => setShowPlans(false)} />
      ) : null}
    </div>
  );
}

function PlanChangeModal({
  current,
  stripeReady,
  onClose,
}: {
  current: Plan;
  stripeReady: boolean;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);

  function checkout(target: Plan) {
    setError(null);
    setBusyPlan(target);
    start(async () => {
      const r = await startCheckoutAction(target);
      setBusyPlan(null);
      if (r.error) return setError(r.error);
      if (r.url) window.location.href = r.url;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Choose a plan</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-foreground/60 hover:bg-ink/5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {BILLING_TIERS.map((tier) => {
            const isCurrent = tier.plan === current;
            return (
              <div
                key={tier.plan}
                className={cn(
                  "flex flex-col rounded-2xl border p-4",
                  tier.highlight ? "border-violet/40 bg-violet/[0.03]" : "border-ink/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{tier.name}</p>
                  {isCurrent ? (
                    <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[11px] font-semibold text-violet">
                      current
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {tier.priceLabel}
                  {tier.priceSuffix ? (
                    <span className="text-xs font-normal text-muted-foreground">{tier.priceSuffix}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{tier.tagline}</p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-foreground/75">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-violet" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <span className="block text-center text-xs text-muted-foreground">Your plan</span>
                  ) : tier.cta === "contact" ? (
                    <a
                      href="mailto:hello@polyshield.ai?subject=Polyshield%20Enterprise"
                      className="block rounded-full border border-ink/15 py-2 text-center text-sm font-semibold text-foreground transition-colors hover:bg-ink/5"
                    >
                      Contact us
                    </a>
                  ) : tier.plan === "free" ? (
                    <span className="block text-center text-xs text-muted-foreground">
                      Downgrade from billing portal
                    </span>
                  ) : stripeReady ? (
                    <button
                      type="button"
                      onClick={() => checkout(tier.plan)}
                      disabled={pending}
                      className="w-full rounded-full bg-violet py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
                    >
                      {busyPlan === tier.plan ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        "Choose"
                      )}
                    </button>
                  ) : (
                    <span className="block text-center text-xs text-muted-foreground">Checkout not configured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Local-only plan switcher (POLYSHIELD_ALLOW_MANUAL_PLAN=1) for testing perks without Stripe. */
function ManualPlanSwitch({ current }: { current: Plan }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const plans: Plan[] = ["free", "builder", "team", "enterprise"];

  function set(plan: Plan) {
    setMsg(null);
    start(async () => {
      const r = await devSetPlanAction(plan);
      setMsg(r.error ?? `Switched to ${plan}.`);
    });
  }

  return (
    <GlassCard className="border border-dashed border-violet/30 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="font-semibold text-foreground">Testing — switch plan</h2>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          local only
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Stripe isn&apos;t needed — flip your own plan to verify each tier&apos;s perks. Enabled by
        <code className="mx-1 rounded bg-ink/5 px-1 py-0.5 text-xs">POLYSHIELD_ALLOW_MANUAL_PLAN=1</code>
        and disabled in production.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {plans.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set(p)}
            disabled={pending || p === current}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-colors disabled:opacity-50",
              p === current ? "border-violet/40 bg-violet/10 text-violet" : "border-ink/15 text-foreground hover:bg-ink/5",
            )}
          >
            {p}
          </button>
        ))}
      </div>
      {msg ? <p className="mt-2 text-sm text-muted-foreground">{msg}</p> : null}
    </GlassCard>
  );
}
