"use client";

import { useMemo, useState, useTransition } from "react";
import { Globe, Loader2, ShieldAlert, TerminalSquare, X } from "lucide-react";
import { bulkToolsAction } from "@/app/dashboard/actions";
import { ToolToggle } from "@/components/dashboard/interactive";
import { GlassCard, StatusBadge } from "@/components/dashboard/primitives";
import { decisionTone } from "@/lib/dashboard/tones";
import type { PolicyDecision } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export interface CatalogToolRow {
  id: string;
  exposedName: string;
  rawName: string;
  rawDescription: string;
  enabled: boolean;
  risk: "none" | "low" | "high";
  riskDetail?: string;
  decision: PolicyDecision;
  hasPolicy: boolean;
}

export interface CatalogGroup {
  serverId: string;
  serverName: string;
  prefix: string;
  transportType: "stdio" | "http";
  tools: CatalogToolRow[];
}

const DECISIONS: PolicyDecision[] = ["allow", "flag", "require_approval", "deny"];

export function ToolCatalog({ groups }: { groups: CatalogGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decision, setDecision] = useState<PolicyDecision>("require_approval");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const allIds = useMemo(() => groups.flatMap((g) => g.tools.map((t) => t.id)), [groups]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function setMany(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
  function clear() {
    setSelected(new Set());
    setMsg(null);
  }

  function runBulk(action: "enable" | "disable" | PolicyDecision) {
    const toolIds = Array.from(selected);
    if (toolIds.length === 0) return;
    setMsg(null);
    start(async () => {
      const r = await bulkToolsAction({ toolIds, action });
      setSelected(new Set());
      setMsg(r.error ?? null);
    });
  }

  return (
    <div className="space-y-5">
      {selected.size > 0 ? (
        <div className="sticky top-4 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-violet/30 bg-white/90 px-4 py-3 shadow-chip backdrop-blur-xl">
          <span className="text-sm font-semibold text-foreground">{selected.size} selected</span>
          <span className="mx-1 h-4 w-px bg-ink/10" />
          <button
            type="button"
            onClick={() => runBulk("enable")}
            disabled={pending}
            className="rounded-full bg-violet px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
          >
            Expose
          </button>
          <button
            type="button"
            onClick={() => runBulk("disable")}
            disabled={pending}
            className="rounded-full border border-ink/15 px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-ink/5 disabled:opacity-60"
          >
            Hide
          </button>
          <span className="mx-1 h-4 w-px bg-ink/10" />
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value as PolicyDecision)}
            aria-label="Bulk policy decision"
            className="rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-sm font-medium text-foreground outline-none focus:border-violet/40 focus:ring-4 focus:ring-violet/10"
          >
            {DECISIONS.map((d) => (
              <option key={d} value={d}>
                {d.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => runBulk(decision)}
            disabled={pending}
            className="rounded-full border border-violet/30 bg-violet/5 px-3.5 py-1.5 text-sm font-semibold text-violet hover:bg-violet/10 disabled:opacity-60"
          >
            Set policy
          </button>
          {pending ? <Loader2 className="h-4 w-4 animate-spin text-violet" /> : null}
          <button
            type="button"
            onClick={clear}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>
      ) : null}

      {msg ? (
        <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">{msg}</p>
      ) : null}

      {groups.map((group) => {
        const ids = group.tools.map((t) => t.id);
        const selectedHere = ids.filter((id) => selected.has(id)).length;
        const allHere = selectedHere === ids.length && ids.length > 0;
        return (
          <GlassCard key={group.serverId} className="overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-ink/5 px-6 py-4">
              <input
                type="checkbox"
                checked={allHere}
                ref={(el) => {
                  if (el) el.indeterminate = selectedHere > 0 && !allHere;
                }}
                onChange={(e) => setMany(ids, e.target.checked)}
                aria-label={`Select all tools from ${group.serverName}`}
                className="h-4 w-4 rounded border-ink/25 text-violet focus:ring-violet/30"
              />
              <span className="inline-flex rounded-lg bg-violet/10 p-2">
                {group.transportType === "stdio" ? (
                  <TerminalSquare className="h-4 w-4 text-violet" aria-hidden="true" />
                ) : (
                  <Globe className="h-4 w-4 text-violet" aria-hidden="true" />
                )}
              </span>
              <div>
                <h2 className="font-semibold text-foreground">{group.serverName}</h2>
                <p className="font-mono text-xs text-muted-foreground">{group.prefix}.*</p>
              </div>
              <span className="ml-auto text-sm text-muted-foreground">
                {group.tools.filter((t) => t.enabled).length}/{group.tools.length} exposed
              </span>
            </div>
            <div className="divide-y divide-ink/5">
              {group.tools.map((tool) => {
                const isSel = selected.has(tool.id);
                return (
                  <div
                    key={tool.id}
                    className={cn(
                      "flex items-center gap-3 px-6 py-3.5 transition-colors",
                      isSel ? "bg-violet/[0.05]" : "hover:bg-violet/[0.03]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(tool.id)}
                      aria-label={`Select ${tool.exposedName}`}
                      className="h-4 w-4 rounded border-ink/25 text-violet focus:ring-violet/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-[13px] font-semibold text-foreground">{tool.exposedName}</p>
                        <span className="font-mono text-xs text-muted-foreground">← {tool.rawName}</span>
                        {tool.risk === "high" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                            poisoned definition
                          </span>
                        ) : tool.risk === "low" ? (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            hidden characters
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {tool.risk === "high"
                          ? `⚠ Tool definition matched injection heuristics (${tool.riskDetail}). Disabled by default — review before exposing.`
                          : tool.rawDescription}
                      </p>
                    </div>
                    <StatusBadge
                      label={tool.hasPolicy ? tool.decision : `${tool.decision} (default)`}
                      tone={decisionTone(tool.decision)}
                      className="hidden shrink-0 sm:inline-flex"
                    />
                    <ToolToggle toolId={tool.id} enabled={tool.enabled} label={tool.exposedName} />
                  </div>
                );
              })}
            </div>
          </GlassCard>
        );
      })}

      <p className="text-center text-xs text-muted-foreground">
        Tip: select tools with the checkboxes to expose, hide, or set a policy on many at once.
        {allIds.length > 0 ? ` ${allIds.length} tools total.` : ""}
      </p>
    </div>
  );
}
