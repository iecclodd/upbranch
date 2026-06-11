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

/** Agent connection instructions with the real gateway URL. */
export function ConnectSnippet({ gatewayUrl }: { gatewayUrl: string }) {
  const jsonSnippet = `"mcpServers": {
  "polyshield": {
    "type": "http",
    "url": "${gatewayUrl}",
    "headers": { "Authorization": "Bearer <agent-key>" }
  }
}`;
  const cliSnippet = `claude mcp add --transport http polyshield ${gatewayUrl} --header "Authorization: Bearer <agent-key>"`;

  return (
    <div className="space-y-3">
      <div className="relative">
        <pre className="overflow-x-auto rounded-xl bg-ink p-4 pr-12 font-mono text-xs leading-5 text-white/90">
          {jsonSnippet}
        </pre>
        <CopyButton value={jsonSnippet} label="Copy MCP config" />
      </div>
      <div className="relative">
        <pre className="overflow-x-auto rounded-xl bg-ink p-4 pr-12 font-mono text-xs leading-5 text-white/90">
          {cliSnippet}
        </pre>
        <CopyButton value={cliSnippet} label="Copy Claude Code command" />
      </div>
    </div>
  );
}
