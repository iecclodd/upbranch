"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LayoutDashboard,
  Play,
  ScrollText,
  Server,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/landing/logo";
import {
  DashboardProvider,
  useDashboard,
  type Toast,
} from "@/components/dashboard/dashboard-provider";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/servers", label: "MCP Servers", icon: Server },
  { href: "/dashboard/tools", label: "Tool Catalog", icon: Wrench },
  { href: "/dashboard/policies", label: "Policies", icon: ShieldCheck },
  { href: "/dashboard/approvals", label: "Approvals", icon: UserRoundCheck },
  { href: "/dashboard/logs", label: "Audit Logs", icon: ScrollText },
];

function NavLink({ item, badge }: { item: NavItem; badge?: number }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-violet/10 text-violet"
          : "text-foreground/60 hover:bg-ink/5 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {badge ? (
        <span className="rounded-full bg-violet px-2 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar() {
  const { pendingCount } = useDashboard();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink/5 px-5 py-6 lg:flex">
      <Link href="/" className="px-2">
        <Logo />
      </Link>
      <nav className="mt-8 flex flex-col gap-1" aria-label="Dashboard">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            badge={item.href === "/dashboard/approvals" ? pendingCount : 0}
          />
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-ink/5 bg-white/70 p-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
          Agent endpoint
        </p>
        <p className="mt-2 break-all rounded-lg bg-ink px-3 py-2 font-mono text-[11px] leading-5 text-white/90">
          https://gw.polyshield.dev/mcp
        </p>
        <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
          Your agent connects to this one MCP server. Polyshield handles the
          rest.
        </p>
      </div>
    </aside>
  );
}

function MobileNav() {
  const { pendingCount } = useDashboard();
  const pathname = usePathname();
  return (
    <nav
      className="-mx-1 mb-6 flex gap-1.5 overflow-x-auto pb-1 lg:hidden"
      aria-label="Dashboard"
    >
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-violet/10 text-violet"
                : "bg-white/70 text-foreground/60 ring-1 ring-ink/5",
            )}
          >
            {item.label}
            {item.href === "/dashboard/approvals" && pendingCount > 0 ? (
              <span className="rounded-full bg-violet px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Topbar() {
  const { runDemo, demoRunning } = useDashboard();
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 rounded-full border border-ink/10 bg-white/70 py-1.5 pl-3.5 pr-4 text-sm backdrop-blur">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
        <span className="truncate text-foreground/70">
          <span className="font-mono text-[13px]">demo-agent</span> connected
          via Polyshield MCP
        </span>
      </div>
      <button
        type="button"
        onClick={runDemo}
        disabled={demoRunning}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-violet-deep",
          demoRunning && "cursor-wait opacity-70 hover:scale-100",
        )}
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        {demoRunning ? "Demo running…" : "Run demo"}
      </button>
    </div>
  );
}

const toastIcons: Record<Toast["tone"], LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};

const toastIconColor: Record<Toast["tone"], string> = {
  info: "text-violet",
  success: "text-emerald-600",
  warn: "text-amber-500",
  error: "text-[#B3266C]",
};

function Toasts() {
  const { toasts, dismissToast } = useDashboard();
  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2.5"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.tone];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-ink/5 bg-white/90 p-4 shadow-soft backdrop-blur-xl"
          >
            <Icon
              className={cn("mt-0.5 h-4 w-4 shrink-0", toastIconColor[toast.tone])}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="break-words font-mono text-[13px] font-semibold text-foreground">
                {toast.title}
              </p>
              {toast.body ? (
                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                  {toast.body}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-ink/5 hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-[radial-gradient(55%_35%_at_75%_-5%,rgba(201,167,255,0.22),transparent_70%),radial-gradient(40%_30%_at_15%_-5%,rgba(232,92,158,0.1),transparent_70%)]">
        <div className="mx-auto flex max-w-[1440px]">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <Topbar />
            <MobileNav />
            {children}
          </main>
        </div>
        <Toasts />
      </div>
    </DashboardProvider>
  );
}
