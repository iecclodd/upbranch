import type { Metadata } from "next";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import {
  PricingTiers,
  type PricingCta,
} from "@/components/pricing/pricing-tiers";
import { BlurFade } from "@/components/ui/blur-fade";
import type { BillingTier } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing — PolyShield",
  description:
    "Plans that scale with how much power you hand your agents. Start free, add guardrails as the blast radius grows.",
};

/**
 * CTA mapping for the dedicated pricing page. Self-serve checkout needs an
 * account, so paid plans route through /signin; enterprise opens an email.
 */
function pricingPageCta(tier: BillingTier): PricingCta {
  if (tier.plan === "free") {
    return { label: "Start free", href: "/signin" };
  }
  if (tier.cta === "contact") {
    return { label: "Talk to us", href: "mailto:hello@polyshield.ai" };
  }
  return { label: "Start free trial", href: "/signin" };
}

const reassurances = [
  {
    question: "What counts as a protected action?",
    answer:
      "Every tool call an agent makes through the Polyshield gateway — reads, writes, shell commands, API calls. Calls that your policy auto-allows still count; blocked and pending-approval calls count too. The number on each plan is the monthly ceiling.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes. Upgrade or downgrade whenever you want — changes prorate, and your policies, approvals, and audit history come with you. No migration, no re-onboarding your agents.",
  },
  {
    question: "What happens when I hit a plan limit?",
    answer:
      "Nothing breaks mid-flight. You keep your enforcement and approvals; we let you know you're near the ceiling so you can upgrade before it bites. We don't silently drop protection.",
  },
  {
    question: "Is the free plan a trial?",
    answer:
      "No. Free is free for as long as you want — one project, one agent, the full deterministic policy engine, approvals, and the prompt-injection shield. Paid plans add scale, the AI copilot, advanced sandboxing, and team controls.",
  },
  {
    question: "Do you offer self-hosted or on-prem?",
    answer:
      "On Enterprise. You run the runners in your own environment, keep your own data retention, and we'll do a DPA and compliance review. Talk to us and we'll scope it.",
  },
];

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <Navbar />

      {/* Hero */}
      <section className="px-4 pb-12 pt-36 sm:px-6 sm:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <BlurFade inView>
            <span className="inline-flex items-center rounded-full bg-violet/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet">
              Pricing
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-medium tracking-tight text-foreground sm:text-6xl">
              Pricing that scales with how much you{" "}
              <span className="font-serif italic text-violet">
                trust your agents.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
              Start free while you wire up your first MCP server. Add guardrails
              — scale, AI review, team controls — as you hand your agents more
              real-world power. The price grows with the blast radius, not before.
            </p>
          </BlurFade>
        </div>
      </section>

      {/* Tiers */}
      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <PricingTiers ctaFor={pricingPageCta} />
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Protected actions are tool calls that pass through the Polyshield
            gateway. Prices are per workspace, billed monthly. Paid plans start
            with a free trial — no card to look around.
          </p>
        </div>
      </section>

      {/* What you always get */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <h2 className="text-balance text-center text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              On every plan,{" "}
              <span className="font-serif italic text-violet">
                including free.
              </span>
            </h2>
          </BlurFade>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Deterministic enforcement",
                body: "Policy is the source of truth — not a model's opinion. The same rule decides the same way every time, and you can read why a call was blocked.",
              },
              {
                title: "Human in the loop",
                body: "Risky calls hold for approval instead of running on a guess. You see the exact tool, arguments, and context before anything touches your systems.",
              },
              {
                title: "Prompt-injection shield",
                body: "Tool output is screened before it reaches the model, so a poisoned web page or file can't quietly rewrite what your agent does next.",
              },
            ].map((item, index) => (
              <BlurFade key={item.title} delay={index * 0.06} inView className="h-full">
                <div className="flex h-full flex-col rounded-2xl bg-white/80 p-7 shadow-chip ring-1 ring-ink/5 backdrop-blur">
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Reassurance / FAQ */}
      <section className="px-4 pb-24 pt-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-balance text-center text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            The honest{" "}
            <span className="font-serif italic text-violet">answers.</span>
          </h2>
          <dl className="mt-12 divide-y divide-ink/5 rounded-2xl bg-white shadow-chip ring-1 ring-ink/5">
            {reassurances.map((item) => (
              <div key={item.question} className="px-6 py-6">
                <dt className="text-base font-semibold text-foreground">
                  {item.question}
                </dt>
                <dd className="mt-2 text-[15px] leading-7 text-muted-foreground">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Still deciding?{" "}
            <a
              href="mailto:hello@polyshield.ai"
              className="font-medium text-violet underline-offset-4 hover:underline"
            >
              Email us
            </a>{" "}
            — we&apos;ll help you pick the plan that fits your blast radius.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
