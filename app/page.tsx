import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SupervisionPreview } from "@/components/upbranch/marketing/supervision-preview";
import { AsciiGarden } from "@/components/upbranch/marketing/ascii-garden";
import { SiteShell } from "@/components/upbranch/ui/site-shell";

export default function Home() {
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1}>
        <section className="ub-hero ub-wrap">
          <div className="ub-hero-copy">
            <h1>It looks right.<br /><em>Can you trust it?</em></h1>
            <p>Practice checking AI-generated work, testing what it made, and deciding what it can access.</p>
            <div className="ub-actions">
              <Link className="ub-button ub-button-dark" href="/learn/first-agent">Try your first mission <ArrowUpRight size={17} aria-hidden="true" /></Link>
              <Link className="ub-text-link" href="/learn">Explore lessons <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="ub-visual">
            <AsciiGarden />
            <div className="ub-orbit ub-orbit-one" />
            <div className="ub-orbit ub-orbit-two" />
            <div className="ub-orbit ub-orbit-three" />
            <svg className="ub-tree" viewBox="0 0 400 420" fill="none" aria-hidden="true">
              <path d="M200 363V247M200 288C200 219 147 231 147 170M200 253C200 194 263 214 263 151M147 198C147 161 112 160 112 126M263 185C263 147 298 142 298 106" stroke="currentColor" strokeWidth="2" />
              <path d="M200 247C200 201 185 187 179 165" stroke="currentColor" strokeWidth="2" />
              <circle cx="112" cy="119" r="17" fill="#c8ee91" /><circle cx="147" cy="163" r="25" fill="#86b36e" /><circle cx="179" cy="154" r="14" fill="#e2f4b6" /><circle cx="263" cy="144" r="27" fill="#c8ee91" /><circle cx="298" cy="98" r="18" fill="#83aa73" /><circle cx="200" cy="245" r="7" fill="#f6f5ef" stroke="currentColor" strokeWidth="2" /><path d="M170 363H230" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </section>
        <section className="ub-practice">
          <div className="ub-wrap ub-practice-grid">
            <div className="ub-practice-copy">
              <h2>Look closer.<br /><em>Make the call.</em></h2>
              <p>Inspect a fictional school events page and decide what needs attention.</p>
              <Link className="ub-text-link" href="/learn/first-agent">Continue to the mission <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <SupervisionPreview />
          </div>
        </section>
        <section className="ub-projects ub-wrap">
          <div className="ub-projects-heading">
            <h2>Explore a <em>project.</em></h2>
            <Link className="ub-text-link" href="/discover">All projects <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className="ub-project-grid">
            <Link href="/discover/air-quality-explainer" className="ub-project-card"><h3>Make air quality easier to understand.</h3><p>Explore public data and explain what it means for a community.</p><span className="ub-project-arrow" aria-hidden="true">↗</span></Link>
            <Link href="/discover/paper-research-explorer" className="ub-project-card"><h3>Make research more approachable.</h3><p>Build a paper explainer and practice tracing claims to sources.</p><span className="ub-project-arrow" aria-hidden="true">↗</span></Link>
            <Link href="/discover/accessible-event-planner" className="ub-project-card"><h3>Make school events easier to navigate.</h3><p>Design an accessible event experience using fictional details.</p><span className="ub-project-arrow" aria-hidden="true">↗</span></Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
