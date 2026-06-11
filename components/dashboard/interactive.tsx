"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  approveAction,
  denyAction,
  deletePolicyAction,
  setPolicyDecisionAction,
  toggleToolAction,
} from "@/app/dashboard/actions";
import type { PolicyDecision } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

/** Expose/hide a tool to the agent. */
export function ToolToggle({
  toolId,
  enabled,
  label,
}: {
  toolId: string;
  enabled: boolean;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`Expose ${label} to the agent`}
      disabled={pending}
      onClick={() => start(() => toggleToolAction(toolId, !enabled))}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
        enabled ? "bg-violet" : "bg-ink/15",
      )}
    >
      <span
        className={cn(
          "inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-[22px]" : "translate-x-1",
        )}
      />
    </button>
  );
}

const DECISIONS: PolicyDecision[] = ["allow", "require_approval", "deny"];

export function PolicySelect({
  policyId,
  decision,
  label,
}: {
  policyId: string;
  decision: PolicyDecision;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      value={decision}
      disabled={pending}
      aria-label={`Decision for ${label}`}
      onChange={(e) =>
        start(() =>
          setPolicyDecisionAction(policyId, e.target.value as PolicyDecision),
        )
      }
      className="rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-sm font-medium text-foreground outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10 disabled:opacity-60"
    >
      {DECISIONS.map((d) => (
        <option key={d} value={d}>
          {d.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}

export function DeletePolicyButton({
  policyId,
  label,
}: {
  policyId: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete the policy on ${label}? The tool falls back to its default.`)) {
          start(() => deletePolicyAction(policyId));
        }
      }}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
      aria-label={`Delete policy on ${label}`}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => approveAction(approvalId))}
        className="flex items-center gap-1.5 rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-violet-deep disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => denyAction(approvalId))}
        className="rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5 disabled:opacity-60"
      >
        Deny
      </button>
    </div>
  );
}
