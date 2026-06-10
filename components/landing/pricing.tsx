import { Check } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For individual builders testing agent safety.",
    features: [
      "1 project",
      "1 agent",
      "3 connected tools",
      "100 protected actions/month",
      "Basic policies",
      "Basic audit logs",
    ],
    cta: "Start free",
    href: "#waitlist",
  },
  {
    name: "Builder",
    price: "$29",
    period: "/mo",
    description: "For builders connecting agents to real workflows.",
    features: [
      "5 agents",
      "10 connected tools",
      "5,000 protected actions/month",
      "Approval queue",
      "Credential vault",
      "Policy templates",
      "30-day audit logs",
    ],
    cta: "Join waitlist",
    href: "#waitlist",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$149",
    period: "/mo",
    description: "For teams deploying agents internally.",
    features: [
      "Unlimited agents",
      "Unlimited tools",
      "50,000 protected actions/month",
      "Shared policies",
      "Team dashboard",
      "Multiple approvers",
      "Slack approvals",
      "Longer audit logs",
    ],
    cta: "Join waitlist",
    href: "#waitlist",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For companies deploying production agents.",
    features: [
      "SSO/SAML",
      "RBAC",
      "Compliance exports",
      "VPC/on-prem options",
      "Custom retention",
      "Dedicated support",
    ],
    cta: "Talk to us",
    href: "mailto:hello@polyshield.ai",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <BlurFade inView>
          <h2 className="mx-auto max-w-3xl text-balance text-center text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Simple pricing,{" "}
            <span className="font-serif italic text-violet">
              serious guardrails.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-muted-foreground">
            Start free while you wire things up. Upgrade when your agents start
            doing real work.
          </p>
        </BlurFade>
        <div className="mt-14 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, index) => (
            <BlurFade
              key={plan.name}
              delay={index * 0.06}
              inView
              className="h-full"
            >
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-2xl p-7",
                  plan.highlighted
                    ? "bg-ink text-white shadow-panel ring-1 ring-violet/40"
                    : "bg-white/80 shadow-chip ring-1 ring-ink/5 backdrop-blur",
                )}
              >
                {plan.highlighted ? (
                  <>
                    <div
                      className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lavender to-transparent"
                      aria-hidden="true"
                    />
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-violet px-3.5 py-1 text-xs font-semibold text-white shadow-chip">
                      Recommended
                    </span>
                  </>
                ) : null}
                <h3
                  className={cn(
                    "text-sm font-semibold uppercase tracking-[0.14em]",
                    plan.highlighted ? "text-lavender" : "text-violet",
                  )}
                >
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-medium tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period ? (
                    <span
                      className={cn(
                        "text-sm",
                        plan.highlighted
                          ? "text-white/55"
                          : "text-muted-foreground",
                      )}
                    >
                      {plan.period}
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-3 text-sm leading-6",
                    plan.highlighted ? "text-white/65" : "text-muted-foreground",
                  )}
                >
                  {plan.description}
                </p>
                <ul
                  className={cn(
                    "mt-6 flex-1 space-y-2.5 border-t pt-6",
                    plan.highlighted ? "border-white/10" : "border-ink/5",
                  )}
                >
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={cn(
                        "flex items-start gap-2.5 text-sm leading-6",
                        plan.highlighted ? "text-white/85" : "text-foreground/80",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0",
                          plan.highlighted ? "text-lavender" : "text-violet",
                        )}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className={cn(
                    "mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-all hover:scale-[1.02]",
                    plan.highlighted
                      ? "bg-violet text-white hover:bg-violet-deep"
                      : "border border-ink/15 bg-white text-foreground hover:border-ink/30",
                  )}
                >
                  {plan.cta}
                </a>
              </article>
            </BlurFade>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Protected actions are tool calls that pass through the Polyshield
          gateway. Need more? <a href="mailto:hello@polyshield.ai" className="font-medium text-violet underline-offset-4 hover:underline">Let&apos;s talk.</a>
        </p>
      </div>
    </section>
  );
}
