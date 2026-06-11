import { Bot } from "lucide-react";
import { currentProjectId, listApprovals, listServers } from "@/lib/db/repository";
import {
  EmptyState,
  GlassCard,
  PageHeader,
  StatusBadge,
  TimeAgo,
} from "@/components/dashboard/primitives";
import { ApprovalActions } from "@/components/dashboard/interactive";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";

export default async function ApprovalsPage() {
  const projectId = await currentProjectId();
  const [servers, approvals] = await Promise.all([
    listServers(projectId),
    listApprovals(projectId),
  ]);
  const serverNames = Object.fromEntries(servers.map((s) => [s.id, s.name]));
  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-8">
      <AutoRefresh />
      <PageHeader
        title="Approval Queue"
        description="Risky actions wait here before reaching a real API. Approving forwards the call; denying returns a refusal to the agent."
      />

      {pending.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          body="When a call matches a require_approval policy, it lands here and the agent waits for your decision."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {pending.map((approval) => (
            <GlassCard key={approval.id} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-base font-semibold text-foreground">
                  {approval.exposedTool}
                </p>
                <StatusBadge label="waiting for approval" tone="review" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-mono text-[13px]">{approval.agent}</span>
                </span>
                <span>{serverNames[approval.serverId]}</span>
                <TimeAgo ts={approval.requestedAt} />
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
              <div className="mt-5">
                <ApprovalActions approvalId={approval.id} />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {decided.length > 0 ? (
        <div>
          <h2 className="font-semibold text-foreground">Recent decisions</h2>
          <GlassCard className="mt-4 divide-y divide-ink/5">
            {decided.slice(0, 10).map((approval) => (
              <div
                key={approval.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[13px] font-semibold text-foreground">
                    {approval.exposedTool}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approval.agent} · {approval.approver ?? "—"}
                    {approval.decidedVia ? ` via ${approval.decidedVia}` : ""} ·{" "}
                    <TimeAgo ts={approval.decidedAt ?? approval.requestedAt} />
                  </p>
                </div>
                <StatusBadge
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
