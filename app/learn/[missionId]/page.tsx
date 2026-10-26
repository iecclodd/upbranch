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
    <div className="mt-8 border-b border-[#20251f]/20 pb-6"><p className="text-xs font-bold uppercase tracking-[.2em]">{isWorkspace ? 'Hands-on workspace · deterministic simulation' : `Simulation · ${mission.estimatedMinutes} min`}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{mission.title}</h1><p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#465044]">{isWorkspace ? 'Write the brief. Inspect the build. Find what the agent missed—and decide what it can access.' : mission.objective}</p></div>
    {mission.published ? <div className="mt-8">{isWorkspace ? <FirstAgentMission /> : <MissionPlayer key={mission.id} mission={mission} />}</div> : <p className="mt-8">This mission is coming soon. Explore another mission while it is being prepared.</p>}
    <section className="mt-16 border-t border-[#20251f]/20 pt-6"><h2 className="font-semibold">Explore the sources</h2><ul className="mt-3 space-y-2 text-sm">{mission.sourceUrls.map((url) => <li key={url}><a className="break-all underline underline-offset-4" href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}</a></li>)}</ul></section>
  </div></main></SiteShell>;
}
