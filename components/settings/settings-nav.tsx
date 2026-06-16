"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/settings", label: "General" },
  { href: "/dashboard/settings/security", label: "Security" },
  { href: "/dashboard/settings/notifications", label: "Notifications" },
  { href: "/dashboard/settings/billing", label: "Billing" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-ink/10" aria-label="Settings sections">
      {TABS.map((t) => {
        const active = t.href === "/dashboard/settings" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "text-violet" : "text-foreground/55 hover:text-foreground",
            )}
          >
            {t.label}
            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-violet" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
