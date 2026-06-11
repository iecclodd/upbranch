"use client";

import { FormEvent, useMemo, useState } from "react";
import { Globe, KeyRound, Plug, Plus, TerminalSquare, X } from "lucide-react";
import {
  useDashboard,
  type AddServerInput,
} from "@/components/dashboard/dashboard-provider";
import {
  GlassCard,
  PageHeader,
  Pill,
  TimeAgo,
  type PillTone,
} from "@/components/dashboard/primitives";
import type { McpServer, TransportConfig } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const statusTones: Record<McpServer["status"], PillTone> = {
  connected: "good",
  connecting: "review",
  pending: "review",
  error: "bad",
};

type ServerType = "stdio" | "http";

function parseEnvLines(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function fieldClass(mono = false) {
  return cn(
    "mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10",
    mono && "font-mono",
  );
}

function AddServerDialog({ onClose }: { onClose: () => void }) {
  const { state, addServer } = useDashboard();
  const [serverType, setServerType] = useState<ServerType>("stdio");
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [prefixError, setPrefixError] = useState<string | null>(null);
  // stdio fields
  const [command, setCommand] = useState("");
  const [argsText, setArgsText] = useState("");
  const [envText, setEnvText] = useState("");
  const [passthroughText, setPassthroughText] = useState("");
  const [cwd, setCwd] = useState("");
  // http fields
  const [endpoint, setEndpoint] = useState("");
  const [authHeader, setAuthHeader] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrefix = prefix.trim().toLowerCase();
    if (state.servers.some((s) => s.prefix === cleanPrefix)) {
      setPrefixError(
        `The "${cleanPrefix}" namespace is already in use by another server.`,
      );
      return;
    }

    const transport: TransportConfig =
      serverType === "stdio"
        ? {
            type: "stdio",
            command: command.trim(),
            args: argsText.trim() ? argsText.trim().split(/\s+/) : [],
            env: parseEnvLines(envText),
            envPassthrough: passthroughText
              .split(/[,\s]+/)
              .map((s) => s.trim())
              .filter(Boolean),
            cwd: cwd.trim() || undefined,
          }
        : {
            type: "http",
            endpoint: endpoint.trim(),
            authHeader: authHeader.trim() || undefined,
          };

    const input: AddServerInput = { name: name.trim(), prefix: cleanPrefix, transport };
    addServer(input);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add MCP server"
      onClick={onClose}
    >
      <GlassCard className="max-h-[88vh] w-full max-w-lg overflow-y-auto bg-white/95 p-6">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Add MCP server
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                On save, Polyshield initializes an MCP client and calls{" "}
                <code className="rounded bg-ink/5 px-1 font-mono text-[13px]">
                  tools/list
                </code>{" "}
                — discovered tools land in your catalog under the namespace you
                pick.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-ink/5"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-foreground">Server type</p>
            <div className="mt-2 grid grid-cols-2 gap-2.5" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={serverType === "stdio"}
                onClick={() => setServerType("stdio")}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors",
                  serverType === "stdio"
                    ? "border-violet/40 bg-violet/5 ring-2 ring-violet/15"
                    : "border-ink/10 hover:border-ink/20",
                )}
              >
                <TerminalSquare
                  className="h-4 w-4 text-violet"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Local stdio
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  Launched by command via the local runner
                </p>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={serverType === "http"}
                onClick={() => setServerType("http")}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors",
                  serverType === "http"
                    ? "border-violet/40 bg-violet/5 ring-2 ring-violet/15"
                    : "border-ink/10 hover:border-ink/20",
                )}
              >
                <Globe className="h-4 w-4 text-violet" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Remote HTTP
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  Connected by endpoint URL
                </p>
              </button>
            </div>
            <p className="mt-2.5 rounded-xl bg-violet/5 px-3.5 py-2.5 text-xs leading-5 text-foreground/70">
              Local stdio MCP servers run through the Polyshield local runner.
              Remote HTTP MCP servers are connected by endpoint. The runner
              connects <em>out</em> to Polyshield and only accepts jobs from it
              — agents never talk to the runner directly.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="server-name"
                  className="text-sm font-medium text-foreground"
                >
                  Display name
                </label>
                <input
                  id="server-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    serverType === "stdio" ? "Playwright MCP" : "GitHub MCP"
                  }
                  className={fieldClass()}
                />
              </div>
              <div>
                <label
                  htmlFor="server-prefix"
                  className="text-sm font-medium text-foreground"
                >
                  Tool namespace
                </label>
                <input
                  id="server-prefix"
                  required
                  value={prefix}
                  onChange={(e) => {
                    setPrefix(e.target.value);
                    setPrefixError(null);
                  }}
                  placeholder={serverType === "stdio" ? "playwright" : "github"}
                  pattern="[a-zA-Z][a-zA-Z0-9_]*"
                  className={fieldClass(true)}
                />
              </div>
            </div>
            {prefixError ? (
              <p className="text-sm text-[#B3266C]" role="alert">
                {prefixError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Exposed tools become{" "}
                <span className="font-mono">
                  {(prefix.trim() || (serverType === "stdio" ? "playwright" : "github")).toLowerCase()}
                  .&lt;tool&gt;
                </span>
              </p>
            )}

            {serverType === "stdio" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="server-command"
                      className="text-sm font-medium text-foreground"
                    >
                      Command to launch
                    </label>
                    <input
                      id="server-command"
                      required
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="npx"
                      className={fieldClass(true)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="server-args"
                      className="text-sm font-medium text-foreground"
                    >
                      Arguments
                    </label>
                    <input
                      id="server-args"
                      value={argsText}
                      onChange={(e) => setArgsText(e.target.value)}
                      placeholder="@playwright/mcp@latest"
                      className={fieldClass(true)}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="server-env"
                    className="text-sm font-medium text-foreground"
                  >
                    Environment variables
                  </label>
                  <textarea
                    id="server-env"
                    value={envText}
                    onChange={(e) => setEnvText(e.target.value)}
                    placeholder={"API_KEY=sk-...\nREGION=us-east-1"}
                    rows={2}
                    className={cn(fieldClass(true), "resize-y")}
                  />
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Values are write-only: stored in the credential vault,
                    masked everywhere in the UI, injected only at launch.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="server-passthrough"
                      className="text-sm font-medium text-foreground"
                    >
                      Env passthrough
                    </label>
                    <input
                      id="server-passthrough"
                      value={passthroughText}
                      onChange={(e) => setPassthroughText(e.target.value)}
                      placeholder="HOME, PATH"
                      className={fieldClass(true)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="server-cwd"
                      className="text-sm font-medium text-foreground"
                    >
                      Working directory
                    </label>
                    <input
                      id="server-cwd"
                      value={cwd}
                      onChange={(e) => setCwd(e.target.value)}
                      placeholder="~/code"
                      className={fieldClass(true)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="server-endpoint"
                    className="text-sm font-medium text-foreground"
                  >
                    Endpoint URL
                  </label>
                  <input
                    id="server-endpoint"
                    required
                    type="url"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.example.com/mcp"
                    className={fieldClass(true)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="server-auth"
                    className="text-sm font-medium text-foreground"
                  >
                    Auth header / API key
                  </label>
                  <input
                    id="server-auth"
                    type="password"
                    value={authHeader}
                    onChange={(e) => setAuthHeader(e.target.value)}
                    placeholder="Bearer sk-..."
                    className={fieldClass(true)}
                  />
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Write-only: stored in the credential vault and attached by
                    the gateway. It can be rotated or deleted, never read back.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep"
              >
                Save &amp; discover tools
              </button>
            </div>
          </form>
        </div>
      </GlassCard>
    </div>
  );
}

function TransportSummary({ transport }: { transport: TransportConfig }) {
  if (transport.type === "http") {
    return (
      <div className="mt-3 space-y-1.5">
        <p className="break-all rounded-lg bg-ink/5 px-3 py-2 font-mono text-xs text-foreground/70">
          {transport.endpoint}
        </p>
        {transport.authHeader ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
            Auth configured (write-only):{" "}
            <span className="font-mono">{transport.authHeader}</span>
          </p>
        ) : null}
      </div>
    );
  }
  const envKeys = Object.keys(transport.env);
  return (
    <div className="mt-3 space-y-1.5">
      <p className="break-all rounded-lg bg-ink/5 px-3 py-2 font-mono text-xs text-foreground/70">
        {transport.command} {transport.args.join(" ")}
        {transport.cwd ? `  (cwd: ${transport.cwd})` : ""}
      </p>
      {envKeys.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
          Vaulted env: <span className="font-mono">{envKeys.join(", ")}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function ServersPage() {
  const { state } = useDashboard();
  const [dialogOpen, setDialogOpen] = useState(false);

  const toolCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tool of state.tools) {
      if (tool.enabled) {
        counts.set(tool.serverId, (counts.get(tool.serverId) ?? 0) + 1);
      }
    }
    return counts;
  }, [state.tools]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="MCP Servers"
        description="Downstream servers connected to Polyshield. Your agent never talks to these directly — it only sees the tools you choose to expose."
        action={
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-plum"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add MCP server
          </button>
        }
      />

      <GlassCard className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <span className="inline-flex shrink-0 rounded-xl bg-violet/10 p-2.5">
            <TerminalSquare className="h-4 w-4 text-violet" aria-hidden="true" />
          </span>
          <span className="inline-flex shrink-0 rounded-xl bg-violet/10 p-2.5">
            <Globe className="h-4 w-4 text-violet" aria-hidden="true" />
          </span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-foreground">
            Local stdio MCP servers run through the Polyshield local runner.
            Remote HTTP MCP servers are connected by endpoint.
          </span>{" "}
          The runner dials out to the Polyshield control plane and executes
          only the jobs it sends — agents never connect to the runner, so
          policy decisions stay off the agent&apos;s machine.
        </p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.servers.map((server) => (
          <GlassCard key={server.id} className="flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex rounded-xl bg-violet/10 p-2.5">
                <Plug className="h-4 w-4 text-violet" aria-hidden="true" />
              </span>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Pill label={server.transport.type} tone="violet" />
                <Pill label={server.kind} tone="neutral" />
                <Pill label={server.status} tone={statusTones[server.status]} />
              </div>
            </div>
            <h2 className="mt-4 font-semibold text-foreground">{server.name}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {server.description}
            </p>
            <TransportSummary transport={server.transport} />
            <div className="mt-auto flex items-center justify-between pt-4 text-sm">
              <span className="text-foreground/80">
                <span className="font-semibold">
                  {toolCounts.get(server.id) ?? 0}
                </span>{" "}
                exposed tools
              </span>
              <span className="text-muted-foreground">
                Last action: <TimeAgo ts={server.lastActionAt} />
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {dialogOpen ? <AddServerDialog onClose={() => setDialogOpen(false)} /> : null}
    </div>
  );
}
