import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { currentProjectId, listApprovals } from "@/lib/db/repository";
import { Logo } from "@/components/landing/logo";
import { Dock } from "@/components/dashboard/dock";
import { AccountMenu } from "@/components/dashboard/account-menu";

export const metadata: Metadata = {
  title: "Dashboard — Polyshield",
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const profile = await requireProfile();
  const projectId = await currentProjectId();
  const approvals = await listApprovals(projectId);
  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-[radial-gradient(60%_40%_at_80%_-10%,rgba(201,167,255,0.2),transparent_70%),radial-gradient(40%_30%_at_10%_-5%,rgba(232,92,158,0.08),transparent_70%)]">
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <AccountMenu
            email={profile.email}
            fullName={profile.fullName}
            avatarUrl={profile.avatarUrl}
            plan={profile.plan}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-8">{children}</main>

      <Dock pendingCount={pendingCount} />
    </div>
  );
}
