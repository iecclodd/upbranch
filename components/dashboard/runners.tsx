"use client";

import { FormEvent, useState, useTransition } from "react";
import { Check, Copy, Laptop, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { deleteRunnerAction, pairRunnerAction } from "@/app/dashboard/actions";
import { ConfirmDialog, Modal, ModalHeader } from "@/components/dashboard/modal";
import { GlassCard, TimeAgo } from "@/components/dashboard/primitives";
import type { Runner } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink p-3">
      <code className="flex-1 break-all font-mono text-xs text-white/90">{text}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label={label}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function PairRunnerButton({ gatewayOrigin }: { gatewayOrigin: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:scale-[1.02] hover:bg-ink/5"
      >
        <Laptop className="h-4 w-4" aria-hidden="true" />
        Pair local runner
      </button>
      {open ? (
        <PairRunnerDialog gatewayOrigin={gatewayOrigin} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function PairRunnerDialog({
  gatewayOrigin,
  onClose,
}: {
  gatewayOrigin: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(async () => {
      const result = await pairRunnerAction(name);
      setToken(result.token);
    });
  }

  return (
    <Modal onClose={onClose} ariaLabel="Pair local runner" maxWidth="max-w-xl">
      <ModalHeader
        title={token ? "Runner token created" : "Pair a local runner"}
        subtitle={
          token
            ? undefined
            : "The runner is a small daemon on your machine. It launches your local stdio MCP servers and executes only the calls your policies allow — outbound connections only, nothing ever dials in."
        }
        onClose={onClose}
      />

      {token ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            This token is shown once — only its hash is stored. Run these on
            the machine that should host your local MCP servers:
          </div>
          <CopyBlock
            text={`npx polyshield-runner pair --token ${token} --url ${gatewayOrigin}`}
            label="Copy pair command"
          />
          <CopyBlock text="npx polyshield-runner start" label="Copy start command" />
          <p className="text-xs text-muted-foreground">
            Once it&apos;s running, your registered stdio servers connect and their
            tools appear in the catalog within seconds.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 w-full rounded-full bg-violet py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-deep"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="runner-name" className="text-sm font-medium text-foreground">
              Runner name
            </label>
            <input
              id="runner-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="macbook-dev"
              className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Usually the machine it runs on. You can pair more than one.
            </p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-violet py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-70"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate pairing token
          </button>
        </form>
      )}
    </Modal>
  );
}

function DeleteRunnerButton({ runnerId, name }: { runnerId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
        aria-label={`Unpair ${name}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <ConfirmDialog
          title={`Unpair ${name}?`}
          body="Its token stops working immediately and your local stdio tools go dark for agents until another runner pairs."
          confirmLabel="Unpair runner"
          onConfirm={() => deleteRunnerAction(runnerId)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * Shown on the Servers page whenever the project has stdio servers or paired
 * runners — the bridge between registered local MCPs and the machine that
 * actually runs them.
 */
export function RunnersCard({
  runners,
  gatewayOrigin,
  hasStdioServers,
}: {
  runners: Runner[];
  gatewayOrigin: string;
  hasStdioServers: boolean;
}) {
  const anyOnline = runners.some((r) => r.online);
  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Local runner</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Runs your local stdio MCP servers on your machine and executes only
            policy-approved calls. Outbound-only — nothing connects in.
          </p>
        </div>
        <PairRunnerButton gatewayOrigin={gatewayOrigin} />
      </div>

      {hasStdioServers && !anyOnline ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          You have local stdio servers registered but no runner online — their
          tools stay dark until one connects.
        </div>
      ) : null}

      {runners.length > 0 ? (
        <div className="mt-4 divide-y divide-ink/5">
          {runners.map((runner) => (
            <div key={runner.id} className="flex items-center gap-4 py-3">
              <span className="inline-flex rounded-xl bg-violet/10 p-2.5">
                <Laptop className="h-4 w-4 text-violet" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{runner.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {runner.hostname ?? "not yet connected"}
                  {runner.version ? ` · v${runner.version}` : ""}
                </p>
              </div>
              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                Last seen <TimeAgo ts={runner.lastSeenAt} />
              </div>
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1.5 rounded-full bg-ink/[0.04] px-2.5 py-1 text-xs font-medium",
                  runner.online ? "text-emerald-700" : "text-foreground/55",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    runner.online ? "bg-emerald-500" : "bg-ink/30",
                  )}
                />
                {runner.online ? "online" : "offline"}
              </span>
              <DeleteRunnerButton runnerId={runner.id} name={runner.name} />
            </div>
          ))}
        </div>
      ) : null}
    </GlassCard>
  );
}
