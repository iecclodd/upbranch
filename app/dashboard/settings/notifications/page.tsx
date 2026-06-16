import { createClient } from "@/lib/supabase/server";
import { ensureProject } from "@/lib/db/repository";
import { getProfile } from "@/lib/auth/session";
import { planAllows } from "@/lib/billing/plans";
import { NotificationsPanel } from "@/components/settings/settings-panels";

export default async function NotificationsSettingsPage() {
  const [profile, project, supabase] = await Promise.all([
    getProfile(),
    ensureProject(),
    createClient(),
  ]);

  // select("*") so this still renders gracefully if migration 0013 (the extra
  // channel columns) hasn't been applied yet — missing columns are just absent.
  const { data: proj } = await supabase
    .from("projects")
    .select("*")
    .eq("id", project.id)
    .maybeSingle();

  const configured = {
    slack: Boolean(proj?.slack_webhook_ciphertext),
    discord: Boolean(proj?.discord_webhook_ciphertext),
    telegram: Boolean(proj?.telegram_ciphertext),
    webhook: Boolean(proj?.webhook_ciphertext),
  };

  return (
    <NotificationsPanel
      configured={configured}
      canUse={planAllows(profile?.plan ?? "free", "notifications")}
    />
  );
}
