import { Aurora } from "@/components/ui/aurora";
import { BlurFade } from "@/components/ui/blur-fade";
import { WaitlistForm } from "@/components/landing/waitlist-form";

export function CTA() {
  return (
    <section className="px-4 pb-24 pt-8 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-ink px-6 py-20 text-center sm:px-12">
        <div className="absolute inset-x-0 top-0 h-[340px] opacity-70">
          <Aurora
            colorStops={["#8B5CF6", "#E85C9E", "#C9A7FF"]}
            blend={0.6}
            amplitude={1.0}
            speed={0.5}
          />
        </div>
        <BlurFade inView className="relative">
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-medium tracking-tight text-white sm:text-5xl">
            Give agents access,{" "}
            <span className="font-serif italic text-[#E2CFFF]">
              not authority.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
            Join the first design partner group — for agent builders who need
            policies, approvals, credential isolation, and logs from day one.
          </p>
          <div className="mt-9 flex justify-center">
            <WaitlistForm tone="dark" />
          </div>
          <a
            href="mailto:hello@polyshield.ai"
            className="mt-6 inline-block text-sm font-medium text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Or talk to us directly →
          </a>
        </BlurFade>
      </div>
    </section>
  );
}
