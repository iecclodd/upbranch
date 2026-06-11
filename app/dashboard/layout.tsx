import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard — Polyshield",
  description:
    "See connected MCP servers, exposed tools, policies, approvals, and audit logs for AI agent tool requests.",
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <DashboardShell>{children}</DashboardShell>;
}
