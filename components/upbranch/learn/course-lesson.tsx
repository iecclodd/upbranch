"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Play } from "lucide-react";
import { courseLessons } from "@/lib/upbranch/courses/catalog";
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
    try { setProgress(readCourseProgress()); }
    catch { setProgress(null); setError("Progress is unavailable in this browser."); }
  }, [lessonId]);

  const state = progress ? lessonProgress(lessonId, progress) : null;
  const validVideo = /^[A-Za-z0-9_-]{11}$/.test(lesson.video.youtubeId);

  function mark(type: "video" | "article") {
    try { setProgress(markCourseFormat(lessonId, type)); setError(""); }
    catch { setError("Your progress could not be saved. Check your browser storage settings."); }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lesson.quiz.some((question) => !answers[question.id])) {
      setError("Choose an answer for each question before submitting.");
      return;
    }
    try {
      const outcome = recordCourseQuiz(lessonId, answers);
      setProgress(outcome.progress); setResult(outcome); setError("");
    } catch { setError("Your quiz result could not be saved. Check your browser storage settings."); }
  }

  const outline = (
    <nav aria-label="Course contents" className={styles.outlineLinks}>
      {courseLessons.map((item) => (
        <Link href={`/learn/course/${item.id}`} key={item.id} aria-current={item.id === lessonId ? "page" : undefined}>
          {item.title}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className={styles.lessonPage}>
      <Link className={styles.backLink} href="/learn"><ArrowLeft size={14} /> All lessons</Link>
      <div className={styles.lessonLayout}>
        <aside className={styles.outline}><strong>Course contents</strong>{outline}</aside>
        <details className={styles.mobileOutline}><summary>Course contents</summary>{outline}</details>
        <div className={styles.lessonMain}>
          <div className={styles.lessonHeading}>
            <h1>{lesson.title}</h1>
            <span>{lesson.durationMinutes} min{state?.completed ? " · Complete" : ""}</span>
          </div>
          <div className={styles.formatTabs} aria-label="Lesson formats">
            {(["video", "article", "quiz"] as const).map((id) => (
              <button type="button" key={id} aria-pressed={format === id} onClick={() => setFormat(id)}>
                {id[0].toUpperCase() + id.slice(1)}{state?.[id] && <Check size={14} aria-label="complete" />}
              </button>
            ))}
          </div>
          {error && <p className={styles.error} role="status">{error}</p>}
          <div className={styles.formatContent} aria-live="polite">
            {format === "video" && (
              <section aria-label="Video">
                <div className={styles.videoPanel}>
                  {loaded && validVideo ? (
                    <iframe title={lesson.video.title} src={`https://www.youtube-nocookie.com/embed/${lesson.video.youtubeId}`} allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                  ) : (
                    <div className={styles.videoPlaceholder}>
                      <button type="button" onClick={() => setLoaded(true)} disabled={!validVideo} aria-label={`Load video: ${lesson.video.title}`}><Play size={22} fill="currentColor" aria-hidden="true" /></button>
                      <span>Load video to connect to YouTube</span>
                    </div>
                  )}
                </div>
                <div className={styles.videoDetails}>
                  <a href={lesson.video.sourceUrl} target="_blank" rel="noopener noreferrer">{lesson.video.title} · {lesson.video.channel} <ExternalLink size={13} /></a>
                  <a href={lesson.video.url} target="_blank" rel="noopener noreferrer">Open on YouTube <ExternalLink size={13} /></a>
                </div>
                <button className={styles.markButton} type="button" onClick={() => mark("video")} disabled={!!state?.video}>{state?.video ? "Reviewed" : "Mark reviewed"}</button>
                <details className={styles.disclosure}><summary>About video progress</summary><p>Mark this yourself after reviewing the video. Watch time is not tracked.</p></details>
              </section>
            )}
            {format === "article" && (
              <section className={styles.article}>
                <h2>{lesson.article.heading}</h2>
                {lesson.article.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
                <details className={styles.disclosure}><summary>Key points</summary><ul>{lesson.article.keyTakeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}</ul></details>
                <details className={styles.disclosure}><summary>Sources and further reading</summary><ol>{lesson.article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ExternalLink size={13} /></a></li>)}</ol></details>
                <button className={styles.markButton} type="button" onClick={() => mark("article")} disabled={!!state?.article}>{state?.article ? "Read" : "Mark as read"}</button>
              </section>
            )}
            {format === "quiz" && (
              <section aria-label="Quiz">
                <p className={styles.quizIntro}>Answer every question. All answers must be correct to pass; you can retry.</p>
                <form onSubmit={submit}>
                  <div className={styles.questions}>
                    {lesson.quiz.map((question, qIndex) => (
                      <fieldset className={styles.question} key={question.id}>
                        <legend>{qIndex + 1}. {question.prompt}</legend>
                        <div className={styles.options}>
                          {[...question.options.slice((index + qIndex) % question.options.length), ...question.options.slice(0, (index + qIndex) % question.options.length)].map((option) => (
                            <label key={option.id}>
                              <input type="radio" name={`question-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => { setAnswers({ ...answers, [question.id]: option.id }); setResult(null); }} />
                              <span>{option.text}</span>
                            </label>
                          ))}
                        </div>
                        {result && <div className={answers[question.id] === question.answerId ? styles.correct : styles.incorrect}><strong>{answers[question.id] === question.answerId ? "Correct" : "Not quite"}</strong><p>{question.explanation}</p></div>}
                      </fieldset>
                    ))}
                  </div>
                  {result && <div className={styles.quizResult} role="status"><strong>{result.correct} / {result.total} correct</strong>{progress?.lessons[lessonId] && <span> · Best score: {progress.lessons[lessonId].quizScore} / {result.total}</span>}<p>{result.passed ? "Quiz passed." : "Review the explanations, change your answers, and try again."}</p></div>}
                  <button className={styles.darkButton} type="submit">{result && !result.passed ? "Try again" : "Check answers"} <ArrowRight size={16} /></button>
                </form>
                {(result?.passed || state?.quiz) && lesson.practiceHref && <p><Link className={styles.practiceLink} href={lesson.practiceHref}>Open practice <ArrowRight size={15} /></Link></p>}
              </section>
            )}
          </div>
          <nav className={styles.lessonNav} aria-label="Lesson navigation">
            {index > 0 ? <Link href={`/learn/course/${courseLessons[index - 1].id}`}><ArrowLeft size={15} /> Previous lesson</Link> : <Link href="/learn"><ArrowLeft size={15} /> Course map</Link>}
            {index < courseLessons.length - 1 ? <Link href={`/learn/course/${courseLessons[index + 1].id}`}>Next lesson <ArrowRight size={15} /></Link> : <Link href="/learn">Course map <ArrowRight size={15} /></Link>}
          </nav>
        </div>
      </div>
    </div>
  );
}
