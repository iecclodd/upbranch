"use client";

import { useEffect, useState } from "react";
import { AgentWorkspace } from "@/components/upbranch/labs/agent-workspace";
import { readLocalProgress, writeLocalProgress } from "@/lib/upbranch/progress";

/** Workspace evidence stays in this tab; only completion is saved locally. */
export function FirstAgentMission() {
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    setCompleted(readLocalProgress().completedMissionIds.includes("first-agent"));
  }, []);

  function saveCompletion(done: boolean) {
    const progress = readLocalProgress();
    const completedMissionIds = progress.completedMissionIds.filter((id) => id !== "first-agent");
    if (done) completedMissionIds.push("first-agent");
    // Retire any earlier quiz run rather than inventing answers for this workspace.
    const missionRuns = { ...progress.missionRuns };
    delete missionRuns["first-agent"];
    writeLocalProgress({ ...progress, completedMissionIds, missionRuns, updatedAt: new Date().toISOString() });
    setCompleted(done);
  }

  return <>
    {completed && <p className="mb-4 text-sm font-semibold text-[#446b36]" role="status">✓ Completed</p>}
    <AgentWorkspace onComplete={() => saveCompletion(true)} onReset={() => saveCompletion(false)} />
  </>;
}
