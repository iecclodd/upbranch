import {
  Archive,
  FileSearch,
  Fingerprint,
  GitPullRequest,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { FeatureCardStack } from "@/components/landing/feature-card-stack";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

const features: Feature[] = [
  {
    title: "MCP Tool Gateway",
    description: "One safe gateway instead of handing agents every tool directly.",
    icon: GitPullRequest,
  },
  {
    title: "Policy Engine",
    description: "Allow, deny, and require-approval rules for every action.",
    icon: ShieldCheck,
  },
  {
    title: "Human Approvals",
    description: "Risky actions pause before they hit production systems.",
    icon: UserRoundCheck,
  },
  {
    title: "Credential Vault",
    description: "Agents request actions. Polyshield holds the secrets.",
    icon: Fingerprint,
  },
  {
    title: "Audit Logs",
    description: "Who requested what, why it ran, and who approved it.",
    icon: Archive,
  },
  {
    title: "Injection Guardrails",
    description: "Flag actions influenced by untrusted webpages or emails.",
    icon: FileSearch,
  },
];

export function Features() {
  return (
    <section id="product" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <div>
          <BlurFade inView>
            <h2 className="max-w-xl text-balance text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              One gateway.{" "}
              <span className="font-serif italic text-violet">
                Every safeguard.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
              Everything agents need to do real work — none of the unchecked
              authority.
            </p>
          </BlurFade>
          <div className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <BlurFade key={feature.title} delay={index * 0.05} inView>
                  <div className="flex gap-3.5">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet/10">
                      <Icon className="h-[18px] w-[18px] text-violet" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </BlurFade>
              );
            })}
          </div>
        </div>
        <div className="relative hidden h-[440px] lg:block">
          <FeatureCardStack />
        </div>
      </div>
    </section>
  );
}
