"use client";

import { useState } from "react";
import styles from "./supervision-preview.module.css";

const views = ["Preview", "Checks", "Access"] as const;
type View = (typeof views)[number];

export function SupervisionPreview() {
  const [view, setView] = useState<View>("Preview");

  return (
    <div className={styles.workspace}>
      <div className={styles.head}>Simulation</div>
      <div className={styles.brief}>Build a school events page with three event cards that works on mobile.</div>
      <div className={styles.tabs} aria-label="Inspection views">
        {views.map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
      </div>
      <div className={styles.panel} aria-live="polite">
        {view === "Preview" && <>
          <h3>What&apos;s happening at school</h3>
          <div className={styles.cards}>
            <div><span>APR 18</span><strong>Science fair</strong><small>Explore student projects</small></div>
            <div><span>APR 24</span><strong>Spring concert</strong><small>Music in the auditorium</small></div>
            <div className={styles.missing}><strong>Third event?</strong><small>Only two cards appear</small></div>
          </div>
        </>}
        {view === "Checks" && <>
          <h3>Example check results</h3>
          <div className={styles.finding}><b>!</b><div><strong>One event card is missing</strong><p>The brief asked for three; the preview contains two.</p></div></div>
          <div className={styles.finding}><b>!</b><div><strong>Mobile layout overflows</strong><p>The cards extend beyond a narrow screen.</p></div></div>
        </>}
        {view === "Access" && <>
          <h3>Example access request</h3>
          <div className={styles.finding}><b>?</b><div><strong>Read student records</strong><p>Unnecessary for a page made from public event details. Decline this request.</p></div></div>
        </>}
      </div>
    </div>
  );
}
