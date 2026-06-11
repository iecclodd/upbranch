"use client";

import { useEffect, useState, type ReactNode } from "react";
import { timeAgo } from "@/lib/dashboard/format";
import type { AuditStatus, PolicyDecision } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export type PillTone = "good" | "review" | "bad" | "neutral" | "violet";

const toneClasses: Record<PillTone, string> = {
  good: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  review: "border-violet/25 bg-violet/10 text-violet",
  bad: "border-blush/30 bg-blush/10 text-[#B3266C]",
  neutral: "border-ink/10 bg-ink/5 text-foreground/60",
  violet: "border-lavender/40 bg-lavender/15 text-violet-deep",
};

export function decisionTone(decision: PolicyDecision): PillTone {
  if (decision === "allow") return "good";
  if (decision === "deny") return "bad";
  return "review";
}

export function statusTone(status: AuditStatus): PillTone {
  if (status === "allowed" || status === "approved") return "good";
  if (status === "denied" || status === "blocked") return "bad";
  return "review";
}

export function Pill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: PillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}

/**
 * Relative timestamps are rendered only after mount so server and client
 * markup match (the seed is built with Date.now()).
 */
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
        "rounded-2xl bg-white/80 shadow-chip ring-1 ring-ink/5 backdrop-blur",
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
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <GlassCard className="p-10 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        {body}
      </p>
    </GlassCard>
  );
}
