"use client";

import { useMemo } from "react";
import { Bot, Check, X } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  EmptyState,
  GlassCard,
  PageHeader,
  Pill,
  TimeAgo,
} from "@/components/dashboard/primitives";

export default function ApprovalsPage() {
  const { state, approve, deny } = useDashboard();

  const serverNames = useMemo(
    () => new Map(state.servers.map((s) => [s.id, s.name])),
    [state.servers],
  );

  const pending = state.approvals.filter((a) => a.status === "pending");
  const decided = state.approvals.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Approval Queue"
        description="Risky actions are held here before anything reaches a real API. Approving forwards the call to the source MCP; denying returns a refusal to the agent."
      />

      {pending.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          body="When a tool call matches a require_approval policy, it lands here and the agent waits. Hit Run demo to see it happen."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {pending.map((approval) => (
            <GlassCard key={approval.id} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-base font-semibold text-foreground">
                  {approval.exposedTool}
                </p>
                <Pill label="waiting for approval" tone="review" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-mono text-[13px]">{approval.agent}</span>
                </span>
                <span>{serverNames.get(approval.serverId)}</span>
                <span>
                  <TimeAgo ts={approval.requestedAt} />
                </span>
              </div>
              <div className="mt-4 rounded-xl bg-ink p-4">
                <p className="text-xs text-white/45">Arguments</p>
                <pre className="mt-1.5 overflow-x-auto font-mono text-xs leading-5 text-white/90">
                  {JSON.stringify(approval.args, null, 2)}
                </pre>
              </div>
              <p className="mt-4 text-sm leading-6 text-foreground/80">
                <span className="font-semibold text-foreground">Reason: </span>
                {approval.reason}
              </p>
              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => approve(approval.id)}
                  className="flex items-center gap-1.5 rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-violet-deep"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => deny(approval.id)}
                  className="flex items-center gap-1.5 rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Deny
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {decided.length > 0 ? (
        <div>
          <h2 className="font-semibold text-foreground">Recent decisions</h2>
          <GlassCard className="mt-4 divide-y divide-ink/5">
            {decided.map((approval) => (
              <div
                key={approval.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[13px] font-semibold text-foreground">
                    {approval.exposedTool}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approval.agent} · decided by {approval.approver}
                    {approval.decidedVia ? ` via ${approval.decidedVia}` : ""} ·{" "}
                    <TimeAgo ts={approval.decidedAt ?? approval.requestedAt} />
                  </p>
                </div>
                <Pill
                  label={approval.status}
                  tone={approval.status === "approved" ? "good" : "bad"}
                />
              </div>
            ))}
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
