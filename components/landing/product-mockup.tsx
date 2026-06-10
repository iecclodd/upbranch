import { Check, Clock3, EyeOff, FileClock, OctagonAlert } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

const floatingCards = [
  { label: "Credential hidden from agent", icon: EyeOff },
  { label: "Prompt injection flagged", icon: OctagonAlert },
  { label: "Action logged", icon: FileClock },
  { label: "Approval required", icon: Clock3 },
];

const rows = [
  { label: "Agent request", value: "youtube.delete_video(video_id)" },
  { label: "Policy", value: "Requires approval" },
  { label: "Status", value: "Blocked until human approval" },
];

export function ProductMockup() {
  return (
    <BlurFade delay={0.14} className="relative mx-auto w-full max-w-xl">
      <div className="absolute -left-5 top-10 hidden w-52 rounded-lg border border-white/70 bg-white/80 p-3 text-sm shadow-soft backdrop-blur md:block">
        <div className="flex items-center gap-2 text-[#211327]">
          <EyeOff className="h-4 w-4 text-[#6D35D4]" aria-hidden="true" />
          Credential hidden from agent
        </div>
      </div>
      <div className="absolute -right-4 bottom-16 hidden w-48 rounded-lg border border-white/70 bg-white/85 p-3 text-sm shadow-soft backdrop-blur md:block">
        <div className="flex items-center gap-2 text-[#211327]">
          <FileClock className="h-4 w-4 text-[#E85C9E]" aria-hidden="true" />
          Action logged
        </div>
      </div>
      <div className="rounded-xl border border-[#211327]/10 bg-white/78 p-3 shadow-soft backdrop-blur">
        <div className="rounded-lg border border-[#211327]/10 bg-[#0B1026] p-4 text-white">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="text-sm font-medium">Polyshield Gateway</p>
              <p className="text-xs text-white/56">Policy decision before execution</p>
            </div>
            <span className="rounded-md border border-[#C9A7FF]/25 bg-[#C9A7FF]/10 px-2 py-1 text-xs text-[#E6D6FF]">
              Pending review
            </span>
          </div>
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-white/10 bg-white/[0.045] p-3"
              >
                <p className="text-xs text-white/50">{row.label}</p>
                <p className="mt-1 font-mono text-sm text-white">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {floatingCards.slice(1).map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 text-xs",
                    index === 0
                      ? "border-[#E85C9E]/30 bg-[#E85C9E]/10 text-[#FFD5E8]"
                      : "border-[#C9A7FF]/25 bg-white/[0.045] text-white/78",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {card.label}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[#211327]">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4 text-[#6D35D4]" aria-hidden="true" />
              Waiting on human approval
            </span>
            <button className="rounded-md bg-[#6D35D4] px-3 py-1.5 text-xs font-medium text-white">
              Review
            </button>
          </div>
        </div>
      </div>
    </BlurFade>
  );
}
