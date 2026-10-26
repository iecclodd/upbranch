import { SiteShell } from '@/components/upbranch/ui/site-shell';
import { PortfolioChecklist } from '@/components/upbranch/discover/portfolio-checklist';

export default function PortfolioPage() {
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 py-16 text-[#20251f]">
        <h1 className="text-4xl font-bold md:text-6xl">Progress</h1>
        <p className="mt-4">Progress and this checklist stay in this browser and may be cleared by your device.</p>
        <PortfolioChecklist />
      </main>
    </SiteShell>
  );
}
