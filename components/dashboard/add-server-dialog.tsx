"use client";

import { FormEvent, useState, useTransition } from "react";
import { Globe, KeyRound, Loader2, Plus, TerminalSquare, Trash2, X } from "lucide-react";
import { addServerAction, deleteServerAction } from "@/app/dashboard/actions";
import { GlassCard } from "@/components/dashboard/primitives";
import type { TransportConfig } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type ServerType = "stdio" | "http";

function parseEnvLines(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    const eq = t.indexOf("=");
    if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const field =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10";

export function AddServerButton({ existingPrefixes }: { existingPrefixes: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-plum"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add MCP server
      </button>
      {open ? (
        <AddServerDialog
          existingPrefixes={existingPrefixes}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function AddServerDialog({
  existingPrefixes,
  onClose,
}: {
  existingPrefixes: string[];
  onClose: () => void;
}) {
  const [type, setType] = useState<ServerType>("stdio");
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [command, setCommand] = useState("");
  const [argsText, setArgsText] = useState("");
  const [envText, setEnvText] = useState("");
  const [passthrough, setPassthrough] = useState("");
  const [cwd, setCwd] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrefix = prefix.trim().toLowerCase();
    if (existingPrefixes.includes(cleanPrefix)) {
      setError(`The "${cleanPrefix}" namespace is already in use.`);
      return;
    }
    const transport: TransportConfig =
      type === "stdio"
        ? {
            type: "stdio",
            command: command.trim(),
            args: argsText.trim() ? argsText.trim().split(/\s+/) : [],
            env: parseEnvLines(envText),
            envPassthrough: passthrough
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
    start(async () => {
      const result = await addServerAction({
        name: name.trim(),
        prefix: cleanPrefix,
        transport,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  const placeholderPrefix = prefix.trim() || (type === "stdio" ? "playwright" : "github");

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
              <h2 className="text-lg font-semibold text-foreground">Add MCP server</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {type === "http"
                  ? "On save, Polyshield connects, runs tools/list, and adds the discovered tools to your catalog."
                  : "Local servers are launched by the Polyshield local runner on your machine — coming soon. You can register one now; its tools appear once a runner pairs."}
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

          <div className="mt-5 grid grid-cols-2 gap-2.5" role="radiogroup">
            {(
              [
                { v: "stdio", icon: TerminalSquare, t: "Local stdio", s: "Launched by command" },
                { v: "http", icon: Globe, t: "Remote HTTP", s: "Connected by URL" },
              ] as const
            ).map(({ v, icon: Icon, t, s }) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={type === v}
                onClick={() => setType(v)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors",
                  type === v
                    ? "border-violet/40 bg-violet/5 ring-2 ring-violet/15"
                    : "border-ink/10 hover:border-ink/20",
                )}
              >
                <Icon className="h-4 w-4 text-violet" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-foreground">{t}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s}</p>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="s-name" className="text-sm font-medium text-foreground">
                  Display name
                </label>
                <input
                  id="s-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === "stdio" ? "Playwright MCP" : "GitHub MCP"}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="s-prefix" className="text-sm font-medium text-foreground">
                  Tool namespace
                </label>
                <input
                  id="s-prefix"
                  required
                  value={prefix}
                  onChange={(e) => {
                    setPrefix(e.target.value);
                    setError(null);
                  }}
                  placeholder={type === "stdio" ? "playwright" : "github"}
                  pattern="[a-zA-Z][a-zA-Z0-9_]*"
                  title="Starts with a letter; letters, digits and underscores only"
                  className={cn(field, "font-mono")}
                />
              </div>
            </div>
            {error ? (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Exposed as{" "}
                <span className="font-mono">{placeholderPrefix.toLowerCase()}.&lt;tool&gt;</span>
              </p>
            )}

            {type === "stdio" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="s-cmd" className="text-sm font-medium text-foreground">
                      Command
                    </label>
                    <input
                      id="s-cmd"
                      required
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="npx"
                      className={cn(field, "font-mono")}
                    />
                  </div>
                  <div>
                    <label htmlFor="s-args" className="text-sm font-medium text-foreground">
                      Arguments
                    </label>
                    <input
                      id="s-args"
                      value={argsText}
                      onChange={(e) => setArgsText(e.target.value)}
                      placeholder="@playwright/mcp@latest"
                      className={cn(field, "font-mono")}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="s-env" className="text-sm font-medium text-foreground">
                    Environment variables
                  </label>
                  <textarea
                    id="s-env"
                    value={envText}
                    onChange={(e) => setEnvText(e.target.value)}
                    placeholder={"API_KEY=sk-..."}
                    rows={2}
                    className={cn(field, "resize-y font-mono")}
                  />
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Masked everywhere; raw values stay on your machine with the
                    local runner.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="s-pass" className="text-sm font-medium text-foreground">
                      Env passthrough
                    </label>
                    <input
                      id="s-pass"
                      value={passthrough}
                      onChange={(e) => setPassthrough(e.target.value)}
                      placeholder="HOME, PATH"
                      className={cn(field, "font-mono")}
                    />
                  </div>
                  <div>
                    <label htmlFor="s-cwd" className="text-sm font-medium text-foreground">
                      Working directory
                    </label>
                    <input
                      id="s-cwd"
                      value={cwd}
                      onChange={(e) => setCwd(e.target.value)}
                      placeholder="~/code"
                      className={cn(field, "font-mono")}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="s-endpoint" className="text-sm font-medium text-foreground">
                    Endpoint URL
                  </label>
                  <input
                    id="s-endpoint"
                    required
                    type="url"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.example.com/mcp"
                    className={cn(field, "font-mono")}
                  />
                </div>
                <div>
                  <label htmlFor="s-auth" className="text-sm font-medium text-foreground">
                    Auth header / API key
                  </label>
                  <input
                    id="s-auth"
                    type="password"
                    value={authHeader}
                    onChange={(e) => setAuthHeader(e.target.value)}
                    placeholder="Bearer sk-..."
                    className={cn(field, "font-mono")}
                  />
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Stored write-only in the credential vault — never shown again.
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
                disabled={pending}
                className="flex items-center gap-2 rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-70"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {type === "http"
                  ? pending
                    ? "Connecting…"
                    : "Connect & discover"
                  : "Register server"}
              </button>
            </div>
          </form>
        </div>
      </GlassCard>
    </div>
  );
}

export function DeleteServerButton({ serverId, name }: { serverId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove ${name}? Its tools and policies are deleted too.`)) {
          start(() => deleteServerAction(serverId));
        }
      }}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
      aria-label={`Remove ${name}`}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
