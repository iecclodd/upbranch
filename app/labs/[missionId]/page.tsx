import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/upbranch/ui/site-shell";
import { MissionPlayer } from "@/components/upbranch/labs/mission-player";
import { FirstAgentMission } from "@/components/upbranch/labs/first-agent-mission";
import { getMission } from "@/lib/upbranch/catalog";

export default async function LabPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  const mission = getMission(missionId);
  if (!mission || !mission.published) notFound();
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] px-4 py-6 text-[#20251f] md:px-8">
        <Link href="/labs" className="text-sm font-semibold text-[#486b3b] hover:underline">← All labs</Link>
        <h1 className="mb-5 mt-3 text-3xl font-semibold">{mission.title}</h1>
        {mission.id === "first-agent" ? <FirstAgentMission /> : <MissionPlayer key={mission.id} mission={mission} />}
      </main>
    </SiteShell>
  );
}
