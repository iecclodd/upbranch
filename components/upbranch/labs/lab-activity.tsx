import Link from "next/link";
import type { Mission } from "@/lib/upbranch/contracts";
import { SiteShell } from "@/components/upbranch/ui/site-shell";
import { FirstAgentMission } from "./first-agent-mission";
import { MissionPlayer } from "./mission-player";

/** Both public entry points use one lab layout and the same activity state. */
export function LabActivity({ mission }: { mission: Mission }) {
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] px-4 py-6 text-[#20251f] md:px-8">
        <Link href="/labs" className="text-sm font-semibold text-[#486b3b] hover:underline">← All labs</Link>
        <h1 className="mb-5 mt-3 text-3xl font-semibold">{mission.title}</h1>
        {mission.id === "first-agent" ? <FirstAgentMission /> : <MissionPlayer key={mission.id} mission={mission} />}
        <details className="mt-6 border-t border-[#20251f]/15 pt-4 text-sm">
          <summary className="cursor-pointer font-semibold">Sources</summary>
          <ul className="mt-3 space-y-2">{mission.sourceUrls.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">{new URL(url).hostname}</a></li>)}</ul>
        </details>
      </main>
    </SiteShell>
  );
}
