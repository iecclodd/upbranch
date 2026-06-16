import type { ReactNode } from "react";
import { PageHeader } from "@/components/dashboard/primitives";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, security, notifications, and plan."
      />
      <SettingsNav />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
