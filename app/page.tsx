import { CTA } from "@/components/landing/cta";
import { DemoScenario } from "@/components/landing/demo-scenario";
import { FAQ } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";
import { ProblemSection } from "@/components/landing/problem-section";
import { SecuritySection } from "@/components/landing/security-section";
import { SocialProof } from "@/components/landing/social-proof";
import { UseCases } from "@/components/landing/use-cases";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <Navbar />
      <Hero />
      <SocialProof />
      <ProblemSection />
      <HowItWorks />
      <Features />
      <DemoScenario />
      <UseCases />
      <SecuritySection />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
