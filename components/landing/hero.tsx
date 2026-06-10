import { Aurora } from "@/components/ui/aurora";
import { BlurFade } from "@/components/ui/blur-fade";
import { ProductMockup } from "@/components/landing/product-mockup";
import { WaitlistForm } from "@/components/landing/waitlist-form";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-10 pt-40 sm:pt-44">
      <div className="absolute inset-x-0 top-0 -z-10 h-[620px]">
        <Aurora
          colorStops={["#C9A7FF", "#E85C9E", "#6D35D4"]}
          blend={0.55}
          amplitude={1.1}
          speed={0.6}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
      </div>

      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <BlurFade>
          <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-foreground/75 shadow-chip backdrop-blur">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            Now onboarding design partners
          </div>
        </BlurFade>

        <BlurFade delay={0.08}>
          <h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Secure every AI agent action,{" "}
            <span className="font-serif italic text-violet">
              before it happens.
            </span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
            Polyshield sits between your agents and tools like GitHub, Stripe,
            and Slack — every tool call passes through policies, approvals, and
            audit logs before it touches a real API.
          </p>
        </BlurFade>

        <BlurFade delay={0.24}>
          <div id="waitlist" className="mt-9 flex scroll-mt-32 justify-center">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            MCP-native · Works with the agents you already run
          </p>
        </BlurFade>
      </div>

      <BlurFade delay={0.32} className="relative mx-auto mt-20 max-w-4xl px-4 sm:px-6">
        <ProductMockup />
      </BlurFade>
    </section>
  );
}
