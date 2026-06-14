import { Suspense } from "react";
import Link from "next/link";
import { Aurora } from "@/components/ui/aurora";
import { Logo } from "@/components/landing/logo";
import { ChallengeForm } from "@/components/auth/challenge-form";

export default function ChallengePage() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-flex">
            <Logo />
          </Link>
          <Suspense fallback={null}>
            <ChallengeForm />
          </Suspense>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-1">
        <div className="absolute inset-0 opacity-80">
          <Aurora colorStops={["#C9A7FF", "#E85C9E", "#6D35D4"]} blend={0.6} amplitude={1.1} speed={0.5} />
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12">
          <p className="max-w-md text-3xl font-medium leading-tight tracking-tight text-white">
            One more step,{" "}
            <span className="font-serif italic text-[#E2CFFF]">for your protection.</span>
          </p>
          <p className="mt-4 max-w-md text-white/60">
            Polyshield gates the keys to your machine. A second factor keeps that control yours alone.
          </p>
        </div>
      </section>
    </div>
  );
}
