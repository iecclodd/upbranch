import { CheckCircle2, CircleSlash, Clock3 } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

const actions = [
  { name: "get_video_analytics", status: "Allowed", tone: "allowed" },
  { name: "suggest_title_changes", status: "Allowed", tone: "allowed" },
  { name: "delete_video", status: "Approval required", tone: "review" },
  { name: "upload_private_data", status: "Blocked", tone: "blocked" },
];

function ActionIcon({ tone }: { tone: string }) {
  if (tone === "allowed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
  }
  if (tone === "review") {
    return <Clock3 className="h-4 w-4 text-[#C9A7FF]" aria-hidden="true" />;
  }
  return <CircleSlash className="h-4 w-4 text-[#E85C9E]" aria-hidden="true" />;
}

export function DemoScenario() {
  return (
    <section
      id="demo"
      className="border-y border-[#211327]/10 bg-[#211327] px-4 py-20 text-white sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1fr] lg:items-center">
        <BlurFade inView>
          <h2 className="text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
            See what happens when an agent tries something risky.
          </h2>
          <p className="mt-4 max-w-xl leading-7 text-white/68">
            The agent can still do useful analysis, but sensitive actions move
            through deterministic policy checks before anything reaches the real
            API.
          </p>
        </BlurFade>
        <BlurFade delay={0.08} inView>
          <div className="rounded-xl border border-white/12 bg-white/[0.055] p-4">
            <div className="rounded-lg bg-[#0B1026] p-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-white/48">User asks</p>
                <p className="mt-2 text-sm text-white">
                  Analyze my YouTube channel and improve performance.
                </p>
              </div>
              <div className="mt-4 space-y-2">
                {actions.map((action) => (
                  <div
                    key={action.name}
                    className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-mono text-sm text-white/88">{action.name}</span>
                    <span
                      className={cn(
                        "inline-flex w-fit items-center gap-2 rounded-md border px-2.5 py-1 text-xs",
                        action.tone === "allowed" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
                        action.tone === "review" && "border-[#C9A7FF]/25 bg-[#C9A7FF]/10 text-[#E7DAFF]",
                        action.tone === "blocked" && "border-[#E85C9E]/25 bg-[#E85C9E]/10 text-[#FFD5E8]",
                      )}
                    >
                      <ActionIcon tone={action.tone} />
                      {action.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
