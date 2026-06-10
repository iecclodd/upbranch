import { ArrowRight, Play } from "lucide-react";
import { ProductMockup } from "@/components/landing/product-mockup";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { BlurFade } from "@/components/ui/blur-fade";

export function Hero() {
  return (
    <section className="relative isolate border-b border-[#211327]/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,rgba(201,167,255,0.35),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(232,92,158,0.16),transparent_25%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.88fr]">
        <div>
          <BlurFade>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-[-0.04em] text-[#211327] sm:text-6xl lg:text-7xl">
              Secure every AI agent action before it happens.
            </h1>
          </BlurFade>
          <BlurFade delay={0.08}>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4B3C52]">
              Polyshield routes agent tool calls through policies, approvals,
              credential isolation, and audit logs so agents can work without
              going rogue.
            </p>
          </BlurFade>
          <BlurFade delay={0.16}>
            <div id="waitlist" className="mt-8">
              <WaitlistForm />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-lg border border-[#211327]/14 bg-white/70 px-4 py-2.5 text-sm font-medium text-[#211327] transition-colors hover:bg-white"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                View demo
              </a>
              <span className="inline-flex items-center gap-2 text-sm text-[#6B7280]">
                MCP gateway, policies, approvals, vault, and logs
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </BlurFade>
        </div>
        <ProductMockup />
      </div>
    </section>
  );
}
