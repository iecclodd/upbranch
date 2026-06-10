import { History, KeyRound, PauseCircle } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const pillars = [
  { title: "No raw tokens in agent context", icon: KeyRound },
  { title: "No silent dangerous actions", icon: PauseCircle },
  { title: "Complete action history", icon: History },
];

export function SecuritySection() {
  return (
    <section
      id="security"
      className="border-y border-[#211327]/10 bg-white/62 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-start">
        <BlurFade inView>
          <h2 className="text-3xl font-semibold tracking-[-0.025em] text-[#211327] sm:text-4xl">
            The agent never gets the keys.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-[#6B7280]">
            Polyshield is designed to be the only path between the agent and
            your tools. Tokens stay in Polyshield, policies decide what happens,
            and risky actions pause for approval.
          </p>
        </BlurFade>
        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <BlurFade key={pillar.title} delay={index * 0.05} inView>
                <div className="h-full rounded-xl border border-[#211327]/10 bg-white p-5 shadow-soft">
                  <Icon className="h-5 w-5 text-[#E85C9E]" aria-hidden="true" />
                  <p className="mt-6 text-sm font-semibold leading-6 text-[#211327]">
                    {pillar.title}
                  </p>
                </div>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
