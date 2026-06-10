import { CTA } from "@/components/landing/cta";
import { DemoScenario } from "@/components/landing/demo-scenario";
import { FAQ } from "@/components/landing/faq";
import { FeatureBento } from "@/components/landing/feature-bento";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { ProblemSection } from "@/components/landing/problem-section";
import { SecuritySection } from "@/components/landing/security-section";
import { SocialProof } from "@/components/landing/social-proof";
import { UseCases } from "@/components/landing/use-cases";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF8F5] text-[#211327]">
      <Navbar />
      <Hero />
      <SocialProof />
      <ProblemSection />
      <HowItWorks />
      <FeatureBento />
      <DemoScenario />
      <UseCases />
      <SecuritySection />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
