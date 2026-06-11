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
import { getProfile } from "@/lib/auth/session";
import {
  currentProjectId,
  getUsage,
  listApprovals,
  listAudit,
  listPolicies,
  listServers,
  listTools,
} from "@/lib/db/repository";
import {
  GlassCard,
  PageHeader,
  StatusBadge,
  TimeAgo,
  statusTone,
} from "@/components/dashboard/primitives";
import { ApprovalActions } from "@/components/dashboard/interactive";
import { PLAN_LIMITS, type Plan, type UsageSnapshot } from "@/lib/dashboard/types";

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
            className="h-4 w-4 text-transparent transition-colors group-hover:text-muted-foreground"
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

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const over = !unlimited && used >= limit;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground/80">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
        <div
          className={over ? "h-full rounded-full bg-rose-500" : "h-full rounded-full bg-violet"}
          style={{ width: unlimited ? "8%" : `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}

function UsageCard({ plan, usage }: { plan: Plan; usage: UsageSnapshot }) {
  const limits = PLAN_LIMITS[plan];
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Plan usage</h2>
        <span className="rounded-full bg-violet/10 px-2.5 py-1 text-xs font-medium capitalize text-violet">
          {plan}
        </span>
      </div>
      <div className="mt-5 space-y-4">
        <Meter label="Agents" used={usage.agents} limit={limits.agents} />
        <Meter label="Connected tools" used={usage.tools} limit={limits.tools} />
        <Meter
          label="Protected actions this month"
          used={usage.actionsThisMonth}
          limit={limits.actionsPerMonth}
        />
      </div>
      <Link
        href="/#pricing"
        className="mt-5 inline-block text-sm font-medium text-violet hover:underline"
      >
        Upgrade plan →
      </Link>
    </GlassCard>
  );
}

export default async function OverviewPage() {
  const profile = await getProfile();
  const projectId = await currentProjectId();
  const [servers, tools, policies, approvals, audit, usage] = await Promise.all([
    listServers(projectId),
    listTools(projectId),
    listPolicies(projectId),
    listApprovals(projectId),
    listAudit(projectId),
    getUsage(projectId),
  ]);

  const serverNames = Object.fromEntries(servers.map((s) => [s.id, s.name]));
  const pending = approvals.filter((a) => a.status === "pending");
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const actionsToday = audit.filter((e) => e.timestamp >= startOfToday.getTime()).length;

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Connected MCPs" value={servers.length} href="/dashboard/servers" icon={Server} />
        <StatCard
          label="Exposed tools"
          value={tools.filter((t) => t.enabled).length}
          href="/dashboard/tools"
          icon={Wrench}
        />
        <StatCard label="Active policies" value={policies.length} href="/dashboard/policies" icon={ShieldCheck} />
        <StatCard label="Pending approvals" value={pending.length} href="/dashboard/approvals" icon={UserRoundCheck} />
        <StatCard label="Actions today" value={actionsToday} href="/dashboard/logs" icon={ScrollText} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Pending approvals</h2>
            <Link href="/dashboard/approvals" className="text-sm font-medium text-violet hover:underline">
              Open queue →
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Nothing waiting on a human right now.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pending.slice(0, 3).map((a) => (
                <div key={a.id} className="rounded-xl border border-ink/10 bg-white/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-foreground">{a.exposedTool}</p>
                    <StatusBadge label="waiting for approval" tone="review" />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    <span className="font-mono text-[13px]">{a.agent}</span> · {serverNames[a.serverId]} ·{" "}
                    <TimeAgo ts={a.requestedAt} />
                  </p>
                  <div className="mt-3">
                    <ApprovalActions approvalId={a.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {profile ? <UsageCard plan={profile.plan} usage={usage} /> : null}
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent activity</h2>
          <Link href="/dashboard/logs" className="text-sm font-medium text-violet hover:underline">
            All logs →
          </Link>
        </div>
        {audit.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No actions logged yet. Connect an agent to start the trail.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-ink/5">
            {audit.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate font-mono text-[13px] text-foreground">{entry.exposedTool}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge label={entry.status} tone={statusTone(entry.status)} />
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    <TimeAgo ts={entry.timestamp} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
