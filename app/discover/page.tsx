import { SiteShell } from '@/components/upbranch/ui/site-shell';
import { BountyBoard } from '@/components/upbranch/discover/bounty-board';

export default function DiscoverPage() {
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-16 text-[#20251f]">
        <h1 className="text-4xl font-bold md:text-6xl">Projects</h1>
        <p className="mt-4">Educational projects, not paid opportunities.</p>
        <BountyBoard />
      </main>
    </SiteShell>
  );
}
