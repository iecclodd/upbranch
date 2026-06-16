import { getProfile } from "@/lib/auth/session";
import { ensureProject } from "@/lib/db/repository";
import { planAllows } from "@/lib/billing/plans";
import { AccountPanel, PrivacyPanel } from "@/components/settings/settings-panels";

export default async function GeneralSettingsPage() {
  const [profile, project] = await Promise.all([getProfile(), ensureProject()]);

  return (
    <>
      <AccountPanel
        email={profile?.email ?? null}
        fullName={profile?.fullName ?? null}
        avatarUrl={profile?.avatarUrl ?? null}
      />
      <PrivacyPanel
        initialEnabled={project.privacyMode}
        canUse={planAllows(profile?.plan ?? "free", "privacy_mode")}
      />
    </>
  );
}
