"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, Search } from "lucide-react";
import { formatTime } from "@/lib/dashboard/format";
import { decisionTone, statusTone } from "@/lib/dashboard/tones";
import type { AuditEntry, AuditStatus } from "@/lib/dashboard/types";
import { GlassCard, StatusBadge } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

type Filter = AuditStatus | "all" | "tool_calls" | "admin";

const FILTERS: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "all" },
  { label: "Tool calls", value: "tool_calls" },
  { label: "Admin", value: "admin" },
  { label: "Allowed", value: "allowed" },
  { label: "Waiting", value: "waiting_for_approval" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
  { label: "Blocked", value: "blocked" },
  { label: "Errors", value: "error" },
];

export function AuditLogsTable({
  entries,
  serverNames,
}: {
  entries: AuditEntry[];
  serverNames: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return entries.filter((e) => {
      const matchQuery =
        !q ||
        e.exposedTool.toLowerCase().includes(q) ||
        e.agent.toLowerCase().includes(q);
      const matchFilter =
        filter === "all"
          ? true
          : filter === "admin"
            ? e.eventType === "admin"
            : filter === "tool_calls"
              ? e.eventType !== "admin"
              : e.eventType !== "admin" && e.status === filter;
      return matchQuery && matchFilter;
    });
  }, [entries, query, filter]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `polyshield-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tool or agent…"
            className="w-full rounded-full border border-ink/10 bg-white/70 py-2 pl-9 pr-3 text-sm outline-none backdrop-blur transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f.value
                  ? "bg-ink text-white"
                  : "bg-white/60 text-foreground/55 ring-1 ring-ink/10 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={exportJson}
            className="flex items-center gap-1.5 rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-medium text-foreground/55 ring-1 ring-ink/10 transition-colors hover:text-foreground"
            aria-label="Export filtered entries as JSON"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            JSON
          </button>
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">
            No log entries match.
          </p>
        ) : (
          <div className="divide-y divide-ink/5">
            {filtered.map((entry) => {
              const isOpen = expanded === entry.id;
              return (
                <div key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-violet/[0.03] sm:px-6"
                  >
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0"
                    >
                      <ChevronDown
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </motion.span>
                    <time className="hidden w-20 shrink-0 font-mono text-xs text-muted-foreground sm:block">
                      {formatTime(entry.timestamp)}
                    </time>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground",
                        entry.eventType === "admin" ? "" : "font-mono",
                      )}
                    >
                      {entry.eventType === "admin" && entry.reason
                        ? entry.reason
                        : entry.exposedTool}
                    </span>
                    <span className="hidden shrink-0 text-sm text-muted-foreground md:block">
                      {serverNames[entry.serverId] ?? "—"}
                    </span>
                    <StatusBadge
                      label={entry.eventType === "admin" ? "admin" : entry.status}
                      tone={entry.eventType === "admin" ? "violet" : statusTone(entry.status)}
                      className="shrink-0"
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-ink/[0.02]"
                      >
                        <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
                          <Detail
                            label={entry.eventType === "admin" ? "Actor" : "Agent"}
                            value={entry.agent}
                            mono
                          />
                          <Detail
                            label={entry.eventType === "admin" ? "Target" : "Source MCP"}
                            value={
                              entry.eventType === "admin"
                                ? entry.exposedTool
                                : serverNames[entry.serverId] ?? "—"
                            }
                          />
                          {entry.eventType !== "admin" ? (
                            <Detail label="Decision">
                              <StatusBadge
                                label={entry.decision}
                                tone={decisionTone(entry.decision)}
                              />
                            </Detail>
                          ) : null}
                          {entry.eventType !== "admin" ? (
                            <Detail
                              label="Approver"
                              value={
                                entry.approver
                                  ? `${entry.approver}${entry.decidedVia ? ` (via ${entry.decidedVia})` : ""}`
                                  : "—"
                              }
                            />
                          ) : null}
                          <div className="sm:col-span-2">
                            <Detail label="Reason" value={entry.reason ?? "—"} />
                          </div>
                          {Object.keys(entry.args).length > 0 ? (
                            <div className="sm:col-span-2">
                              <Detail label="Arguments">
                                <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-ink p-3 font-mono text-xs leading-5 text-white/90">
                                  {JSON.stringify(entry.args, null, 2)}
                                </pre>
                              </Detail>
                            </div>
                          ) : null}
                          {entry.result !== undefined && entry.result !== null ? (
                            <div className="sm:col-span-2">
                              <Detail label="Result">
                                <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-ink p-3 font-mono text-xs leading-5 text-white/90">
                                  {JSON.stringify(entry.result, null, 2)}
                                </pre>
                              </Detail>
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children ?? (
        <p
          className={cn(
            "mt-1 text-sm text-foreground",
            mono && "font-mono text-[13px]",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}
