"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { courseLessons, courseUnits } from "@/lib/upbranch/courses/catalog";
import { courseCompletion, lessonProgress, readCourseProgress, resetCourseProgress, type CourseProgress } from "@/lib/upbranch/courses/progress";
import styles from "./course.module.css";

export function CourseDashboard() {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try { setProgress(readCourseProgress()); }
    catch { setError("Progress is unavailable in this browser."); }
  }, []);

  const summary = progress ? courseCompletion(progress) : { completed: 0, total: courseLessons.length, percent: 0 };
  const next = courseLessons.find((lesson) => !progress || !lessonProgress(lesson.id, progress).completed) ?? courseLessons[0];

  function reset() {
    try { resetCourseProgress(); setProgress(readCourseProgress()); setError(""); }
    catch { setError("Could not reset progress. Check your browser storage settings."); }
  }

  return (
    <div className={styles.dashboard}>
      <section className={styles.courseHero}>
        <h1>Learn AI</h1>
        <Link className={styles.darkButton} href={`/learn/course/${next.id}`}>
          {summary.completed ? "Resume" : "Start"} <ArrowRight size={17} />
        </Link>
        <div className={styles.progress}>
          <span>{summary.completed} of {summary.total} lessons complete</span>
          <div className={styles.progressTrack} role="progressbar" aria-label="Course completion" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${summary.percent}%` }} />
          </div>
          <details>
            <summary>About progress</summary>
            <p>Progress stays in this browser. Complete a lesson by marking its video reviewed and article read, then passing its quiz.</p>
            <button type="button" onClick={reset}>Reset progress</button>
          </details>
        </div>
      </section>
      {error && <p className={styles.error} role="status">{error}</p>}
      <section className={styles.courseContent} aria-label="Course lessons">
        <div className={styles.unitList}>
          {courseUnits.map((unit) => (
            <section className={styles.unit} key={unit.id}>
              <h2 className={styles.unitHeader}>{unit.title}</h2>
              {unit.lessonIds.map((id) => {
                const lesson = courseLessons.find((item) => item.id === id);
                if (!lesson) return null;
                const completed = progress && lessonProgress(id, progress).completed;
                return (
                  <Link href={`/learn/course/${id}`} className={styles.lessonRow} key={id}>
                    <strong>{lesson.title}</strong>
                    <span>{completed && <><Check size={15} aria-hidden="true" /> Complete · </>}{lesson.durationMinutes} min</span>
                    <ArrowRight className={styles.rowArrow} size={18} aria-hidden="true" />
                  </Link>
                );
              })}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
