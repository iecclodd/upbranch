"use client";

import { useState, useTransition } from "react";
import { History, Loader2, Undo2 } from "lucide-react";
import { restoreSnapshotAction } from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/dashboard/modal";
import { GlassCard, StatusBadge, TimeAgo, type Tone } from "@/components/dashboard/primitives";
import type { Snapshot } from "@/lib/dashboard/types";

const statusTone: Record<Snapshot["status"], Tone> = {
  available: "good",
  restoring: "review",
  restored: "violet",
  gone: "neutral",
};

function bytesLabel(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function RestoreButton({ snapshot }: { snapshot: Snapshot }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (snapshot.status !== "available") {
    return (
      <span className="text-xs text-muted-foreground">
        {snapshot.status === "restoring" ? "restoring…" : snapshot.status}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-ink/5 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
        Restore
      </button>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {open ? (
        <ConfirmDialog
          title="Restore this snapshot?"
          body={`This reverts the server's filesystem scope to "${snapshot.label || snapshot.id}". Changes made since are overwritten.`}
          confirmLabel="Restore"
          tone="default"
          onConfirm={async () => {
            const result = await restoreSnapshotAction(snapshot.id);
            if (result?.error) {
              setError(result.error);
              throw new Error(result.error);
            }
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function SnapshotsCard({
  snapshots,
  serverNames,
}: {
  snapshots: Snapshot[];
  serverNames: Record<string, string>;
}) {
  if (snapshots.length === 0) return null;
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="font-semibold text-foreground">Snapshots</h2>
        <span className="text-sm text-muted-foreground">— undo a local change the agent made</span>
      </div>
      <div className="mt-4 divide-y divide-ink/5">
        {snapshots.map((snap) => (
          <div key={snap.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {snap.label || "snapshot"}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {snap.serverId ? serverNames[snap.serverId] ?? "—" : "removed server"}
                {snap.scopePath ? ` · ${snap.scopePath}` : ""}
                {bytesLabel(snap.bytes) ? ` · ${bytesLabel(snap.bytes)}` : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              <TimeAgo ts={snap.createdAt} />
            </span>
            <StatusBadge label={snap.status} tone={statusTone[snap.status]} />
            <RestoreButton snapshot={snap} />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
