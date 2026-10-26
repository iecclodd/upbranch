"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, CirclePlay, ClipboardCheck, ExternalLink, Play } from "lucide-react";
import { courseLessons, courseUnits } from "@/lib/upbranch/courses/catalog";
import { lessonProgress, markCourseFormat, readCourseProgress, recordCourseQuiz, type CourseProgress } from "@/lib/upbranch/courses/progress";
import styles from "./course.module.css";

type Format = "video" | "article" | "quiz";
export function CourseLessonView({ lessonId }: { lessonId: string }) {
  const lesson = courseLessons.find((item) => item.id === lessonId)!;
  const index = courseLessons.findIndex((item) => item.id === lessonId);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [format, setFormat] = useState<Format>("video");
  const [loaded, setLoaded] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ correct: number; total: number; passed: boolean } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setFormat("video"); setLoaded(false); setAnswers({}); setResult(null); setError("");
    try { setProgress(readCourseProgress()); } catch { setProgress(null); setError("Progress is unavailable in this browser."); }
  }, [lessonId]);
  const state = progress ? lessonProgress(lessonId, progress) : null;
  const validVideo = /^[A-Za-z0-9_-]{11}$/.test(lesson.video.youtubeId);
  function mark(type: "video" | "article") {
    try { setProgress(markCourseFormat(lessonId, type)); setError(""); }
    catch { setError("Your progress could not be saved. Check your browser storage settings."); }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lesson.quiz.some((question) => !answers[question.id])) { setError("Choose an answer for each question before submitting."); return; }
    try { const outcome = recordCourseQuiz(lessonId, answers); setProgress(outcome.progress); setResult(outcome); setError(""); }
    catch { setError("Your quiz result could not be saved. Check your browser storage settings."); }
  }
  return <div className={styles.lessonPage}>
    <div className={styles.lessonBreadcrumb}><Link href="/learn"><ArrowLeft size={14} /> All lessons</Link><span>/</span><span>{lesson.title}</span></div>
    <div className={styles.lessonLayout}>
      <aside className={styles.outline}><div className={styles.outlineHeading}><p className={styles.eyebrow}>YOUR COURSE</p><strong>AI, made approachable.</strong><span>VIDEO · ARTICLE · QUIZ</span></div>{courseUnits.map((unit, unitIndex) => <div className={styles.outlineUnit} key={unit.id}><p>0{unitIndex + 1} / {unit.title}</p>{unit.lessonIds.map((id) => { const item = courseLessons.find((candidate) => candidate.id === id); if (!item) return null; const complete = progress && lessonProgress(id, progress).completed; return <Link href={`/learn/course/${id}`} key={id} aria-current={id === lessonId ? "page" : undefined}><span className={complete ? styles.outlineCheck : styles.outlineDot}>{complete ? <Check size={12} /> : ""}</span>{item.title}</Link>; })}</div>)}<Link href="/learn/first-agent" className={styles.outlinePractice}>Try your first agent <ArrowRight size={14} /></Link></aside>
      <div className={styles.lessonMain}><div className={styles.lessonHeading}><p className={styles.eyebrow}>LESSON {String(index + 1).padStart(2, "0")} / {String(courseLessons.length).padStart(2, "0")} <span>·</span> {lesson.durationMinutes} MIN</p><h1>{lesson.title}<span className={styles.period}>.</span></h1><p>{lesson.summary}</p><div className={styles.lessonStatus}>{state?.completed ? <><Check size={14} /> Lesson complete</> : "Review the video, read the article, and pass the quiz to complete this lesson."}</div></div>
        <div className={styles.formatTabs} aria-label="Lesson formats">{([{ id: "video", label: "Video", icon: CirclePlay }, { id: "article", label: "Article", icon: BookOpen }, { id: "quiz", label: "Quiz", icon: ClipboardCheck }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={format === id} onClick={() => setFormat(id)}><Icon size={17} />{label}{state?.[id] && <Check className={styles.tabCheck} size={13} />}</button>)}</div>
        {error && <p className={styles.error} role="status">{error}</p>}
        <div className={styles.formatContent} aria-live="polite">
          {format === "video" && <section><div className={styles.sectionLabel}>01 / WATCH &amp; REFLECT</div><h2>Start with a <em>video.</em></h2><p className={styles.contentLead}>A useful perspective to start the conversation. You can also open the original on YouTube.</p><div className={styles.videoPanel}>{loaded && validVideo ? <iframe title={lesson.video.title} src={`https://www.youtube-nocookie.com/embed/${lesson.video.youtubeId}`} allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <div className={styles.videoPlaceholder}><div className={styles.videoDecor}>✳</div><button onClick={() => setLoaded(true)} disabled={!validVideo} aria-label={`Load video: ${lesson.video.title}`}><Play size={22} fill="currentColor" /></button><span>VIDEO LESSON</span><p>Load video to connect to YouTube.</p></div>}</div><div className={styles.videoDetails}><div><span>RECOMMENDED VIDEO</span><h3>{lesson.video.title}</h3><p>{lesson.video.channel} · Link checked {lesson.video.verifiedAt}</p></div><a href={lesson.video.url} target="_blank" rel="noopener noreferrer">Watch on YouTube <ExternalLink size={14} /></a></div><p className={styles.citation}>Source: <a href={lesson.video.sourceUrl} target="_blank" rel="noopener noreferrer">{lesson.video.channel} / {lesson.video.title} <ExternalLink size={12} /></a></p><div className={styles.markBox}><div><strong>{state?.video ? "Video marked reviewed" : "Finished reviewing?"}</strong><p>Mark this yourself when you have reviewed the video. We do not track watch time.</p></div><button onClick={() => mark("video")} disabled={!!state?.video}>{state?.video ? <><Check size={15} /> Reviewed</> : "Mark reviewed"}</button></div></section>}
          {format === "article" && <section className={styles.article}><div className={styles.sectionLabel}>02 / READ &amp; EXPLORE</div><h2>{lesson.article.heading}</h2>{lesson.article.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}<div className={styles.takeaways}><span>✳ &nbsp; THE TAKEAWAY</span><h3>Things to remember</h3><ul>{lesson.article.keyTakeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}</ul></div><div className={styles.sources}><h3>Sources &amp; further reading</h3><ol>{lesson.article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ExternalLink size={13} /></a></li>)}</ol></div><div className={styles.markBox}><div><strong>{state?.article ? "Article marked read" : "Ready for the next step?"}</strong><p>Mark the article read when you have finished.</p></div><button onClick={() => mark("article")} disabled={!!state?.article}>{state?.article ? <><Check size={15} /> Read</> : "Mark as read"}</button></div></section>}
          {format === "quiz" && <section><div className={styles.sectionLabel}>03 / CHECK YOUR THINKING</div><h2>Make it <em>stick.</em></h2><p className={styles.contentLead}>Answer every question, then review the explanations. Get them all right to complete the quiz; you can retry as often as you like. Your best score and pass are kept.</p><form onSubmit={submit}><div className={styles.questions}>{lesson.quiz.map((question, qIndex) => <fieldset className={styles.question} key={question.id}><legend><span>{String(qIndex + 1).padStart(2, "0")}</span>{question.prompt}</legend><div className={styles.options}>{[...question.options.slice((index + qIndex) % question.options.length), ...question.options.slice(0, (index + qIndex) % question.options.length)].map((option) => <label key={option.id}><input type="radio" name={`question-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => { setAnswers({ ...answers, [question.id]: option.id }); setResult(null); }} /><span>{option.text}</span></label>)}</div>{result && <div className={answers[question.id] === question.answerId ? styles.correct : styles.incorrect}><strong>{answers[question.id] === question.answerId ? "Correct" : "Not quite"}</strong><p>{question.explanation}</p></div>}</fieldset>)}</div>{result && <div className={styles.quizResult} role="status"><strong>{result.correct} / {result.total} correct</strong>{progress?.lessons[lessonId] && <span> · Best score: {progress.lessons[lessonId].quizScore} / {result.total}</span>}<p>{result.passed ? "Quiz passed. Your progress is saved in this browser." : "Review the explanations, change your answers, and try again."}</p></div>}<button className={styles.darkButton} type="submit">{result && !result.passed ? "Try again" : "Check answers"} <ArrowRight size={16} /></button></form></section>}
        </div>
        {lesson.practiceHref && <div className={styles.lessonPractice}><span>PUT IT INTO PRACTICE</span><div><strong>Try it for yourself.</strong><p>Take what you learned into a hands-on activity.</p></div><Link href={lesson.practiceHref}>Open practice <ArrowRight size={15} /></Link></div>}
        <nav className={styles.lessonNav} aria-label="Lesson navigation">{index > 0 ? <Link href={`/learn/course/${courseLessons[index - 1].id}`}><ArrowLeft size={15} /><span>PREVIOUS LESSON<strong>{courseLessons[index - 1].title}</strong></span></Link> : <Link href="/learn"><ArrowLeft size={15} /><span>BACK TO<strong>Course map</strong></span></Link>}{index < courseLessons.length - 1 ? <Link href={`/learn/course/${courseLessons[index + 1].id}`}><span>NEXT LESSON<strong>{courseLessons[index + 1].title}</strong></span><ArrowRight size={15} /></Link> : <Link href="/learn"><span>BACK TO<strong>Course map</strong></span><ArrowRight size={15} /></Link>}</nav>
      </div>
    </div>
  </div>;
}
