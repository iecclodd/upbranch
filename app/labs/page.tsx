import Link from 'next/link';
import { SiteShell } from '@/components/upbranch/ui/site-shell';
import { listPublishedMissions } from '@/lib/upbranch/catalog';

export default function LabsPage() {
  const missions = listPublishedMissions();
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-16 text-[#20251f]">
        <h1 className="text-4xl font-semibold sm:text-5xl">Practice</h1>
        <p className="mt-4">Simulations only; no live AI or tool execution.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {missions.map((mission) => (
            <Link key={mission.id} href={`/labs/${mission.id}`} className="rounded-2xl border border-[#20251f]/15 bg-[#c8ee91] p-6 hover:underline">
              <h2 className="text-lg font-semibold">{mission.title}</h2>
              <p className="mt-4 text-sm">{mission.estimatedMinutes} min</p>
            </Link>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}
