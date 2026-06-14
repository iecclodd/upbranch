import { headers } from "next/headers";
import { Globe, Lock, Plug, TerminalSquare } from "lucide-react";
import {
  currentProjectId,
  listRunners,
  listServers,
  listSnapshots,
  listTools,
} from "@/lib/db/repository";
import {
  EmptyState,
  GlassCard,
  MetaChip,
  PageHeader,
  StatusBadge,
  TimeAgo,
  type Tone,
} from "@/components/dashboard/primitives";
import {
  AddServerButton,
  DeleteServerButton,
} from "@/components/dashboard/add-server-dialog";
import { ShieldModeSelect } from "@/components/dashboard/interactive";
import { RunnersCard } from "@/components/dashboard/runners";
import { SandboxButton } from "@/components/dashboard/sandbox-dialog";
import { SnapshotsCard } from "@/components/dashboard/snapshots";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import type { McpServer, TransportConfig } from "@/lib/dashboard/types";

const statusTones: Record<McpServer["status"], Tone> = {
  connected: "good",
  connecting: "review",
  pending: "review",
  error: "bad",
};

/** Transport summary WITHOUT any secret values — only shapes and key names. */
function TransportSummary({ transport }: { transport: TransportConfig }) {
  if (transport.type === "http") {
    return (
      <div className="mt-3 space-y-1.5">
        <p className="break-all rounded-lg bg-ink/[0.04] px-3 py-2 font-mono text-xs text-foreground/70">
          {transport.endpoint}
        </p>
        {transport.authHeader ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
            Auth stored in vault
          </p>
        ) : null}
      </div>
    );
  }
  const envKeys = Object.keys(transport.env);
  return (
    <div className="mt-3 space-y-1.5">
      <p className="break-all rounded-lg bg-ink/[0.04] px-3 py-2 font-mono text-xs text-foreground/70">
        {transport.command} {transport.args.join(" ")}
        {transport.cwd ? `  (cwd: ${transport.cwd})` : ""}
      </p>
      {envKeys.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
          {envKeys.length} secret{envKeys.length > 1 ? "s" : ""} in vault
        </p>
      ) : null}
    </div>
  );
}

export default async function ServersPage() {
  const projectId = await currentProjectId();
  const [servers, tools, runners, snapshots, headerList] = await Promise.all([
    listServers(projectId),
    listTools(projectId),
    listRunners(projectId),
    listSnapshots(projectId),
    headers(),
  ]);

  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const gatewayOrigin = `${proto}://${host}`;

  const toolCounts = new Map<string, number>();
  for (const t of tools) {
    if (t.enabled) toolCounts.set(t.serverId, (toolCounts.get(t.serverId) ?? 0) + 1);
  }
  const existingPrefixes = servers.map((s) => s.prefix);
  const hasStdioServers = servers.some((s) => s.transport.type === "stdio");

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={8} />
      <PageHeader
        title="MCP Servers"
        description="Downstream servers connected to Polyshield. Your agent only sees the tools you expose, never these directly."
        action={<AddServerButton existingPrefixes={existingPrefixes} />}
      />

      {hasStdioServers || runners.length > 0 ? (
        <RunnersCard
          runners={runners}
          gatewayOrigin={gatewayOrigin}
          hasStdioServers={hasStdioServers}
        />
      ) : null}

      <SnapshotsCard
        snapshots={snapshots}
        serverNames={Object.fromEntries(servers.map((s) => [s.id, s.name]))}
      />

      {servers.length === 0 ? (
        <EmptyState
          title="No servers connected"
          body="Add a local stdio or remote HTTP MCP server. Polyshield will discover its tools and add them to your catalog."
          action={<AddServerButton existingPrefixes={existingPrefixes} />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {servers.map((server) => (
            <GlassCard key={server.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-xl bg-violet/10 p-2.5">
                  {server.transport.type === "stdio" ? (
                    <TerminalSquare className="h-4 w-4 text-violet" aria-hidden="true" />
                  ) : (
                    <Globe className="h-4 w-4 text-violet" aria-hidden="true" />
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge label={server.status} tone={statusTones[server.status]} />
                  <DeleteServerButton serverId={server.id} name={server.name} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h2 className="font-semibold text-foreground">{server.name}</h2>
                <MetaChip label={server.transport.type} />
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {server.description}
              </p>
              <TransportSummary transport={server.transport} />
              <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-sm">
                <span className="flex items-center gap-1.5 text-foreground/80">
                  <Plug className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="font-semibold">{toolCounts.get(server.id) ?? 0}</span> tools
                </span>
                <div className="flex items-center gap-2.5">
                  {server.transport.type === "stdio" ? (
                    <SandboxButton
                      serverId={server.id}
                      serverName={server.name}
                      profile={server.sandbox}
                    />
                  ) : null}
                  <ShieldModeSelect
                    serverId={server.id}
                    mode={server.shieldMode}
                    label={server.name}
                  />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
