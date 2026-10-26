import { notFound } from "next/navigation";
import { LabActivity } from "@/components/upbranch/labs/lab-activity";
import { getMission } from "@/lib/upbranch/catalog";

export default async function LabPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  const mission = getMission(missionId);
  if (!mission || !mission.published) notFound();
  return <LabActivity mission={mission} />;
}
