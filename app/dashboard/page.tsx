"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ScrollText,
  Server,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  GlassCard,
  PageHeader,
  Pill,
  TimeAgo,
  statusTone,
} from "@/components/dashboard/primitives";

function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group">
      <GlassCard className="h-full p-5 transition-shadow group-hover:shadow-soft">
        <div className="flex items-center justify-between">
          <span className="inline-flex rounded-xl bg-violet/10 p-2">
            <Icon className="h-4 w-4 text-violet" aria-hidden="true" />
          </span>
          <ArrowRight
            className="h-4 w-4 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </GlassCard>
    </Link>
  );
}

function ArchitectureStrip({ serverCount }: { serverCount: number }) {
  const nodes = [
    { title: "AI Agent", caption: "sees one MCP server" },
    { title: "Polyshield Gateway", caption: "policy · approvals · vault · logs" },
    { title: `${serverCount} connected MCPs`, caption: "raw tools stay downstream" },
  ];
  return (
    <GlassCard className="p-5">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {nodes.map((node, index) => (
          <div key={node.title} className="flex flex-1 items-center gap-3">
            <div
              className={
                index === 1
                  ? "flex-1 rounded-xl bg-ink px-4 py-3 text-center"
                  : "flex-1 rounded-xl border border-ink/10 bg-white px-4 py-3 text-center"
              }
            >
              <p
                className={
                  index === 1
                    ? "text-sm font-semibold text-white"
                    : "text-sm font-semibold text-foreground"
                }
              >
                {node.title}
              </p>
              <p
                className={
                  index === 1
                    ? "mt-0.5 text-xs text-lavender"
                    : "mt-0.5 text-xs text-muted-foreground"
                }
              >
                {node.caption}
              </p>
            </div>
            {index < nodes.length - 1 ? (
              <ArrowRight
                className="hidden h-4 w-4 shrink-0 text-violet sm:block"
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default function OverviewPage() {
  const { state, pendingCount, approve, deny } = useDashboard();

  const serverNames = useMemo(
    () => new Map(state.servers.map((s) => [s.id, s.name])),
    [state.servers],
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const actionsToday = state.audit.filter(
    (e) => e.timestamp >= startOfToday.getTime(),
  ).length;

  const pending = state.approvals.filter((a) => a.status === "pending");
  const recent = state.audit.slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Everything your agents requested, decided, and executed — through one gateway."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Connected MCP servers"
          value={state.servers.length}
          href="/dashboard/servers"
          icon={Server}
        />
        <StatCard
          label="Exposed tools"
          value={state.tools.filter((t) => t.enabled).length}
          href="/dashboard/tools"
          icon={Wrench}
        />
        <StatCard
          label="Active policies"
          value={state.policies.length}
          href="/dashboard/policies"
          icon={ShieldCheck}
        />
        <StatCard
          label="Pending approvals"
          value={pendingCount}
          href="/dashboard/approvals"
          icon={UserRoundCheck}
        />
        <StatCard
          label="Actions logged today"
          value={actionsToday}
          href="/dashboard/logs"
          icon={ScrollText}
        />
      </div>

      <ArchitectureStrip serverCount={state.servers.length} />

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Pending approvals</h2>
            <Link
              href="/dashboard/approvals"
              className="text-sm font-medium text-violet hover:underline"
            >
              Open queue →
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Nothing waiting. Run the demo to see an approval arrive.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pending.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-xl border border-ink/10 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {approval.exposedTool}
                    </p>
                    <Pill label="waiting for approval" tone="review" />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    <span className="font-mono text-[13px]">{approval.agent}</span>
                    {" · "}
                    {serverNames.get(approval.serverId)} ·{" "}
                    <TimeAgo ts={approval.requestedAt} />
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => approve(approval.id)}
                      className="rounded-full bg-violet px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-deep"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => deny(approval.id)}
                      className="rounded-full border border-ink/15 px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-ink/5"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent activity</h2>
            <Link
              href="/dashboard/logs"
              className="text-sm font-medium text-violet hover:underline"
            >
              All logs →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-ink/5">
            {recent.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Bot
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate font-mono text-[13px] text-foreground">
                    {entry.exposedTool}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Pill label={entry.status} tone={statusTone(entry.status)} />
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    <TimeAgo ts={entry.timestamp} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
