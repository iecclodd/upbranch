import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { ensureProject } from "@/lib/db/repository";
import { PageHeader } from "@/components/dashboard/primitives";
import {
  BillingPanel,
  ConnectionsPanel,
  MfaPanel,
  PrivacyPanel,
} from "@/components/settings/settings-panels";

export default async function SettingsPage() {
  const [profile, project, supabase] = await Promise.all([
    getProfile(),
    ensureProject(),
    createClient(),
  ]);

  const { data: proj } = await supabase
    .from("projects")
    .select("slack_webhook_ciphertext")
    .eq("id", project.id)
    .maybeSingle();
  const slackConfigured = Boolean(proj?.slack_webhook_ciphertext);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your plan, account security, privacy, and connections."
      />

      <BillingPanel
        plan={profile?.plan ?? "free"}
        hasBilling={profile?.hasBilling ?? false}
        periodEnd={profile?.currentPeriodEnd ?? null}
      />
      <MfaPanel />
      <PrivacyPanel initialEnabled={project.privacyMode} />
      <ConnectionsPanel slackConfigured={slackConfigured} />
    </div>
  );
}
