"use client";

import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  GlassCard,
  PageHeader,
  Pill,
  decisionTone,
} from "@/components/dashboard/primitives";
import type { PolicyDecision } from "@/lib/dashboard/types";

const DECISIONS: PolicyDecision[] = ["allow", "require_approval", "deny"];

export default function PoliciesPage() {
  const { state, setPolicyDecision } = useDashboard();

  const serverNames = useMemo(
    () => new Map(state.servers.map((s) => [s.id, s.name])),
    [state.servers],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Policies"
        description="Deterministic rules evaluated on every tool call. Tools without an explicit policy default to allow — add a policy to tighten them."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {DECISIONS.map((decision) => (
          <GlassCard key={decision} className="p-5">
            <Pill label={decision} tone={decisionTone(decision)} />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {decision === "allow" &&
                "Forwarded to the source MCP immediately. Logged."}
              {decision === "require_approval" &&
                "Held in the Approval Queue until a human decides. Logged."}
              {decision === "deny" &&
                "Never forwarded. The agent receives a denial. Logged."}
            </p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-6 py-4 font-semibold">Tool</th>
              <th className="px-4 py-4 font-semibold">Source MCP</th>
              <th className="px-4 py-4 font-semibold">Decision</th>
              <th className="px-4 py-4 font-semibold">Condition</th>
              <th className="px-6 py-4 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {state.policies.map((policy) => (
              <tr
                key={policy.id}
                className="transition-colors hover:bg-violet/[0.03]"
              >
                <td className="px-6 py-3.5 font-mono text-[13px] font-semibold text-foreground">
                  {policy.exposedTool}
                </td>
                <td className="px-4 py-3.5 text-foreground/80">
                  {serverNames.get(policy.serverId)}
                </td>
                <td className="px-4 py-3.5">
                  <select
                    value={policy.decision}
                    onChange={(e) =>
                      setPolicyDecision(
                        policy.id,
                        e.target.value as PolicyDecision,
                      )
                    }
                    aria-label={`Decision for ${policy.exposedTool}`}
                    className="rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-sm font-medium text-foreground outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10"
                  >
                    {DECISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3.5">
                  {policy.condition ? (
                    <code className="rounded bg-ink/5 px-2 py-1 font-mono text-xs text-foreground/80">
                      {policy.condition}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="max-w-sm px-6 py-3.5 text-muted-foreground">
                  {policy.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
