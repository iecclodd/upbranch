import { createClient } from "@/lib/supabase/server";
import { stripeConfigured } from "@/lib/stripe";
import { BillingManager } from "@/components/settings/billing-manager";
import type { Plan, PlanStatus } from "@/lib/dashboard/types";

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // /dashboard is auth-gated by middleware; satisfy TS

  const { data } = await supabase
    .from("profiles")
    .select("plan, plan_status, current_period_end, cancel_at_period_end, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <BillingManager
      plan={(data?.plan as Plan) ?? "free"}
      planStatus={(data?.plan_status as PlanStatus) ?? "active"}
      periodEnd={data?.current_period_end ? Date.parse(data.current_period_end) : null}
      cancelAtPeriodEnd={Boolean(data?.cancel_at_period_end)}
      hasBilling={Boolean(data?.stripe_customer_id)}
      stripeReady={stripeConfigured()}
      allowManualPlan={
        process.env.NODE_ENV !== "production" && process.env.POLYSHIELD_ALLOW_MANUAL_PLAN === "1"
      }
    />
  );
}
