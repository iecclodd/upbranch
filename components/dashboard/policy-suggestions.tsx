"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { createPolicyAction } from "@/app/dashboard/actions";
import { GlassCard } from "@/components/dashboard/primitives";

/**
 * "You've approved X 12 times — make it a rule?" Turns repeated approvals into
 * an offer to auto-allow, so the queue stops nagging the user about the same
 * safe call.
 */
export function PolicySuggestions({
  suggestions,
}: {
  suggestions: Array<{ exposedTool: string; count: number }>;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = suggestions.filter((s) => !dismissed.has(s.exposedTool));
  if (visible.length === 0) return null;

  return (
    <GlassCard className="border border-violet/20 bg-violet/[0.03] p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="font-semibold text-foreground">Suggested rules</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        You keep approving these. Make them auto-allow to stop the queue from asking.
      </p>
      <div className="mt-4 space-y-2">
        {visible.map((s) => (
          <Suggestion
            key={s.exposedTool}
            tool={s.exposedTool}
            count={s.count}
            onDone={() => setDismissed((d) => new Set(d).add(s.exposedTool))}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function Suggestion({ tool, count, onDone }: { tool: string; count: number; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-3">
      <p className="text-sm text-foreground">
        Approved <span className="font-semibold">{count}×</span> ·{" "}
        <span className="font-mono text-[13px]">{tool}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await createPolicyAction({
                exposedTool: tool,
                decision: "allow",
                description: `Learned from ${count} approvals — auto-allow.`,
              });
              onDone();
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-violet px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Make it a rule
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
