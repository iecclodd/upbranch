import { notFound } from "next/navigation";
import { SiteShell } from "@/components/upbranch/ui/site-shell";
import { MissionPlayer } from "@/components/upbranch/labs/mission-player";
import { FirstAgentMission } from "@/components/upbranch/labs/first-agent-mission";
import { getMission } from "@/lib/upbranch/catalog";

export default async function LabPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  const mission = getMission(missionId);
  if (!mission || !mission.published) notFound();
  return <SiteShell><main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-10 text-[#20251f] md:px-8"><p className="text-sm font-semibold uppercase tracking-widest">Simulation · {mission.estimatedMinutes} minutes</p><h1 className="mt-3 text-4xl font-semibold">{mission.title}</h1><p className="mb-8 mt-3 max-w-2xl leading-7">{mission.id === 'first-agent' ? 'Write instructions, inspect the virtual build, check the result, and supervise each tool request.' : mission.summary}</p>{mission.id === 'first-agent' ? <FirstAgentMission /> : <MissionPlayer key={mission.id} mission={mission} />}</main></SiteShell>;
}
