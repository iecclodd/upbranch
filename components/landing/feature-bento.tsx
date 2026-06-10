import {
  Archive,
  FileSearch,
  Fingerprint,
  GitPullRequest,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "MCP Tool Gateway",
    description: "Expose one safe gateway instead of handing agents every tool directly.",
    icon: GitPullRequest,
    className: "md:col-span-2",
  },
  {
    title: "Policy Engine",
    description: "Define allow, deny, and require-approval rules for every action.",
    icon: ShieldCheck,
  },
  {
    title: "Human Approvals",
    description: "Pause risky actions before they hit production systems.",
    icon: UserRoundCheck,
  },
  {
    title: "Credential Isolation",
    description: "Agents request actions. Polyshield holds the secrets.",
    icon: Fingerprint,
    className: "md:col-span-2",
  },
  {
    title: "Audit Logs",
    description: "Know who requested what, why it happened, and who approved it.",
    icon: Archive,
  },
  {
    title: "Prompt-Injection Guardrails",
    description: "Flag actions influenced by untrusted webpages, emails, or documents.",
    icon: FileSearch,
  },
];

export function FeatureBento() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <BlurFade inView>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.025em] text-[#211327] sm:text-4xl">
            Everything agents need. None of the unchecked authority.
          </h2>
        </BlurFade>
        <div className="mt-10 grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <BlurFade key={feature.title} delay={index * 0.04} inView>
                <article
                  className={cn(
                    "relative h-full overflow-hidden rounded-xl border border-[#211327]/10 bg-white p-6 shadow-soft",
                    feature.className,
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A7FF] to-transparent" />
                  <Icon className="h-5 w-5 text-[#6D35D4]" aria-hidden="true" />
                  <h3 className="mt-8 text-xl font-semibold text-[#211327]">{feature.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#6B7280]">
                    {feature.description}
                  </p>
                  <div className="mt-8 rounded-lg border border-[#211327]/10 bg-[#FAF8F5] p-3 font-mono text-xs text-[#4B3C52]">
                    policy: {feature.title.toLowerCase().replaceAll(" ", "_")}
                  </div>
                </article>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
