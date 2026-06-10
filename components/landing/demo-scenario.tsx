import { CheckCircle2, CircleSlash, Clock3 } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderGlow } from "@/components/ui/border-glow";
import { cn } from "@/lib/utils";

const actions = [
  { name: "github.list_repositories", status: "Allowed", tone: "allowed" },
  {
    name: "github.update_repository(archived: true)",
    status: "Allowed",
    tone: "allowed",
  },
  {
    name: "github.merge_pull_request",
    status: "Approval required",
    tone: "review",
  },
  { name: "github.delete_repository", status: "Blocked", tone: "blocked" },
];

function ActionIcon({ tone }: { tone: string }) {
  if (tone === "allowed") {
    return (
      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
    );
  }
  if (tone === "review") {
    return <Clock3 className="h-4 w-4 text-lavender" aria-hidden="true" />;
  }
  return <CircleSlash className="h-4 w-4 text-blush" aria-hidden="true" />;
}

export function DemoScenario() {
  return (
    <section id="demo" className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-[32px] bg-ink px-6 py-16 sm:px-12 lg:px-16">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1fr]">
          <BlurFade inView>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lavender">
              Live policy decisions
            </p>
            <h2 className="mt-4 text-balance text-4xl font-medium tracking-tight text-white sm:text-5xl">
              Watch Polyshield catch the{" "}
              <span className="font-serif italic text-[#E2CFFF]">
                risky call.
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">
              Ask an agent to clean up your GitHub org. It can list and archive
              all day — but the moment it reaches for{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-white/90">
                delete_repository
              </code>
              , the call stops at the gateway.
            </p>
          </BlurFade>
          <BlurFade delay={0.1} inView>
            <BorderGlow
              backgroundColor="#1D1226"
              borderRadius={24}
              colors={["#C9A7FF", "#E85C9E", "#8B5CF6"]}
              glowColor="270 80 85"
            >
              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-white/45">User asks the agent</p>
                  <p className="mt-1.5 text-sm text-white">
                    &quot;Clean up our GitHub org — archive anything stale.&quot;
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {actions.map((action) => (
                    <div
                      key={action.name}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="break-all font-mono text-[13px] text-white/90">
                        {action.name}
                      </span>
                      <span
                        className={cn(
                          "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                          action.tone === "allowed" &&
                            "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
                          action.tone === "review" &&
                            "border-lavender/25 bg-lavender/10 text-[#E7DAFF]",
                          action.tone === "blocked" &&
                            "border-blush/25 bg-blush/10 text-[#FFD5E8]",
                        )}
                      >
                        <ActionIcon tone={action.tone} />
                        {action.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </BorderGlow>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
