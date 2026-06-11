import { headers } from "next/headers";
import { Bot } from "lucide-react";
import { getProfile } from "@/lib/auth/session";
import { currentProjectId, getUsage, listAgents } from "@/lib/db/repository";
import { ConnectSnippet } from "@/components/dashboard/connect-snippet";
import {
  EmptyState,
  GlassCard,
  PageHeader,
  StatusBadge,
  TimeAgo,
} from "@/components/dashboard/primitives";
import {
  CreateAgentButton,
  DeleteAgentButton,
} from "@/components/dashboard/create-agent-dialog";
import { PLAN_LIMITS } from "@/lib/dashboard/types";

export default async function AgentsPage() {
  const projectId = await currentProjectId();
  const [profile, agents, usage, headerList] = await Promise.all([
    getProfile(),
    listAgents(projectId),
    getUsage(projectId),
    headers(),
  ]);

  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const gatewayUrl = `${proto}://${host}/api/mcp`;

  const limit = PLAN_LIMITS[profile?.plan ?? "free"].agents;
  const atLimit = Number.isFinite(limit) && usage.agents >= limit;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agents"
        description="Each agent connects to the Polyshield MCP server with its own key. Polyshield enforces policy on every call it makes."
        action={<CreateAgentButton disabled={atLimit} />}
      />

      <GlassCard className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
          Connect an agent
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Point your agent&apos;s MCP config at Polyshield and pass its key. Tool
          names arrive namespaced — <span className="font-mono text-xs">github.list_issues</span>{" "}
          is exposed as <span className="font-mono text-xs">github_list_issues</span>.
        </p>
        <div className="mt-3">
          <ConnectSnippet gatewayUrl={gatewayUrl} />
        </div>
      </GlassCard>

      {atLimit ? (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          You&apos;ve hit the {limit}-agent limit on the {profile?.plan} plan.{" "}
          <a href="/#pricing" className="font-semibold underline">
            Upgrade
          </a>{" "}
          to add more.
        </div>
      ) : null}

      {agents.length === 0 ? (
        <EmptyState
          title="No agents yet"
          body="Create an agent to get a key. You'll add it to your agent's MCP config to route its tool calls through Polyshield."
          action={<CreateAgentButton disabled={atLimit} />}
        />
      ) : (
        <GlassCard className="divide-y divide-ink/5">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-4 px-6 py-4">
              <span className="inline-flex rounded-xl bg-violet/10 p-2.5">
                <Bot className="h-4 w-4 text-violet" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{agent.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  psk_live_••••{agent.keyPreview}
                </p>
              </div>
              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                Last seen <TimeAgo ts={agent.lastSeenAt} />
              </div>
              <StatusBadge
                label={agent.status}
                tone={agent.status === "active" ? "good" : "neutral"}
              />
              <DeleteAgentButton agentId={agent.id} name={agent.name} />
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
