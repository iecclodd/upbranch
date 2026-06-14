"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute right-2.5 top-2.5 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      aria-label={label}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}

interface ClientTab {
  id: string;
  label: string;
  hint: string;
  snippet: (url: string) => string;
}

const CLIENTS: ClientTab[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    hint: "Run this in your terminal.",
    snippet: (url) =>
      `claude mcp add --transport http polyshield ${url} \\\n  --header "Authorization: Bearer <agent-key>"`,
  },
  {
    id: "cursor",
    label: "Cursor",
    hint: "Add to ~/.cursor/mcp.json (or .cursor/mcp.json in your project).",
    snippet: (url) =>
      `{
  "mcpServers": {
    "polyshield": {
      "url": "${url}",
      "headers": { "Authorization": "Bearer <agent-key>" }
    }
  }
}`,
  },
  {
    id: "codex",
    label: "Codex",
    hint: "Add to ~/.codex/config.toml.",
    snippet: (url) =>
      `[mcp_servers.polyshield]
url = "${url}"
http_headers = { "Authorization" = "Bearer <agent-key>" }`,
  },
  {
    id: "cline",
    label: "Cline",
    hint: "Add to your Cline MCP settings (cline_mcp_settings.json).",
    snippet: (url) =>
      `{
  "mcpServers": {
    "polyshield": {
      "type": "streamableHttp",
      "url": "${url}",
      "headers": { "Authorization": "Bearer <agent-key>" }
    }
  }
}`,
  },
];

/** Per-client connection snippets with the real gateway URL. */
export function ConnectSnippet({ gatewayUrl }: { gatewayUrl: string }) {
  const [tab, setTab] = useState(CLIENTS[0].id);
  const active = CLIENTS.find((c) => c.id === tab) ?? CLIENTS[0];
  const snippet = active.snippet(gatewayUrl);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CLIENTS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTab(c.id)}
            className={
              tab === c.id
                ? "rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-medium text-foreground/55 ring-1 ring-ink/10 transition-colors hover:text-foreground"
            }
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{active.hint}</p>
      <div className="relative">
        <pre className="overflow-x-auto rounded-xl bg-ink p-4 pr-12 font-mono text-xs leading-5 text-white/90">
          {snippet}
        </pre>
        <CopyButton value={snippet} label={`Copy ${active.label} config`} />
      </div>
      <p className="text-xs text-muted-foreground">
        Replace <span className="font-mono">&lt;agent-key&gt;</span> with a key from below. Exposing
        or hiding a tool takes effect live — the gateway pushes a tools-list-changed notification, so
        connected clients refresh without a restart.
      </p>
    </div>
  );
}
