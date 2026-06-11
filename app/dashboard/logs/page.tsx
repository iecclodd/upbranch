"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  GlassCard,
  PageHeader,
  Pill,
  TimeAgo,
  decisionTone,
  statusTone,
} from "@/components/dashboard/primitives";
import type { AuditStatus } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ label: string; value: AuditStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Allowed", value: "allowed" },
  { label: "Waiting", value: "waiting_for_approval" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
  { label: "Blocked", value: "blocked" },
];

export default function LogsPage() {
  const { state } = useDashboard();
  const [filter, setFilter] = useState<AuditStatus | "all">("all");

  const serverNames = useMemo(
    () => new Map(state.servers.map((s) => [s.id, s.name])),
    [state.servers],
  );

  const entries =
    filter === "all"
      ? state.audit
      : state.audit.filter((e) => e.status === filter);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit Logs"
        description="Every requested action, the policy decision it hit, and who signed off. Nothing your agent does is off the record."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-ink text-white"
                : "bg-white/70 text-foreground/60 ring-1 ring-ink/10 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <GlassCard className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-6 py-4 font-semibold">Time</th>
              <th className="px-4 py-4 font-semibold">Agent</th>
              <th className="px-4 py-4 font-semibold">Tool</th>
              <th className="px-4 py-4 font-semibold">Source MCP</th>
              <th className="px-4 py-4 font-semibold">Decision</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Approver</th>
              <th className="px-6 py-4 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-muted-foreground"
                >
                  No entries match this filter yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="transition-colors hover:bg-violet/[0.03]"
                >
                  <td className="whitespace-nowrap px-6 py-3.5 text-muted-foreground">
                    <TimeAgo ts={entry.timestamp} />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px] text-foreground/80">
                    {entry.agent}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px] font-semibold text-foreground">
                    {entry.exposedTool}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-foreground/80">
                    {serverNames.get(entry.serverId)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill
                      label={entry.decision}
                      tone={decisionTone(entry.decision)}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill label={entry.status} tone={statusTone(entry.status)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                    {entry.approver ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-6 py-3.5 text-muted-foreground">
                    {entry.reason ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
