import { WaitlistForm } from "@/components/landing/waitlist-form";

export function CTA() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-xl border border-[#211327]/10 bg-[#0B1026] p-6 text-white sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Give agents access without giving them unchecked authority.
            </h2>
            <p className="mt-4 max-w-2xl text-white/64">
              Join the first design partner group for agent builders who need
              policy, approvals, credential isolation, and logs from day one.
            </p>
          </div>
          <div className="space-y-3">
            <WaitlistForm />
            <a
              href="mailto:hello@polyshield.ai"
              className="inline-flex rounded-lg border border-white/16 px-4 py-2.5 text-sm font-medium text-white/82 transition-colors hover:bg-white/8"
            >
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
