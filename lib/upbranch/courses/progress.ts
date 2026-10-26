import { courseLessons } from "./catalog";

export type CourseProgress = {
  schemaVersion: 1;
  lessons: Record<string, { video: boolean; article: boolean; quizPassed: boolean; quizScore: number }>;
  updatedAt: string;
};

const KEY = "upbranch:course-progress:v1";
const MAX_BYTES = 32 * 1024;
const empty = (): CourseProgress => ({ schemaVersion: 1, lessons: {}, updatedAt: new Date(0).toISOString() });
const knownLesson = (id: string) => courseLessons.find((lesson) => lesson.id === id);

export function resetCourseProgress(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function readCourseProgress(): CourseProgress {
  if (typeof window === "undefined") return empty();
  let raw: string | null;
  try { raw = window.localStorage.getItem(KEY); } catch { return empty(); }
  if (raw === null) return empty();
  try {
    if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error("Oversized course progress");
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid course progress");
    const record = data as Record<string, unknown>;
    if (record.schemaVersion !== 1 || typeof record.updatedAt !== "string" || record.updatedAt.length > 30 || Number.isNaN(Date.parse(record.updatedAt)) || !record.lessons || typeof record.lessons !== "object" || Array.isArray(record.lessons)) throw new Error("Invalid progress shape");
    const lessons: CourseProgress["lessons"] = {};
    for (const [id, value] of Object.entries(record.lessons)) {
      const lesson = knownLesson(id);
      if (!lesson || !value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unknown lesson progress");
      const item = value as Record<string, unknown>;
      if (typeof item.video !== "boolean" || typeof item.article !== "boolean" || typeof item.quizPassed !== "boolean" || typeof item.quizScore !== "number" || !Number.isInteger(item.quizScore) || item.quizScore < 0 || item.quizScore > lesson.quiz.length || item.quizPassed !== (lesson.quiz.length > 0 && item.quizScore === lesson.quiz.length)) throw new Error("Invalid lesson progress");
      lessons[id] = { video: item.video, article: item.article, quizPassed: item.quizPassed, quizScore: item.quizScore };
    }
    return { schemaVersion: 1, lessons, updatedAt: record.updatedAt };
  } catch {
    try { resetCourseProgress(); } catch { /* Corrupt state must never crash reading. */ }
    return empty();
  }
}

function save(progress: CourseProgress): CourseProgress {
  if (typeof window === "undefined") return progress;
  try { window.localStorage.setItem(KEY, JSON.stringify(progress)); }
  catch { throw new Error("Progress could not be saved in this browser. Allow local storage and try again."); }
  return progress;
}

export function markCourseFormat(lessonId: string, format: "video" | "article", done = true): CourseProgress {
  const progress = readCourseProgress();
  if (!knownLesson(lessonId) || !["video", "article"].includes(format)) return progress;
  const current = progress.lessons[lessonId] ?? { video: false, article: false, quizPassed: false, quizScore: 0 };
  return save({ ...progress, lessons: { ...progress.lessons, [lessonId]: { ...current, [format]: !!done } }, updatedAt: new Date().toISOString() });
}

/** Validate choices against authored questions; retain the best quiz attempt. */
export function recordCourseQuiz(lessonId: string, answers: Record<string, string>): { progress: CourseProgress; correct: number; total: number; passed: boolean } {
  const lesson = knownLesson(lessonId);
  const progress = readCourseProgress();
  if (!lesson || !answers || typeof answers !== "object" || Array.isArray(answers)) return { progress, correct: 0, total: lesson?.quiz.length ?? 0, passed: false };
  const correct = lesson.quiz.filter((question) => question.options.some((option) => option.id === answers[question.id]) && answers[question.id] === question.answerId).length;
  const total = lesson.quiz.length;
  const current = progress.lessons[lessonId] ?? { video: false, article: false, quizPassed: false, quizScore: 0 };
  const quizScore = Math.max(current.quizScore, correct);
  const next = save({ ...progress, lessons: { ...progress.lessons, [lessonId]: { ...current, quizScore, quizPassed: total > 0 && quizScore === total } }, updatedAt: new Date().toISOString() });
  return { progress: next, correct, total, passed: total > 0 && correct === total };
}

export function lessonProgress(lessonId: string, progress: CourseProgress): { video: boolean; article: boolean; quiz: boolean; completed: boolean } {
  const item = progress.lessons[lessonId];
  const video = !!item?.video, article = !!item?.article, quiz = !!item?.quizPassed;
  return { video, article, quiz, completed: video && article && quiz };
}

export function courseCompletion(progress: CourseProgress): { completed: number; total: number; percent: number } {
  const total = courseLessons.length;
  const completed = courseLessons.filter((lesson) => lessonProgress(lesson.id, progress).completed).length;
  return { completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
}
