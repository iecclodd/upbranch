"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ScrollText,
  Server,
  ShieldCheck,
  UserRoundCheck,
  Bot,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DockItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const items: DockItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/servers", label: "MCP Servers", icon: Server },
  { href: "/dashboard/tools", label: "Tools", icon: Wrench },
  { href: "/dashboard/policies", label: "Policies", icon: ShieldCheck },
  { href: "/dashboard/approvals", label: "Approvals", icon: UserRoundCheck },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/logs", label: "Audit Logs", icon: ScrollText },
];

export function Dock({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <motion.nav
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        aria-label="Dashboard"
        className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/60 bg-white/70 p-1.5 shadow-soft backdrop-blur-xl"
      >
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge =
            item.href === "/dashboard/approvals" && pendingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative rounded-xl p-2.5 transition-colors",
                active ? "bg-violet text-white" : "text-foreground/55 hover:bg-ink/5",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {showBadge ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {pendingCount}
                </span>
              ) : null}
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}
