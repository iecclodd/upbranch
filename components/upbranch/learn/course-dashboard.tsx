"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, CirclePlay, ClipboardCheck, RotateCcw } from "lucide-react";
import { courseLessons, courseUnits } from "@/lib/upbranch/courses/catalog";
import { courseCompletion, lessonProgress, readCourseProgress, resetCourseProgress, type CourseProgress } from "@/lib/upbranch/courses/progress";
import styles from "./course.module.css";

export function CourseDashboard() {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { try { setProgress(readCourseProgress()); } catch { setError("Progress is unavailable in this browser."); } }, []);
  const summary = progress ? courseCompletion(progress) : { completed: 0, total: courseLessons.length, percent: 0 };
  const next = courseLessons.find((lesson) => !progress || !lessonProgress(lesson.id, progress).completed) ?? courseLessons[0];
  function reset() {
    try { resetCourseProgress(); setProgress(readCourseProgress()); setError(""); }
    catch { setError("Could not reset progress. Check your browser storage settings."); }
  }
  return <div className={styles.dashboard}>
    <section className={styles.courseHero}>
      <div><p className={styles.eyebrow}>THE LEARNING LIBRARY <span>/</span> A PRACTICAL COURSE</p><h1>AI, made <em>approachable.</em></h1><p>Get the foundations, learn to work thoughtfully with AI, then put your skills to use. One small lesson at a time.</p><div className={styles.heroActions}><Link className={styles.darkButton} href={`/learn/course/${next.id}`}>{summary.completed ? "Continue learning" : "Start the course"}<ArrowRight size={17} /></Link><span>6 LESSONS · GO AT YOUR OWN PACE</span></div></div>
      <div className={styles.progressCard}><div className={styles.progressTop}><span>YOUR LEARNING PATH</span><span>✳</span></div><div className={styles.progressNumber}>{summary.percent}<small>%</small></div><p>course complete</p><div className={styles.progressTrack} role="progressbar" aria-label="Course completion" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${summary.percent}%` }} /></div><div className={styles.progressBottom}><span>{summary.completed} of {summary.total} lessons complete</span><button onClick={reset}><RotateCcw size={13} /> Reset</button></div><p className={styles.progressNote}>Progress stays in this browser. A lesson is complete when you review its video, read its article, and pass its quiz.</p></div>
    </section>
    {error && <p className={styles.error} role="status">{error}</p>}
    <section className={styles.courseContent}><div className={styles.contentTitle}><div><p className={styles.eyebrow}>YOUR COURSE MAP</p><h2>A little progress <em>adds up.</em></h2></div><p>Watch, read, and check your understanding. Pick up wherever you left off.</p></div>
      <div className={styles.unitList}>{courseUnits.map((unit, unitIndex) => <section className={styles.unit} key={unit.id}><div className={styles.unitHeader}><div className={styles.unitIndex}>{String(unitIndex + 1).padStart(2, "0")}</div><div><p>UNIT {String(unitIndex + 1).padStart(2, "0")}</p><h3>{unit.title}</h3><span>{unit.description}</span></div><span className={styles.unitCount}>{unit.lessonIds.length} LESSONS</span></div><div>{unit.lessonIds.map((id, index) => { const lesson = courseLessons.find((item) => item.id === id); if (!lesson) return null; const state = progress && lessonProgress(id, progress); return <Link href={`/learn/course/${id}`} className={styles.lessonRow} key={id}><span className={state?.completed ? styles.lessonDone : styles.lessonNumber}>{state?.completed ? <Check size={16} /> : String(index + 1).padStart(2, "0")}</span><div className={styles.lessonInfo}><strong>{lesson.title}</strong><p>{lesson.summary}</p><div className={styles.badges}><span><CirclePlay size={13} /> Video</span><span><BookOpen size={13} /> Article</span><span><ClipboardCheck size={13} /> Quiz</span><span>{lesson.durationMinutes} MIN</span></div></div><ArrowRight className={styles.rowArrow} size={18} /></Link>; })}</div></section>)}</div>
      <div className={styles.practiceBanner}><div><p className={styles.eyebrow}>READY TO TRY IT?</p><h3>Learn by <em>doing.</em></h3><p>Put your ideas into action in a hands-on simulated agent workspace.</p></div><Link href="/learn/first-agent" className={styles.darkButton}>Try your first agent <ArrowRight size={16} /></Link></div>
    </section>
  </div>;
}
