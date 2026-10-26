import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MissionPlayer } from '@/components/upbranch/labs/mission-player';
import { FirstAgentMission } from '@/components/upbranch/labs/first-agent-mission';
import { SiteShell } from '@/components/upbranch/ui/site-shell';
import { missions } from '@/lib/upbranch/content/missions';

export default async function MissionPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  const mission = missions.find((item) => item.id === missionId);
  if (!mission) notFound();
  const isWorkspace = mission.id === 'first-agent';
  return <SiteShell><main id="main-content" tabIndex={-1} className="min-h-screen bg-[#f6f5ef] px-4 py-8 text-[#20251f] md:px-8 md:py-12"><div className={`mx-auto ${isWorkspace ? 'max-w-7xl' : 'max-w-5xl'}`}>
    <Link href="/learn" className="text-sm font-semibold underline underline-offset-4">← All missions</Link>
    <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">{mission.title}</h1>
    {!isWorkspace && <p className="mt-4 max-w-3xl leading-relaxed text-[#465044]">{mission.objective}</p>}
    {mission.published ? <div className="mt-8">{isWorkspace ? <FirstAgentMission /> : <MissionPlayer key={mission.id} mission={mission} />}</div> : <p className="mt-8">This mission is coming soon. Explore another mission while it is being prepared.</p>}
    <details className="mt-8 border-t border-[#20251f]/20 pt-5 text-sm"><summary className="cursor-pointer font-semibold">Sources</summary><ul className="mt-3 space-y-2">{mission.sourceUrls.map((url) => <li key={url}><a className="break-all underline underline-offset-4" href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}</a></li>)}</ul></details>
  </div></main></SiteShell>;
}
