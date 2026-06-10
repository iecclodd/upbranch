import {
  EyeOff,
  FileClock,
  GitPullRequest,
  ShieldAlert,
} from "lucide-react";

const rows = [
  {
    label: "Agent request",
    value: 'github.delete_repository("acme/legacy-api")',
  },
  { label: "Policy match", value: "destructive_actions → require_approval" },
  { label: "Status", value: "Held until a human signs off" },
];

export function ProductMockup() {
  return (
    <div className="relative">
      <div className="absolute -left-6 top-12 z-10 hidden w-56 items-center gap-2.5 rounded-2xl border border-white/70 bg-white/80 p-3.5 text-sm font-medium text-foreground shadow-soft backdrop-blur-md lg:flex">
        <EyeOff className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
        Credential hidden from agent
      </div>
      <div className="absolute -right-5 bottom-14 z-10 hidden w-44 items-center gap-2.5 rounded-2xl border border-white/70 bg-white/80 p-3.5 text-sm font-medium text-foreground shadow-soft backdrop-blur-md lg:flex">
        <FileClock className="h-4 w-4 shrink-0 text-blush" aria-hidden="true" />
        Action logged
      </div>

      <div className="rounded-[26px] bg-ink p-2 shadow-panel">
        <div className="rounded-[20px] border border-white/[0.08] bg-[#1D1226] p-5 text-white sm:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <div>
                <p className="text-sm font-semibold">Polyshield Gateway</p>
                <p className="text-xs text-white/50">
                  Policy decision before execution
                </p>
              </div>
            </div>
            <span className="rounded-full border border-lavender/25 bg-lavender/10 px-3 py-1 text-xs font-medium text-[#E6D6FF]">
              Pending review
            </span>
          </div>

          <div className="space-y-2.5">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3"
              >
                <p className="text-xs text-white/45">{row.label}</p>
                <p className="mt-1 break-all font-mono text-sm text-white/95">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-blush/30 bg-blush/10 px-3.5 py-2.5 text-xs font-medium text-[#FFD5E8]">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Destructive action intercepted
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-medium text-white/75">
              <GitPullRequest className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              132 safe calls executed today
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white px-4 py-3 text-ink sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold">
              Waiting on human approval
            </span>
            <div className="flex gap-2">
              <button className="rounded-full border border-ink/15 px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5">
                Deny
              </button>
              <button className="rounded-full bg-violet px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-deep">
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
