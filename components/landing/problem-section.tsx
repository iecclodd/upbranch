import { Brain, FileWarning, KeyRound } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const problems = [
  {
    title: "Agents misunderstand instructions",
    description:
      "A vague task can turn into an action the user never meant to authorize.",
    icon: Brain,
  },
  {
    title: "Webpages inject malicious prompts",
    description:
      "Untrusted content can steer an agent toward tool calls that benefit someone else.",
    icon: FileWarning,
  },
  {
    title: "Broad tokens grant too much power",
    description:
      "One API key can be enough to read, write, refund, delete, or disclose data.",
    icon: KeyRound,
  },
];

export function ProblemSection() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <BlurFade inView>
          <h2 className="mx-auto max-w-3xl text-balance text-center text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Agents got real tools.{" "}
            <span className="font-serif italic text-violet">
              That changes the risk.
            </span>
          </h2>
        </BlurFade>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <BlurFade key={problem.title} delay={index * 0.06} inView>
                <article className="h-full rounded-2xl bg-white p-7 shadow-chip ring-1 ring-ink/5 transition-shadow hover:shadow-soft">
                  <span className="inline-flex rounded-xl bg-violet/10 p-2.5">
                    <Icon className="h-5 w-5 text-violet" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold text-foreground">
                    {problem.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-7 text-muted-foreground">
                    {problem.description}
                  </p>
                </article>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
