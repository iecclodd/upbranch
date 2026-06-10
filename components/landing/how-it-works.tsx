import { ArrowRight, Bot, CheckCircle2, GitBranch, UserCheck } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const steps = [
  { title: "Agent requests a tool call", icon: Bot },
  { title: "Polyshield checks policy", icon: GitBranch },
  { title: "Human approves risky actions", icon: UserCheck },
  { title: "Polyshield executes and logs the result", icon: CheckCircle2 },
];

const flow = ["AI Agent", "Polyshield Gateway", "Policy / Approval", "Tool/API"];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-[#211327]/10 bg-white/62 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <BlurFade inView>
          <h2 className="text-3xl font-semibold tracking-[-0.025em] text-[#211327] sm:text-4xl">
            Every action goes through Polyshield.
          </h2>
        </BlurFade>
        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <BlurFade key={step.title} delay={index * 0.05} inView>
                <div className="h-full rounded-xl border border-[#211327]/10 bg-[#FAF8F5] p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#211327] text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <Icon className="h-5 w-5 text-[#6D35D4]" aria-hidden="true" />
                  </div>
                  <p className="mt-5 text-base font-semibold text-[#211327]">{step.title}</p>
                </div>
              </BlurFade>
            );
          })}
        </div>
        <div className="mt-8 overflow-x-auto rounded-xl border border-[#211327]/10 bg-[#0B1026] p-4">
          <div className="flex min-w-[720px] items-center justify-between gap-3">
            {flow.map((item, index) => (
              <div key={item} className="flex flex-1 items-center gap-3">
                <div className="flex min-h-16 flex-1 items-center justify-center rounded-lg border border-white/12 bg-white/[0.055] px-4 text-center text-sm font-medium text-white">
                  {item}
                </div>
                {index < flow.length - 1 ? (
                  <ArrowRight className="h-5 w-5 shrink-0 text-[#C9A7FF]" aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
