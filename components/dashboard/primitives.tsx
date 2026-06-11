"use client";

import { useEffect, useState, type ReactNode } from "react";
import { timeAgo } from "@/lib/dashboard/format";
import type { AuditStatus, PolicyDecision } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export type Tone = "good" | "review" | "bad" | "neutral" | "violet";

const dotColor: Record<Tone, string> = {
  good: "bg-emerald-500",
  review: "bg-amber-500",
  bad: "bg-rose-500",
  neutral: "bg-ink/30",
  violet: "bg-violet",
};

const textColor: Record<Tone, string> = {
  good: "text-emerald-700",
  review: "text-amber-700",
  bad: "text-rose-700",
  neutral: "text-foreground/55",
  violet: "text-violet-deep",
};

export function decisionTone(decision: PolicyDecision): Tone {
  if (decision === "allow") return "good";
  if (decision === "deny") return "bad";
  return "review";
}

export function statusTone(status: AuditStatus): Tone {
  if (status === "allowed" || status === "approved") return "good";
  if (status === "denied" || status === "blocked") return "bad";
  return "review";
}

/** A clean status pill: soft tinted background, leading dot, no heavy border. */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full bg-ink/[0.04] px-2.5 py-1 text-xs font-medium",
        textColor[tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[tone])} />
      {label.replaceAll("_", " ")}
    </span>
  );
}

/** A flat label chip for non-status metadata (kind, transport type). */
export function MetaChip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-md bg-ink/[0.04] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-foreground/50",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function TimeAgo({ ts }: { ts: number | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  if (ts === null || now === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <span>{timeAgo(ts, now)}</span>;
}

export function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/70 shadow-chip ring-1 ring-ink/[0.06] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <GlassCard className="flex flex-col items-center px-10 py-14 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </GlassCard>
  );
}
