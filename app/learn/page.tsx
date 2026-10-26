import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/upbranch/ui/site-shell";
import { missions } from "@/lib/upbranch/content/missions";
import { CourseDashboard } from "@/components/upbranch/learn/course-dashboard";

export default function LearnPage() {
  return (
    <SiteShell>
      <main id="main-content" tabIndex={-1} className="bg-[#f6f5ef] text-[#20251f]">
        <CourseDashboard />
        <section className="mx-auto w-[90%] max-w-[1100px] pb-16">
          <h2 className="mb-5 text-2xl font-semibold">Practice</h2>
          <ul className="divide-y divide-[#dce3d7] border-y border-[#dce3d7]">
            {missions.filter((mission) => mission.published).map((mission) => (
              <li key={mission.id}>
                <Link href={`/learn/${mission.id}`} className="flex items-center gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                  <span className="flex-1 font-semibold">{mission.title}</span>
                  <span className="text-sm text-[#667263]">{mission.estimatedMinutes} min</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </SiteShell>
  );
}
