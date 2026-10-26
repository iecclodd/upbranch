"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./supervision-preview.module.css";

const views = ["Preview", "Test results", "Permissions"] as const;
type View = (typeof views)[number];

export function SupervisionPreview() {
  const [view, setView] = useState<View>("Preview");

  return <div className={styles.workspace}>
    <div className={styles.head}><span><i /> SITE REVIEW</span><span>SIMULATED EXAMPLE</span></div>
    <div className={styles.brief}><span>THE TASK</span><p>Build a school events page with three event cards that works on mobile.</p></div>
    <div className={styles.tabs} aria-label="Inspection views">
      {views.map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
    </div>
    <div className={styles.panel} aria-live="polite">
      {view === "Preview" && <><div className={styles.panelHeading}><span>PAGE PREVIEW</span><span>DESKTOP</span></div><h3>What&apos;s happening at school</h3><p>Find your next event.</p><div className={styles.cards}><div><span>APR 18</span><strong>Science fair</strong><small>Explore student projects</small></div><div><span>APR 24</span><strong>Spring concert</strong><small>Music in the auditorium</small></div><div className={styles.missing}><span>03 / ?</span><strong>Third event?</strong><small>Only two cards appear</small></div></div><p className={styles.hint}>The page looks finished at first glance. Compare it with the task.</p></>}
      {view === "Test results" && <><div className={styles.panelHeading}><span>PREWRITTEN CHECKS</span><span>2 ISSUES</span></div><h3>Look beyond the first view.</h3><div className={styles.finding}><b>!</b><div><strong>One event card is missing</strong><p>The brief asked for three; the preview contains two.</p></div></div><div className={styles.finding}><b>!</b><div><strong>Mobile layout overflows</strong><p>In this example, the event cards extend beyond the screen on a narrow viewport.</p></div></div><p className={styles.hint}>These are fixed example results, not live tests.</p></>}
      {view === "Permissions" && <><div className={styles.panelHeading}><span>REQUESTED ACCESS</span><span>REVIEW REQUIRED</span></div><h3>Does the task need this?</h3><div className={styles.finding}><b>?</b><div><strong>Read student records</strong><p>This access is unnecessary for a page made from public event details. Decline it and keep the task scoped.</p></div></div><p className={styles.hint}>This is a fictional permission request; no data is accessed.</p></>}
    </div>
    <div className={styles.foot}><span>NOTICE · CHECK · DECIDE</span><Link href="/learn/first-agent">Try the mission <ArrowUpRight size={14} /></Link></div>
  </div>;
}
