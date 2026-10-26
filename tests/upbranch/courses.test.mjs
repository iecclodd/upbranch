import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { courseLessons, courseUnits } from '../../lib/upbranch/courses/catalog.ts';

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './catalog' && context.parentURL?.endsWith('/courses/progress.ts')) return nextResolve('./catalog.ts', context);
  return nextResolve(specifier, context);
} });
const { readCourseProgress, markCourseFormat, recordCourseQuiz, resetCourseProgress, lessonProgress, courseCompletion } = await import('../../lib/upbranch/courses/progress.ts');
hooks.deregister();
const key = 'upbranch:course-progress:v1';

function withStorage(callback) {
  const previous = globalThis.window;
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (id) => storage.get(id) ?? null, setItem: (id, value) => storage.set(id, value), removeItem: (id) => storage.delete(id) } };
  try { callback(storage); } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test('course references, video citations and authored quiz answer keys are consistent', () => {
  const ids = new Set(courseLessons.map((lesson) => lesson.id));
  assert.equal(ids.size, courseLessons.length);
  assert.equal(courseLessons.length, 6);
  const listed = courseUnits.flatMap((unit) => unit.lessonIds);
  assert.equal(new Set(listed).size, listed.length);
  assert.deepEqual(new Set(listed), ids);
  for (const lesson of courseLessons) {
    assert.ok(courseUnits.find((unit) => unit.id === lesson.unitId)?.lessonIds.includes(lesson.id));
    assert.match(lesson.video.youtubeId, /^[A-Za-z0-9_-]{11}$/);
    assert.equal(new URL(lesson.video.url).searchParams.get('v'), lesson.video.youtubeId);
    assert.equal(new URL(lesson.video.sourceUrl).hostname, 'www.youtube.com');
    assert.ok(lesson.article.paragraphs.length >= 3 && lesson.article.sources.length > 0);
    assert.equal(lesson.quiz.length, 3);
    assert.equal(new Set(lesson.quiz.map((question) => question.id)).size, lesson.quiz.length);
    for (const question of lesson.quiz) {
      assert.equal(new Set(question.options.map((option) => option.id)).size, question.options.length);
      assert.equal(question.options.filter((option) => option.id === question.answerId).length, 1);
      assert.ok(question.explanation.length > 20);
    }
  }
});

test('completion requires all formats and a graded passing quiz, with best attempt preserved', () => withStorage(() => {
  const lesson = courseLessons[0];
  markCourseFormat(lesson.id, 'video');
  let progress = markCourseFormat(lesson.id, 'article');
  assert.equal(lessonProgress(lesson.id, progress).completed, false);
  const incorrect = Object.fromEntries(lesson.quiz.map((question) => [question.id, 'invented-choice']));
  assert.equal(recordCourseQuiz(lesson.id, incorrect).correct, 0);
  const answers = Object.fromEntries(lesson.quiz.map((question) => [question.id, question.answerId]));
  const passed = recordCourseQuiz(lesson.id, answers);
  assert.equal(passed.passed, true);
  assert.equal(lessonProgress(lesson.id, passed.progress).completed, true);
  assert.deepEqual(courseCompletion(passed.progress), { completed: 1, total: 6, percent: 17 });
  const retry = recordCourseQuiz(lesson.id, incorrect);
  assert.equal(retry.passed, false);
  assert.equal(retry.progress.lessons[lesson.id].quizScore, 3);
  assert.equal(lessonProgress(lesson.id, retry.progress).completed, true);
  progress = markCourseFormat(lesson.id, 'article', false);
  assert.equal(lessonProgress(lesson.id, progress).completed, false);
  resetCourseProgress();
  assert.equal(courseCompletion(readCourseProgress()).completed, 0);
}));

test('SSR, corrupt, oversized and unknown lesson progress do not produce completion', () => {
  assert.equal(courseCompletion(readCourseProgress()).percent, 0);
  withStorage((storage) => {
    for (const value of ['{broken', 'x'.repeat(32769), JSON.stringify({ schemaVersion: 1, lessons: { unknown: { video: true, article: true, quizPassed: true, quizScore: 3 } }, updatedAt: new Date().toISOString() })]) {
      storage.set(key, value);
      assert.equal(courseCompletion(readCourseProgress()).percent, 0);
      assert.equal(storage.has(key), false);
    }
    assert.equal(Object.keys(markCourseFormat('unknown', 'video').lessons).length, 0);
    assert.equal(recordCourseQuiz('unknown', {}).passed, false);
  });
});

test('storage failure is surfaced to the UI instead of claiming a successful save', () => withStorage(() => {
  globalThis.window.localStorage.setItem = () => { throw new Error('Quota'); };
  assert.throws(() => markCourseFormat(courseLessons[0].id, 'video'), /could not be saved/);
  const answers = Object.fromEntries(courseLessons[0].quiz.map((question) => [question.id, question.answerId]));
  assert.throws(() => recordCourseQuiz(courseLessons[0].id, answers), /could not be saved/);
}));
