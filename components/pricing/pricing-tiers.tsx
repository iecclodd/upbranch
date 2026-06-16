import { Check } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { BILLING_TIERS, type BillingTier } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/** The label + destination for a tier's call-to-action button. */
export interface PricingCta {
  label: string;
  href: string;
}

interface PricingTiersProps {
  /**
   * Resolves the CTA (label + href) for a given tier. Each surface — the
   * landing section vs. the dedicated /pricing page — wires its own
   * destinations while sharing this one renderer, so the cards never drift.
   */
  ctaFor: (tier: BillingTier) => PricingCta;
}

/**
 * Shared presentational renderer for the pricing cards. Reads the tiers,
 * prices, perks, tagline, and highlight straight from BILLING_TIERS (the
 * single source of truth) so the marketing pricing always matches the app.
 */
export function PricingTiers({ ctaFor }: PricingTiersProps) {
  return (
    <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
      {BILLING_TIERS.map((tier, index) => {
        const cta = ctaFor(tier);
        return (
          <BlurFade
            key={tier.plan}
            delay={index * 0.06}
            inView
            className="h-full"
          >
            <article
              className={cn(
                "relative flex h-full flex-col rounded-2xl p-7",
                tier.highlight
                  ? "bg-ink text-white shadow-panel ring-1 ring-violet/40"
                  : "bg-white/80 shadow-chip ring-1 ring-ink/5 backdrop-blur",
              )}
            >
              {tier.highlight ? (
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
                  tier.highlight ? "text-lavender" : "text-violet",
                )}
              >
                {tier.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-medium tracking-tight">
                  {tier.priceLabel}
                </span>
                {tier.priceSuffix ? (
                  <span
                    className={cn(
                      "text-sm",
                      tier.highlight
                        ? "text-white/55"
                        : "text-muted-foreground",
                    )}
                  >
                    {tier.priceSuffix}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-3 text-sm leading-6",
                  tier.highlight ? "text-white/65" : "text-muted-foreground",
                )}
              >
                {tier.tagline}
              </p>
              <ul
                className={cn(
                  "mt-6 flex-1 space-y-2.5 border-t pt-6",
                  tier.highlight ? "border-white/10" : "border-ink/5",
                )}
              >
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      "flex items-start gap-2.5 text-sm leading-6",
                      tier.highlight ? "text-white/85" : "text-foreground/80",
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0",
                        tier.highlight ? "text-lavender" : "text-violet",
                      )}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={cta.href}
                className={cn(
                  "mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-all hover:scale-[1.02]",
                  tier.highlight
                    ? "bg-violet text-white hover:bg-violet-deep"
                    : "border border-ink/15 bg-white text-foreground hover:border-ink/30",
                )}
              >
                {cta.label}
              </a>
            </article>
          </BlurFade>
        );
      })}
    </div>
  );
}
