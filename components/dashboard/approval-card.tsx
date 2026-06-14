"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { approveAction, denyAction } from "@/app/dashboard/actions";
import { aiApprovalRiskAction, type ApprovalRiskResult } from "@/app/dashboard/ai-actions";
import { GlassCard, StatusBadge, TimeAgo, type Tone } from "@/components/dashboard/primitives";
import type { ApprovalPreview, ApprovalRequest } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const riskTone: Record<string, Tone> = {
  low: "neutral",
  moderate: "review",
  high: "bad",
  destructive: "bad",
};

function DiffPreview({ preview }: { preview: ApprovalPreview }) {
  const files = preview.files ?? [];
  const color = {
    added: "text-emerald-700",
    modified: "text-amber-700",
    deleted: "text-rose-700",
  } as const;
  const sign = { added: "+", modified: "~", deleted: "−" } as const;

  return (
    <div className="mt-4 rounded-xl border border-ink/10 bg-white/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dry-run preview {preview.truncated ? "(truncated)" : ""}
      </p>
      {files.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {preview.note ?? "No filesystem changes in the sandbox scope."}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {files.map((f) => (
            <details key={f.path} className="group rounded-lg bg-ink/[0.03] px-3 py-2">
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className={cn("font-mono", color[f.status])}>
                  {sign[f.status]} {f.path}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {f.additions ? `+${f.additions} ` : ""}
                  {f.deletions ? `−${f.deletions}` : ""}
                </span>
              </summary>
              {f.diff ? (
                <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-ink p-3 font-mono text-[11px] leading-5 text-white/90">
                  {f.diff}
                </pre>
              ) : f.note ? (
                <p className="mt-2 text-xs text-muted-foreground">{f.note}</p>
              ) : null}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

const aiRiskColor = { low: "text-emerald-700", medium: "text-amber-700", high: "text-rose-700" } as const;

function AiRisk({ approvalId, aiEnabled }: { approvalId: string; aiEnabled: boolean }) {
  const [result, setResult] = useState<ApprovalRiskResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-4 rounded-xl border border-violet/20 bg-violet/[0.03] p-3">
      {result?.ok ? (
        <div>
          <p className={cn("text-sm font-semibold", aiRiskColor[result.risk ?? "medium"])}>
            <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            AI risk: {result.risk}
          </p>
          {result.reason ? <p className="mt-1 text-sm text-foreground/80">{result.reason}</p> : null}
          {result.watchFor ? (
            <p className="mt-1 text-xs text-muted-foreground">Watch for: {result.watchFor}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {result?.message ?? "Get a one-line AI risk verdict for this call."}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setResult(await aiApprovalRiskAction(approvalId));
              })
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet/10 px-3 py-1.5 text-xs font-semibold text-violet-deep transition-colors hover:bg-violet/15 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiEnabled ? "Analyze risk" : "Analyze risk (Pro)"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ApprovalCard({
  approval,
  serverName,
  aiEnabled,
}: {
  approval: ApprovalRequest;
  serverName: string;
  aiEnabled: boolean;
}) {
  const [remember, setRemember] = useState(false);
  const [pending, start] = useTransition();
  const risk = approval.risk ?? "low";
  const untrusted =
    approval.context?.containsUntrustedOutput || approval.context?.taintEscalated;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-base font-semibold text-foreground">{approval.exposedTool}</p>
        <div className="flex items-center gap-2">
          <StatusBadge label={`risk: ${risk}`} tone={riskTone[risk] ?? "neutral"} />
          <StatusBadge label="waiting" tone="review" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-mono text-[13px]">{approval.agent}</span>
        </span>
        <span>{serverName}</span>
        <TimeAgo ts={approval.requestedAt} />
      </div>

      {untrusted ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          This request follows untrusted data the agent ingested this session — Polyshield
          escalated it for review.
        </div>
      ) : null}

      <div className="mt-4 rounded-xl bg-ink p-4">
        <p className="text-xs text-white/45">Arguments</p>
        <pre className="mt-1.5 max-h-40 overflow-auto font-mono text-xs leading-5 text-white/90">
          {JSON.stringify(approval.args, null, 2)}
        </pre>
      </div>

      {approval.preview ? <DiffPreview preview={approval.preview} /> : null}

      <AiRisk approvalId={approval.id} aiEnabled={aiEnabled} />

      <p className="mt-4 text-sm leading-6 text-foreground/80">
        <span className="font-semibold text-foreground">Reason: </span>
        {approval.reason}
      </p>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-ink/20 accent-violet"
        />
        Remember this — auto-allow <span className="font-mono text-[13px]">{approval.exposedTool}</span> from now on
      </label>

      <div className="mt-3 flex gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => approveAction(approval.id, remember))}
          className="flex items-center gap-1.5 rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-violet-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => denyAction(approval.id))}
          className="rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5 disabled:opacity-60"
        >
          Deny
        </button>
      </div>
    </GlassCard>
  );
}
