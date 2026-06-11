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
        initial={{ y: 24, opacity: 0, filter: "blur(6px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        aria-label="Dashboard"
        className="pointer-events-auto flex items-center gap-0.5 rounded-[24px] border border-white/60 bg-gradient-to-b from-white/80 to-white/40 p-2 shadow-[0_20px_50px_-12px_rgba(33,19,39,0.28),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl backdrop-saturate-150"
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
              className="group relative"
            >
              <motion.span
                whileHover={{ scale: 1.18, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="relative flex rounded-xl p-2.5"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active
                      ? "text-violet drop-shadow-[0_1px_8px_rgba(109,53,212,0.5)]"
                      : "text-foreground/45 group-hover:text-foreground/85",
                  )}
                  strokeWidth={active ? 2.3 : 2}
                  aria-hidden="true"
                />
                {showBadge ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {pendingCount}
                  </span>
                ) : null}
              </motion.span>
              {active ? (
                <motion.span
                  layoutId="dock-active"
                  className="absolute bottom-0 left-0 right-0 mx-auto h-1 w-1 rounded-full bg-violet shadow-[0_0_8px_rgba(109,53,212,0.8)]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              ) : null}
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink/90 px-2 py-1 text-xs font-medium text-white opacity-0 backdrop-blur transition-all duration-150 group-hover:-top-10 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}
