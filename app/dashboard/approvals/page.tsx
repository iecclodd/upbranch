import { getProfile } from "@/lib/auth/session";
import { currentProjectId, listApprovals, listServers } from "@/lib/db/repository";
import {
  EmptyState,
  GlassCard,
  PageHeader,
  StatusBadge,
  TimeAgo,
} from "@/components/dashboard/primitives";
import { ApprovalCard } from "@/components/dashboard/approval-card";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";

export default async function ApprovalsPage() {
  const projectId = await currentProjectId();
  const [servers, approvals, profile] = await Promise.all([
    listServers(projectId),
    listApprovals(projectId),
    getProfile(),
  ]);
  const aiEnabled = (profile?.plan ?? "free") !== "free";
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
            <ApprovalCard
              key={approval.id}
              approval={approval}
              serverName={serverNames[approval.serverId] ?? "—"}
              aiEnabled={aiEnabled}
            />
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
