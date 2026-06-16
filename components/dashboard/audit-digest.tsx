"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Eye, Info, Loader2, Sparkles } from "lucide-react";
import {
  aiAuditDigestAction,
  type AuditDigestResult,
  type DigestLevel,
} from "@/app/dashboard/ai-actions";
import { GlassCard } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

const LEVEL: Record<DigestLevel, { Icon: typeof Info; badge: string; dot: string }> = {
  alert: { Icon: AlertTriangle, badge: "text-rose-700", dot: "bg-rose-500" },
  watch: { Icon: Eye, badge: "text-amber-700", dot: "bg-amber-500" },
  info: { Icon: Info, badge: "text-violet", dot: "bg-violet" },
};

/**
 * On-demand AI summary of recent agent activity. The button is explicit (and
 * the action is rate-limited server-side) so a paid user controls when a model
 * call happens. Reads only audit metadata — never tool arguments or results.
 */
export function AuditDigest({ canUseAi }: { canUseAi: boolean }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<AuditDigestResult | null>(null);

  function run() {
    start(async () => setRes(await aiAuditDigestAction()));
  }

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-lg bg-violet/10 p-1.5">
            <Sparkles className="h-4 w-4 text-violet" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-foreground">AI activity digest</h2>
            <p className="text-xs text-muted-foreground">
              A plain-English read of what your agents did, and anything worth a look.
            </p>
          </div>
        </div>
        {canUseAi ? (
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {res ? "Refresh" : "Generate digest"}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/5 px-4 py-2 text-sm font-semibold text-violet transition-colors hover:bg-violet/10"
          >
            Upgrade for AI digests
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {!canUseAi ? (
        <p className="mt-3 text-sm text-muted-foreground">
          The AI copilot — approval review, plain-English policy drafting, and these activity
          digests — is included on Builder and up.
        </p>
      ) : null}

      {res?.counts && (res.summary || (res.highlights && res.highlights.length > 0) || res.message) ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Chip label={`${res.counts.total} calls`} />
          <Chip label={`${res.counts.allowed} allowed`} tone="emerald" />
          {res.counts.held > 0 ? <Chip label={`${res.counts.held} held`} tone="amber" /> : null}
          {res.counts.denied > 0 ? <Chip label={`${res.counts.denied} denied`} tone="rose" /> : null}
          {res.counts.blocked > 0 ? <Chip label={`${res.counts.blocked} blocked`} tone="rose" /> : null}
        </div>
      ) : null}

      {res?.summary ? (
        <p className="mt-3 text-sm leading-6 text-foreground/80">{res.summary}</p>
      ) : null}

      {res?.highlights && res.highlights.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {res.highlights.map((h, i) => {
            const L = LEVEL[h.level];
            return (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <L.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", L.badge)} aria-hidden="true" />
                <span className="text-foreground/80">{h.text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {res && !res.ok && res.message ? (
        <p className="mt-3 text-sm text-rose-600">{res.message}</p>
      ) : null}
    </GlassCard>
  );
}

function Chip({ label, tone = "violet" }: { label: string; tone?: "violet" | "emerald" | "amber" | "rose" }) {
  const tones: Record<string, string> = {
    violet: "bg-violet/10 text-violet",
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    rose: "bg-rose-500/10 text-rose-700",
  };
  return <span className={cn("rounded-full px-2.5 py-1 font-semibold", tones[tone])}>{label}</span>;
}
