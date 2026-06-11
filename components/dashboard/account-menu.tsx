"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { signOutAction } from "@/app/dashboard/actions";
import type { Plan } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const planLabel: Record<Plan, string> = {
  free: "Free plan",
  builder: "Builder plan",
  team: "Team plan",
  enterprise: "Enterprise",
};

export function AccountMenu({
  email,
  fullName,
  avatarUrl,
  plan,
}: {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  plan: Plan;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (fullName ?? email ?? "?").charAt(0).toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-ink/[0.06] bg-white/70 py-1.5 pl-1.5 pr-3.5 shadow-chip backdrop-blur-xl transition-colors hover:bg-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-violet text-xs font-semibold text-white">
            {initial}
          </span>
        )}
        <span className="hidden text-sm font-medium text-foreground sm:block">
          {fullName ?? email}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-ink/[0.06] bg-white/90 shadow-soft backdrop-blur-xl"
        >
          <div className="border-b border-ink/5 p-4">
            <p className="truncate text-sm font-semibold text-foreground">
              {fullName ?? "Signed in"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <span
              className={cn(
                "mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-violet/10 px-2.5 py-1 text-xs font-medium text-violet",
              )}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {planLabel[plan]}
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-ink/[0.03]"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
