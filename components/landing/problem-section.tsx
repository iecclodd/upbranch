import { Brain, FileWarning, KeyRound } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const problems = [
  {
    title: "Agents can misunderstand instructions",
    description:
      "A vague task can turn into an action the user never meant to authorize.",
    icon: Brain,
  },
  {
    title: "Webpages can inject malicious prompts",
    description:
      "Untrusted content can steer an agent toward tool calls that benefit someone else.",
    icon: FileWarning,
  },
  {
    title: "Broad tokens give agents too much power",
    description:
      "One API key can be enough to read, write, refund, delete, or disclose data.",
    icon: KeyRound,
  },
];

export function ProblemSection() {
  return (
    <section id="product" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <BlurFade inView>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.025em] text-[#211327] sm:text-4xl">
            AI agents are getting access to real tools. That changes the risk.
          </h2>
        </BlurFade>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <BlurFade key={problem.title} delay={index * 0.05} inView>
                <article className="h-full rounded-xl border border-[#211327]/10 bg-white p-6 shadow-soft">
                  <Icon className="h-5 w-5 text-[#6D35D4]" aria-hidden="true" />
                  <h3 className="mt-5 text-lg font-semibold text-[#211327]">
                    {problem.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#6B7280]">
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
