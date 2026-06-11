import { Globe, TerminalSquare } from "lucide-react";
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
  decisionTone,
} from "@/components/dashboard/primitives";
import { ToolToggle } from "@/components/dashboard/interactive";
import { resolvePolicy } from "@/lib/dashboard/seed";

export default async function ToolsPage() {
  const projectId = await currentProjectId();
  const [servers, tools, policies] = await Promise.all([
    listServers(projectId),
    listTools(projectId),
    listPolicies(projectId),
  ]);

  const exposedCount = tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tool Catalog"
        description={`Your agent connects to one MCP server — Polyshield — and sees ${exposedCount} exposed tools, not the raw downstream tools.`}
      />

      {tools.length === 0 ? (
        <EmptyState
          title="No tools discovered yet"
          body="Connect an MCP server and Polyshield will list its tools here, grouped by source."
        />
      ) : (
        <div className="space-y-5">
          {servers.map((server) => {
            const serverTools = tools.filter((t) => t.serverId === server.id);
            if (serverTools.length === 0) return null;
            return (
              <GlassCard key={server.id} className="overflow-hidden">
                <div className="flex items-center gap-2.5 border-b border-ink/5 px-6 py-4">
                  <span className="inline-flex rounded-lg bg-violet/10 p-2">
                    {server.transport.type === "stdio" ? (
                      <TerminalSquare className="h-4 w-4 text-violet" aria-hidden="true" />
                    ) : (
                      <Globe className="h-4 w-4 text-violet" aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <h2 className="font-semibold text-foreground">{server.name}</h2>
                    <p className="font-mono text-xs text-muted-foreground">
                      {server.prefix}.*
                    </p>
                  </div>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {serverTools.filter((t) => t.enabled).length}/{serverTools.length} exposed
                  </span>
                </div>
                <div className="divide-y divide-ink/5">
                  {serverTools.map((tool) => {
                    const { decision, policy } = resolvePolicy(policies, tool.exposedName);
                    return (
                      <div
                        key={tool.id}
                        className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-violet/[0.03]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-[13px] font-semibold text-foreground">
                              {tool.exposedName}
                            </p>
                            <span className="font-mono text-xs text-muted-foreground">
                              ← {tool.rawName}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {tool.rawDescription}
                          </p>
                        </div>
                        <StatusBadge
                          label={policy ? decision : `${decision} (default)`}
                          tone={decisionTone(decision)}
                          className="hidden shrink-0 sm:inline-flex"
                        />
                        <ToolToggle
                          toolId={tool.id}
                          enabled={tool.enabled}
                          label={tool.exposedName}
                        />
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
