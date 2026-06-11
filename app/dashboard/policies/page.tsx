import {
  currentProjectId,
  listPolicies,
  listServers,
  listTools,
} from "@/lib/db/repository";
import {
  EmptyState,
  GlassCard,
  PageHeader,
  StatusBadge,
} from "@/components/dashboard/primitives";
import { DeletePolicyButton, PolicySelect } from "@/components/dashboard/interactive";
import { AddPolicyButton } from "@/components/dashboard/add-policy-dialog";
import { decisionTone } from "@/lib/dashboard/tones";
import type { PolicyDecision } from "@/lib/dashboard/types";

const summary: Record<PolicyDecision, string> = {
  allow: "Forwarded to the source MCP immediately. Logged.",
  require_approval: "Held in the queue until a human decides. Logged.",
  deny: "Never forwarded. The agent receives a denial. Logged.",
};

export default async function PoliciesPage() {
  const projectId = await currentProjectId();
  const [servers, policies, tools] = await Promise.all([
    listServers(projectId),
    listPolicies(projectId),
    listTools(projectId),
  ]);
  const serverNames = Object.fromEntries(servers.map((s) => [s.id, s.name]));
  const toolNames = tools.map((t) => t.exposedName);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Policies"
        description="Deterministic rules evaluated on every tool call. Tools without a policy default to allow; the strictest applicable policy wins."
        action={<AddPolicyButton toolNames={toolNames} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(summary) as PolicyDecision[]).map((decision) => (
          <GlassCard key={decision} className="p-5">
            <StatusBadge label={decision} tone={decisionTone(decision)} />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {summary[decision]}
            </p>
          </GlassCard>
        ))}
      </div>

      {policies.length === 0 ? (
        <EmptyState
          title="No policies yet"
          body="Connect a server — risky tools get auto-gated, and you can tune every decision here."
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1fr_auto_1.3fr_auto] gap-4 border-b border-ink/5 px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <span>Tool</span>
            <span>Source MCP</span>
            <span>Decision</span>
            <span>Description</span>
            <span className="sr-only">Delete</span>
          </div>
          <div className="divide-y divide-ink/5">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="grid grid-cols-1 gap-3 px-6 py-4 transition-colors hover:bg-violet/[0.03] md:grid-cols-[1.4fr_1fr_auto_1.3fr_auto] md:items-center md:gap-4"
              >
                <div className="font-mono text-[13px] font-semibold text-foreground">
                  {policy.exposedTool}
                  {policy.condition ? (
                    <span className="ml-2 rounded bg-ink/[0.06] px-1.5 py-0.5 text-xs font-normal text-foreground/70">
                      {policy.condition}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm text-foreground/80">
                  {serverNames[policy.serverId ?? ""] ?? "—"}
                </div>
                <PolicySelect
                  policyId={policy.id}
                  decision={policy.decision}
                  label={policy.exposedTool}
                />
                <div className="text-sm text-muted-foreground">{policy.description}</div>
                <DeletePolicyButton policyId={policy.id} label={policy.exposedTool} />
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
