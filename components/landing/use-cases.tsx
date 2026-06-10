import { GitBranch, Headphones, Workflow } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { DisplayCards } from "@/components/ui/display-cards";

const cards = [
  {
    icon: <GitBranch className="size-4 text-violet" aria-hidden="true" />,
    title: "Coding agents",
    description: "Gate force-pushes, merges, and deletes",
    date: "github.* · gitlab.*",
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:rounded-2xl before:h-[100%] before:content-[''] before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <Headphones className="size-4 text-violet" aria-hidden="true" />,
    title: "Support agents",
    description: "Refunds wait for human approval",
    date: "stripe.* · zendesk.*",
    className:
      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:rounded-2xl before:h-[100%] before:content-[''] before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <Workflow className="size-4 text-violet" aria-hidden="true" />,
    title: "Ops automations",
    description: "Secrets never enter the prompt",
    date: "internal APIs",
    className:
      "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
  },
];

const more = ["Browser agents", "Sales agents", "Research agents"];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <BlurFade inView>
          <h2 className="max-w-xl text-balance text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Built for every agent with{" "}
            <span className="font-serif italic text-violet">real access.</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            Start with tool calls, expand to the whole agent runtime. If it can
            touch production, it should go through Polyshield.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {more.map((label) => (
              <span
                key={label}
                className="rounded-full border border-ink/10 bg-white px-4 py-1.5 text-sm font-medium text-foreground/70"
              >
                {label}
              </span>
            ))}
          </div>
        </BlurFade>
        <BlurFade delay={0.1} inView className="hidden sm:block">
          <div className="flex min-h-[380px] items-center justify-center pb-16 pr-10">
            <DisplayCards cards={cards} />
          </div>
        </BlurFade>
        <div className="grid gap-3 sm:hidden">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl bg-white p-5 shadow-chip ring-1 ring-ink/5"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex rounded-full bg-violet/10 p-1.5">
                  {card.icon}
                </span>
                <p className="font-semibold text-foreground">{card.title}</p>
              </div>
              <p className="mt-2.5 text-sm text-muted-foreground">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
