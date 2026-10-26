import Link from 'next/link';
import { SiteShell } from '@/components/upbranch/ui/site-shell';
import { pathways } from '@/lib/upbranch/pathways/catalog';
import { bounties } from '@/lib/upbranch/bounties/catalog';
import { getMission } from '@/lib/upbranch/catalog';
import { MissionStatus } from '@/components/upbranch/discover/mission-status';

export default function PathsPage() {
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-16 text-[#20251f]">
        <h1 className="text-4xl font-bold md:text-6xl">Learning paths</h1>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pathways.map((path) => {
            const project = bounties.find((bounty) => bounty.id === path.capstoneBountyIds[0]);
            return (
              <article key={path.id} className="rounded-3xl border border-[#20251f]/20 bg-white p-7">
                <h2 className="text-2xl font-bold">{path.title}</h2>
                <ol className="mt-5 list-decimal space-y-3 pl-5">
                  {path.missionIds.map((id) => {
                    const mission = getMission(id);
                    return (
                      <li key={id}>
                        {mission?.published ? (
                          <Link className="underline underline-offset-4" href={`/learn/${id}`}>
                            {mission.title}<MissionStatus id={id} />
                          </Link>
                        ) : <span>{mission?.title ?? id.replaceAll('-', ' ')} <span className="text-sm text-gray-500">· coming soon</span></span>}
                      </li>
                    );
                  })}
                </ol>
                <Link className="mt-6 block underline underline-offset-4" href={`/discover/${path.capstoneBountyIds[0]}`}>
                  {project?.title ?? 'Project'}
                </Link>
              </article>
            );
          })}
        </div>
      </main>
    </SiteShell>
  );
}
