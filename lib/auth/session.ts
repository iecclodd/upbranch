import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Plan, PlanStatus, Profile } from "@/lib/dashboard/types";

const ms = (t: string | null | undefined): number | null => (t ? Date.parse(t) : null);

/** Current signed-in user, or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Current user's profile, or null if signed out. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, plan, plan_status, current_period_end, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!data) {
    return {
      id: user.id,
      email: user.email ?? null,
      fullName: (user.user_metadata?.full_name as string) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
      plan: "free",
      planStatus: "active",
      currentPeriodEnd: null,
      hasBilling: false,
    };
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    plan: (data.plan as Plan) ?? "free",
    planStatus: (data.plan_status as PlanStatus) ?? "active",
    currentPeriodEnd: ms(data.current_period_end),
    hasBilling: Boolean(data.stripe_customer_id),
  };
}

/** Profile or redirect to /signin. Use at the top of protected pages. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/signin");
  return profile;
}
