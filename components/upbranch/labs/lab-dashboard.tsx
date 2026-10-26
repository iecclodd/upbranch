"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mission } from "@/lib/upbranch/contracts";
import { readLocalProgress } from "@/lib/upbranch/progress";
import { reviewMissionRun } from "@/lib/upbranch/runtime/engine";
import styles from "./guided-lab.module.css";

export function LabDashboard({ missions }: { missions: Mission[] }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const progress = readLocalProgress();
    setCompleted(missions.filter((mission) => {
      if (!progress.completedMissionIds.includes(mission.id)) return false;
      if (mission.id === "first-agent") return true;
      const run = progress.missionRuns[mission.id];
      if (!run || run.status !== "completed") return false;
      try { reviewMissionRun(mission, run); return true; } catch { return false; }
    }).map((mission) => mission.id));
    setReady(true);
  }, [missions]);
  const next = missions.find((mission) => !completed.includes(mission.id)) ?? missions[0];

  return (
    <div className={styles.dashboard}>
      <h1>Labs</h1>
      <p>Practice with guided simulations. No live AI or tool execution.</p>
      {ready && next && <Link className={styles.primary} href={`/labs/${next.id}`}>{completed.length ? "Resume labs" : "Start labs"} →</Link>}
      <section className={styles.labList} aria-label="Labs">
        <div className={styles.listHeader}><h2>Assignments</h2><span>{ready ? `${completed.length} of ${missions.length} complete` : "Loading progress…"}</span></div>
        {missions.map((mission, index) => (
          <Link className={styles.labRow} key={mission.id} href={`/labs/${mission.id}`}>
            <span className={styles.rowNumber}>{index + 1}</span>
            <span className={styles.rowTitle}><strong>{mission.title}</strong><span>{mission.id === "first-agent" ? "Workspace" : "Decision exercise"} · {mission.estimatedMinutes} min</span></span>
            <span className={styles.rowStatus}>{ready && completed.includes(mission.id) ? "Complete ✓" : "Open →"}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
