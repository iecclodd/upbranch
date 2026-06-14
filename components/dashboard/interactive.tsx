"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  approveAction,
  denyAction,
  deletePolicyAction,
  setPolicyDecisionAction,
  setShieldModeAction,
  toggleToolAction,
} from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/dashboard/modal";
import type { PolicyDecision, ShieldMode } from "@/lib/dashboard/types";
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

const DECISIONS: PolicyDecision[] = ["allow", "flag", "require_approval", "deny"];

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
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
        aria-label={`Delete policy on ${label}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <ConfirmDialog
          title="Delete this policy?"
          body={`Calls to ${label} fall back to the tool's default behavior.`}
          confirmLabel="Delete policy"
          onConfirm={() => deletePolicyAction(policyId)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const SHIELD_MODES: Array<{ value: ShieldMode; label: string }> = [
  { value: "off", label: "Shield off" },
  { value: "flag", label: "Shield: flag" },
  { value: "block", label: "Shield: block" },
];

/**
 * Per-server prompt-injection shield. flag prepends a warning to suspicious
 * tool output; block withholds it entirely.
 */
export function ShieldModeSelect({
  serverId,
  mode,
  label,
}: {
  serverId: string;
  mode: ShieldMode;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      value={mode}
      disabled={pending}
      aria-label={`Prompt-injection shield for ${label}`}
      onChange={(e) =>
        start(async () => {
          await setShieldModeAction(serverId, e.target.value as ShieldMode);
        })
      }
      className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs font-medium text-foreground/80 outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10 disabled:opacity-60"
    >
      {SHIELD_MODES.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
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
