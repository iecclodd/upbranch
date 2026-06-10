import { Bot, Code2, Globe2, Headphones, Workflow } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const useCases = [
  { title: "AI coding agents", icon: Code2 },
  { title: "Browser agents", icon: Globe2 },
  { title: "Support agents", icon: Headphones },
  { title: "Sales/ops agents", icon: Workflow },
  { title: "Internal automation agents", icon: Bot },
];

export function UseCases() {
  return (
    <section id="use-cases" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <BlurFade inView>
          <h2 className="text-3xl font-semibold tracking-[-0.025em] text-[#211327] sm:text-4xl">
            Start with tool calls. Expand to agent runtime.
          </h2>
        </BlurFade>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <BlurFade key={useCase.title} delay={index * 0.04} inView>
                <article className="h-full rounded-xl border border-[#211327]/10 bg-white p-5 shadow-soft">
                  <Icon className="h-5 w-5 text-[#6D35D4]" aria-hidden="true" />
                  <h3 className="mt-6 text-base font-semibold text-[#211327]">
                    {useCase.title}
                  </h3>
                </article>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
