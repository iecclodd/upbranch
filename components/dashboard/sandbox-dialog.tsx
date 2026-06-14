"use client";

import { FormEvent, useState, useTransition } from "react";
import { Loader2, ShieldHalf } from "lucide-react";
import { setSandboxProfileAction } from "@/app/dashboard/actions";
import { Modal, ModalHeader } from "@/components/dashboard/modal";
import type { EgressMode, SandboxProfile } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const field =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-ink/10 p-3">
      <span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-violet" : "bg-ink/15",
        )}
      >
        <span
          className={cn(
            "inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-1",
          )}
        />
      </button>
    </label>
  );
}

export function SandboxButton({
  serverId,
  serverName,
  profile,
}: {
  serverId: string;
  serverName: string;
  profile: SandboxProfile;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-2.5 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-ink/5"
      >
        <ShieldHalf className="h-3.5 w-3.5 text-violet" aria-hidden="true" />
        Sandbox
      </button>
      {open ? (
        <SandboxDialog
          serverId={serverId}
          serverName={serverName}
          profile={profile}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function SandboxDialog({
  serverId,
  serverName,
  profile,
  onClose,
}: {
  serverId: string;
  serverName: string;
  profile: SandboxProfile;
  onClose: () => void;
}) {
  const [fsScope, setFsScope] = useState(profile.fsScope.join("\n"));
  const [egressMode, setEgressMode] = useState<EgressMode>(profile.egress.mode);
  const [egressAllow, setEgressAllow] = useState(profile.egress.allow.join("\n"));
  const [wallSec, setWallSec] = useState(String(Math.round((profile.limits.wallMs ?? 60000) / 1000)));
  const [snapshot, setSnapshot] = useState(profile.snapshotBeforeWrite);
  const [dryRun, setDryRun] = useState(profile.dryRunOnApproval);
  const [stripEnv, setStripEnv] = useState(profile.stripEnv);
  const [containerize, setContainerize] = useState(profile.containerize);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const lines = (t: string) =>
    t
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dryRun && egressMode !== "none") {
      setError("Dry-run previews require egress “none” so the dry-run can't trigger a real side effect.");
      return;
    }
    const next: SandboxProfile = {
      fsScope: lines(fsScope),
      egress: { mode: egressMode, allow: lines(egressAllow) },
      limits: { wallMs: Math.max(1, Number(wallSec) || 60) * 1000 },
      snapshotBeforeWrite: snapshot,
      dryRunOnApproval: dryRun,
      stripEnv,
      containerize,
    };
    start(async () => {
      const result = await setSandboxProfileAction(serverId, next);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} ariaLabel={`Sandbox for ${serverName}`}>
      <ModalHeader
        title="Sandbox profile"
        subtitle={`Constrain what ${serverName} can touch when the runner executes its tools.`}
        onClose={onClose}
      />
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="sb-scope" className="text-sm font-medium text-foreground">
            Filesystem scope
          </label>
          <textarea
            id="sb-scope"
            value={fsScope}
            onChange={(e) => setFsScope(e.target.value)}
            placeholder={"~/code/my-project"}
            rows={2}
            className={cn(field, "resize-y font-mono")}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            One path per line. The server&apos;s working directory is pinned to the first; path
            arguments that escape it are refused. Leave empty for no scoping.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sb-egress" className="text-sm font-medium text-foreground">
              Network egress
            </label>
            <select
              id="sb-egress"
              value={egressMode}
              onChange={(e) => setEgressMode(e.target.value as EgressMode)}
              className={field}
            >
              <option value="inherit">Inherit (no restriction)</option>
              <option value="none">None (filesystem-confined)</option>
              <option value="allowlist">Allowlist domains</option>
            </select>
          </div>
          <div>
            <label htmlFor="sb-wall" className="text-sm font-medium text-foreground">
              Per-call timeout (seconds)
            </label>
            <input
              id="sb-wall"
              type="number"
              min={1}
              max={600}
              value={wallSec}
              onChange={(e) => setWallSec(e.target.value)}
              className={field}
            />
          </div>
        </div>

        {egressMode === "allowlist" ? (
          <div>
            <label htmlFor="sb-allow" className="text-sm font-medium text-foreground">
              Allowed domains
            </label>
            <textarea
              id="sb-allow"
              value={egressAllow}
              onChange={(e) => setEgressAllow(e.target.value)}
              placeholder={"api.github.com\nregistry.npmjs.org"}
              rows={2}
              className={cn(field, "resize-y font-mono")}
            />
          </div>
        ) : null}

        <div className="space-y-2.5">
          <Toggle
            checked={snapshot}
            onChange={setSnapshot}
            label="Snapshot before destructive calls (undo)"
            hint="The runner copies the scope before an approved risky call, so you can revert it."
          />
          <Toggle
            checked={dryRun}
            onChange={(v) => {
              setDryRun(v);
              setError(null);
            }}
            label="Dry-run preview on approval"
            hint="Gated calls execute for real against a throwaway copy so the approval card shows the diff. Filesystem-confined tools only — requires egress “none”."
          />
          <Toggle
            checked={stripEnv}
            onChange={setStripEnv}
            label="Strip ambient environment"
            hint="The child gets only declared env + passthrough, not your host's variables."
          />
          <Toggle
            checked={containerize}
            onChange={setContainerize}
            label="Run in a container (enforced)"
            hint="Runs the server in Docker — turns egress “none” and the memory limit into kernel-enforced isolation. Needs Docker on the runner; falls back to declared if absent."
          />
        </div>

        <p className="rounded-lg bg-ink/[0.03] px-3 py-2 text-xs text-muted-foreground">
          Scope, env stripping, timeouts, snapshots, and dry-runs are runner-enforced. Network egress
          and memory limits are <span className="font-semibold">declared and audited</span> by default —
          turn on <span className="font-semibold">Run in a container</span> to make them kernel-enforced
          (requires Docker). Polyshield never marks a declared control as enforced.
        </p>

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
            Save sandbox
          </button>
        </div>
      </form>
    </Modal>
  );
}
