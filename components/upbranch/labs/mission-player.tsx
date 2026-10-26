"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mission, MissionRun } from "@/lib/upbranch/contracts";
import { listPublishedMissions } from "@/lib/upbranch/catalog";
import { getLabGuide } from "@/lib/upbranch/labs/guides";
import { readLocalProgress, writeLocalProgress } from "@/lib/upbranch/progress";
import { chooseMissionAnswer, reviewMissionRun, startMission } from "@/lib/upbranch/runtime/engine";
import { securityDemo } from "@/lib/upbranch/runtime/security-demo";
import styles from "./guided-lab.module.css";

export function MissionPlayer({ mission, onComplete }: { mission: Mission; onComplete?: (result: { missionId: string; score: number; completedAt: string }) => void }) {
  const [run, setRun] = useState<MissionRun>(() => startMission(mission));
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pane, setPane] = useState<"instructions" | "docs">("instructions");

  useEffect(() => {
    const saved = readLocalProgress().missionRuns[mission.id];
    if (saved) {
      try { reviewMissionRun(mission, saved); setRun(saved); }
      catch { setRun(startMission(mission)); }
    }
    setReady(true);
  }, [mission]);

  function save(next: MissionRun) {
    setRun(next);
    const progress = readLocalProgress();
    const completedMissionIds = progress.completedMissionIds.filter((id) => id !== mission.id);
    if (next.status === "completed") completedMissionIds.push(mission.id);
    writeLocalProgress({ ...progress, missionRuns: { ...progress.missionRuns, [mission.id]: next }, completedMissionIds, updatedAt: new Date().toISOString() });
  }
  function answer(choiceId: string) {
    const outcome = chooseMissionAnswer(mission, run, choiceId);
    save(outcome.nextRun);
    setFeedback(outcome.feedback);
    if (outcome.done) onComplete?.({ missionId: mission.id, score: outcome.nextRun.totalScore, completedAt: new Date().toISOString() });
  }
  function back() {
    const last = run.answers.at(-1);
    if (!last) return;
    const answers = run.answers.slice(0, -1);
    const totalScore = answers.reduce((sum, item) => sum + (mission.steps.find((step) => step.id === item.stepId)?.choices.find((choice) => choice.id === item.choiceId)?.score ?? 0), 0);
    save({ missionId: mission.id, currentStepId: last.stepId, answers, totalScore, status: "in_progress" });
    setFeedback(null);
  }
  function reset() { save(startMission(mission)); setFeedback(null); }

  const step = mission.steps.find((item) => item.id === run.currentStepId);
  const activeId = feedback ? run.answers.at(-1)?.stepId : run.currentStepId;
  const activeStep = mission.steps.find((item) => item.id === activeId);
  const guide = getLabGuide(mission.id);
  const checkpoint = guide?.checkpoints.find((item) => item.id === activeId);
  const review = reviewMissionRun(mission, run);
  const demo = securityDemo();
  const missions = listPublishedMissions();
  const next = missions[missions.findIndex((item) => item.id === mission.id) + 1];

  return (
    <div className={styles.guided} aria-busy={!ready}>
      <aside className={styles.guidePane}>
        <div className={styles.paneTabs} aria-label="Lab guide">
          <button type="button" aria-pressed={pane === "instructions"} onClick={() => setPane("instructions")}>Instructions</button>
          <button type="button" aria-pressed={pane === "docs"} onClick={() => setPane("docs")}>Docs</button>
        </div>
        {pane === "instructions" ? (
          <div className={styles.guideContent}>
            <p className={styles.kicker}>Current task</p>
            <h2>{checkpoint?.title ?? activeStep?.title ?? "Lab complete"}</h2>
            <p>{checkpoint?.task ?? activeStep?.scenario ?? "Review your results and continue practicing."}</p>
            {checkpoint?.steps.length ? <ol>{checkpoint.steps.map((item) => <li key={item}>{item}</li>)}</ol> : null}
            {checkpoint?.hint && <details><summary>Hint</summary><p>{checkpoint.hint}</p></details>}
          </div>
        ) : (
          <div className={styles.guideContent}>
            <h2>Reference</h2>
            {checkpoint?.reference.map((ref) => <section className={styles.reference} key={ref.title}><h3>{ref.title}</h3><p>{ref.body}</p>{ref.example && <pre>{ref.example}</pre>}{ref.href && <a href={ref.href} target="_blank" rel="noopener noreferrer">Read more ↗</a>}</section>)}
            {guide?.resources.map((resource) => <p key={resource.href}><a href={resource.href} target="_blank" rel="noopener noreferrer">{resource.title} ↗</a></p>)}
            {!checkpoint?.reference.length && !guide?.resources.length && <p>No additional references for this task.</p>}
          </div>
        )}
      </aside>
      <section className={styles.exercise}>
        {!ready ? <p>Loading saved progress…</p> : feedback ? (
          <div aria-live="polite"><p className={styles.kicker}>Feedback</p><h2>Consider your choice</h2><p>{feedback}</p><button className={styles.primary} type="button" onClick={() => setFeedback(null)}>{run.status === "completed" ? "See debrief" : "Continue"}</button></div>
        ) : step ? (
          <><p className={styles.kicker}>Decision exercise</p><h2>{step.title}</h2><p>{step.scenario}</p><div className={styles.choices} aria-label="Choose a response">{step.choices.map((choice) => <button type="button" key={choice.id} onClick={() => answer(choice.id)}>{choice.label}</button>)}</div>{step.technicalNote && <p className={styles.note}>{step.technicalNote}</p>}</>
        ) : (
          <div aria-live="polite"><p className={styles.kicker}>Complete</p><h2>Lab debrief</h2><p><strong>{review.score} / {review.maxScore} points on your path</strong></p><p>Skills demonstrated: {review.demonstratedSkills.length ? review.demonstratedSkills.join(", ").replaceAll("-", " ") : "Keep practicing and try another approach."}</p><p className={styles.note}>Scores reflect choices in this simulation, not a certification or a measure of real-world competence.</p>{next ? <Link className={styles.primary} href={`/labs/${next.id}`}>Next lab →</Link> : <Link className={styles.primary} href="/labs">All labs →</Link>}</div>
        )}
        <div className={styles.actions}><button type="button" onClick={back} disabled={!run.answers.length}>Back one decision</button><button type="button" onClick={reset}>Reset</button></div>
        <details className={styles.activity}>
          <summary>Activity</summary>
          <p>Simulated activity; no live AI. Sample files only. Nothing is read from your device.</p>
          <ol>{run.answers.map((item) => {
            const answeredStep = mission.steps.find((s) => s.id === item.stepId)!;
            const choice = answeredStep.choices.find((c) => c.id === item.choiceId)!;
            return <li key={item.stepId}><strong>{answeredStep.title}</strong><p>Decision: {choice.label}</p><p>{choice.response}</p>{answeredStep.fixtureId === "deny-protected-file" && <p>Synthetic tool request: protected/project-config.txt → policy {demo.decision}. The explicit deny applies regardless of the selected response.</p>}</li>;
          })}</ol>
          {!run.answers.length && <p>Your decisions will build a scripted trace here.</p>}
          <p>The policy demo uses explicit protective rules; the real gateway defaults to allow when no policy matches. A separate synthetic scan matched: {demo.matched.join(", ") || "none"}. These heuristics can miss attacks or flag harmless text.</p>
        </details>
      </section>
    </div>
  );
}
