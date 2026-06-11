"use client";

import { FormEvent, useState, useTransition } from "react";
import { Check, Copy, Loader2, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { createAgentAction, deleteAgentAction } from "@/app/dashboard/actions";
import { GlassCard } from "@/components/dashboard/primitives";

export function CreateAgentButton({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-plum disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New agent
      </button>
      {open ? <CreateAgentDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function CreateAgentDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(async () => {
      const result = await createAgentAction(name);
      setKey(result.key);
    });
  }

  async function copy() {
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create agent"
      onClick={onClose}
    >
      <GlassCard className="w-full max-w-md bg-white/95 p-6">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {key ? "Agent key created" : "New agent"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-ink/5"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {key ? (
            <div className="mt-4">
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Copy this key now — it&apos;s shown once and never again. Only its
                hash is stored.
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink p-3">
                <code className="flex-1 break-all font-mono text-xs text-white/90">
                  {key}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                  aria-label="Copy key"
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full rounded-full bg-violet py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-deep"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="agent-name" className="text-sm font-medium text-foreground">
                  Agent name
                </label>
                <input
                  id="agent-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="codex-local"
                  className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  The agent uses this key to connect to the Polyshield MCP server.
                </p>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-violet py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-70"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create agent &amp; generate key
              </button>
            </form>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export function DeleteAgentButton({ agentId, name }: { agentId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete ${name}? Its key stops working immediately.`)) {
          start(() => deleteAgentAction(agentId));
        }
      }}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
      aria-label={`Delete ${name}`}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
