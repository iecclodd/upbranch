import {
  currentProjectId,
  listPolicies,
  listServers,
  listTools,
} from "@/lib/db/repository";
import { EmptyState, PageHeader } from "@/components/dashboard/primitives";
import { resolveDisplayPolicy } from "@/lib/gateway/policy";
import { ToolCatalog, type CatalogGroup } from "@/components/dashboard/tool-catalog";

export default async function ToolsPage() {
  const projectId = await currentProjectId();
  const [servers, tools, policies] = await Promise.all([
    listServers(projectId),
    listTools(projectId),
    listPolicies(projectId),
  ]);

  const exposedCount = tools.filter((t) => t.enabled).length;

  const groups: CatalogGroup[] = servers
    .map((server) => ({
      serverId: server.id,
      serverName: server.name,
      prefix: server.prefix,
      transportType: server.transport.type,
      tools: tools
        .filter((t) => t.serverId === server.id)
        .map((tool) => {
          const { decision, policy } = resolveDisplayPolicy(policies, tool.exposedName);
          return {
            id: tool.id,
            exposedName: tool.exposedName,
            rawName: tool.rawName,
            rawDescription: tool.rawDescription,
            enabled: tool.enabled,
            risk: tool.risk,
            riskDetail: tool.riskDetail,
            decision,
            hasPolicy: Boolean(policy),
          };
        }),
    }))
    .filter((g) => g.tools.length > 0);

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
        <ToolCatalog groups={groups} />
      )}
    </div>
  );
}
