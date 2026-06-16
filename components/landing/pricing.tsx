import { BlurFade } from "@/components/ui/blur-fade";
import {
  PricingTiers,
  type PricingCta,
} from "@/components/pricing/pricing-tiers";
import type { BillingTier } from "@/lib/billing/plans";

/**
 * CTA mapping for the marketing landing section. Free signs up directly; the
 * paid self-serve plans send people to the full /pricing page to start a
 * trial; enterprise opens an email. Labels/hrefs live here, not in the shared
 * renderer, so the /pricing page can wire its own destinations.
 */
function landingCta(tier: BillingTier): PricingCta {
  if (tier.plan === "free") {
    return { label: "Start free", href: "/signin" };
  }
  if (tier.cta === "contact") {
    return { label: "Talk to us", href: "mailto:hello@polyshield.ai" };
  }
  return { label: "Start free trial", href: "/pricing" };
}

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
        <div className="mt-14">
          <PricingTiers ctaFor={landingCta} />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Protected actions are tool calls that pass through the Polyshield
          gateway. Need more?{" "}
          <a
            href="mailto:hello@polyshield.ai"
            className="font-medium text-violet underline-offset-4 hover:underline"
          >
            Let&apos;s talk.
          </a>
        </p>
        <p className="mt-4 text-center text-sm">
          <a
            href="/pricing"
            className="font-medium text-violet underline-offset-4 hover:underline"
          >
            See full plan comparison &rarr;
          </a>
        </p>
      </div>
    </section>
  );
}
