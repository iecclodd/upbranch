"use client";

import { FormEvent, useState, useTransition } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { addFromRegistryAction } from "@/app/dashboard/actions";
import { Modal, ModalHeader } from "@/components/dashboard/modal";
import type { RegistryEntry } from "@/lib/registry/catalog";
import { cn } from "@/lib/utils";

const field =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10";

export function InstallButton({ entry, installed }: { entry: RegistryEntry; installed: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all",
          installed
            ? "border border-ink/15 text-foreground/70 hover:bg-ink/5"
            : "bg-ink text-white hover:scale-[1.02] hover:bg-plum",
        )}
      >
        {installed ? <Check className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {installed ? "Add again" : "Add"}
      </button>
      {open ? <InstallDialog entry={entry} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function InstallDialog({ entry, onClose }: { entry: RegistryEntry; onClose: () => void }) {
  const [prefix, setPrefix] = useState(entry.defaultPrefix);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const result = await addFromRegistryAction({ registryId: entry.id, prefix, env });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} ariaLabel={`Install ${entry.name}`}>
      <ModalHeader
        title={`Add ${entry.name}`}
        subtitle={`Registers the stdio server with its recommended sandbox + ${entry.recommendedPolicies.length} starter policies. Your runner launches it.`}
        onClose={onClose}
      />
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="rounded-xl bg-ink/[0.03] p-3 font-mono text-xs text-foreground/70">
          {entry.command} {entry.args.join(" ")}
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-amber-700">Supply chain:</span> {entry.pinningAdvice}
        </p>

        <div>
          <label htmlFor="r-prefix" className="text-sm font-medium text-foreground">
            Tool namespace
          </label>
          <input
            id="r-prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            pattern="[a-z][a-z0-9_]*"
            className={cn(field, "font-mono")}
          />
        </div>

        {entry.envKeys.map((key) => (
          <div key={key}>
            <label htmlFor={`env-${key}`} className="text-sm font-medium text-foreground">
              {key}
            </label>
            <input
              id={`env-${key}`}
              type="password"
              value={env[key] ?? ""}
              onChange={(e) => setEnv((m) => ({ ...m, [key]: e.target.value }))}
              placeholder="value stays in the vault"
              className={cn(field, "font-mono")}
            />
          </div>
        ))}

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
            Add to project
          </button>
        </div>
      </form>
    </Modal>
  );
}
