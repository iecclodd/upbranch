"use client";

import { FormEvent, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createPolicyAction } from "@/app/dashboard/actions";
import { Modal, ModalHeader } from "@/components/dashboard/modal";
import type { PolicyDecision } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const field =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10";

const DECISIONS: Array<{ value: PolicyDecision; label: string; hint: string }> = [
  { value: "require_approval", label: "Require approval", hint: "Held until a human decides" },
  { value: "deny", label: "Deny", hint: "Never forwarded" },
  { value: "allow", label: "Allow", hint: "Forwarded immediately" },
];

export function AddPolicyButton({ toolNames }: { toolNames: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={toolNames.length === 0}
        className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-plum disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add policy
      </button>
      {open ? <AddPolicyDialog toolNames={toolNames} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AddPolicyDialog({
  toolNames,
  onClose,
}: {
  toolNames: string[];
  onClose: () => void;
}) {
  const [exposedTool, setExposedTool] = useState(toolNames[0] ?? "");
  const [decision, setDecision] = useState<PolicyDecision>("require_approval");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(async () => {
      const result = await createPolicyAction({
        exposedTool,
        decision,
        condition: condition.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} ariaLabel="Add policy">
      <ModalHeader
        title="Add policy"
        subtitle="Evaluated on every call to the tool. The strictest applicable policy wins."
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="p-tool" className="text-sm font-medium text-foreground">
                Tool
              </label>
              <select
                id="p-tool"
                value={exposedTool}
                onChange={(e) => setExposedTool(e.target.value)}
                className={cn(field, "font-mono")}
              >
                {toolNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div role="radiogroup" aria-label="Decision" className="grid grid-cols-3 gap-2.5">
              {DECISIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={decision === d.value}
                  onClick={() => setDecision(d.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    decision === d.value
                      ? "border-violet/40 bg-violet/5 ring-2 ring-violet/15"
                      : "border-ink/10 hover:border-ink/20",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{d.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.hint}</p>
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="p-cond" className="text-sm font-medium text-foreground">
                Condition <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="p-cond"
                value={condition}
                onChange={(e) => {
                  setCondition(e.target.value);
                  setError(null);
                }}
                placeholder='amount > 100  ·  branch == "main"'
                className={cn(field, "font-mono")}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Compares call arguments: <span className="font-mono">==</span>,{" "}
                <span className="font-mono">!=</span>, <span className="font-mono">&gt;</span>,{" "}
                <span className="font-mono">&gt;=</span>, <span className="font-mono">&lt;</span>,{" "}
                <span className="font-mono">&lt;=</span>, joined with{" "}
                <span className="font-mono">and</span>. Without one, the policy always applies.
              </p>
            </div>

            <div>
              <label htmlFor="p-desc" className="text-sm font-medium text-foreground">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Refunds over $100 wait for a human."
                className={field}
              />
            </div>

            {error ? (
              <p className="text-sm text-rose-600" role="alert">
                {error}
              </p>
            ) : null}

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
            Add policy
          </button>
        </div>
      </form>
    </Modal>
  );
}
