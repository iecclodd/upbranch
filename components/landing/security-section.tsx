import { History, KeyRound, PauseCircle } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const pillars = [
  {
    title: "No raw tokens in agent context",
    description: "Credentials live in the vault and never touch the prompt.",
    icon: KeyRound,
  },
  {
    title: "No silent dangerous actions",
    description: "Destructive calls pause for a human before they execute.",
    icon: PauseCircle,
  },
  {
    title: "Complete action history",
    description: "Every request and decision is logged and reviewable.",
    icon: History,
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <BlurFade inView>
          <h2 className="mx-auto max-w-3xl text-balance text-center text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            The agent never gets{" "}
            <span className="font-serif italic text-violet">the keys.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-muted-foreground">
            Polyshield is the only path between the agent and your tools.
            Tokens stay vaulted, policies decide, and risky actions wait.
          </p>
        </BlurFade>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <BlurFade key={pillar.title} delay={index * 0.06} inView>
                <div className="h-full rounded-2xl bg-white p-7 shadow-chip ring-1 ring-ink/5">
                  <span className="inline-flex rounded-xl bg-blush/10 p-2.5">
                    <Icon className="h-5 w-5 text-blush" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {pillar.description}
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
