import { BlurFade } from "@/components/ui/blur-fade";

const steps = [
  {
    number: "01",
    title: "Agent requests a tool call",
    description:
      "Your agent goes through Polyshield's MCP gateway instead of hitting APIs directly.",
  },
  {
    number: "02",
    title: "Polyshield checks policy",
    description:
      "Deterministic rules decide in milliseconds: allow, block, or escalate.",
  },
  {
    number: "03",
    title: "A human approves the risky stuff",
    description:
      "Sensitive actions pause for sign-off while everything else keeps flowing.",
  },
  {
    number: "04",
    title: "Polyshield executes and logs it",
    description:
      "Approved calls run with vaulted credentials and land in the audit trail.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <BlurFade inView>
          <h2 className="mx-auto max-w-3xl text-balance text-center text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Every action goes{" "}
            <span className="font-serif italic text-violet">through</span>{" "}
            Polyshield.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-muted-foreground">
            One gateway between your agents and the real world. Nothing
            executes without passing a policy check first.
          </p>
        </BlurFade>
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((step, index) => (
            <BlurFade key={step.number} delay={index * 0.07} inView>
              <div className="relative h-full">
                <span className="font-mono text-sm font-medium text-violet">
                  {step.number}
                </span>
                <div
                  className="mt-3 h-px w-full bg-gradient-to-r from-violet/40 to-transparent"
                  aria-hidden="true"
                />
                <h3 className="mt-5 text-lg font-semibold leading-snug text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
