import { MfaPanel, SessionsPanel } from "@/components/settings/settings-panels";

export default function SecuritySettingsPage() {
  return (
    <>
      <MfaPanel />
      <SessionsPanel />
    </>
  );
}
