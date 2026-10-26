import test from 'node:test';
import assert from 'node:assert/strict';
import { labGuides, getLabGuide } from '../../lib/upbranch/labs/guides.ts';
import { missions } from '../../lib/upbranch/content/missions.ts';
import { courseLessons } from '../../lib/upbranch/courses/catalog.ts';
import { DEFAULT_BRIEF, generateProject, inspectProject } from '../../lib/upbranch/workspace/runtime.ts';

test('published labs have usable instructions, matching checkpoints and working lesson references', () => {
  const published = missions.filter(mission => mission.published);
  assert.equal(new Set(labGuides.map(guide => guide.missionId)).size, labGuides.length);
  assert.equal(getLabGuide('unknown'), undefined);
  for (const mission of published) {
    const guide = getLabGuide(mission.id);
    assert.ok(guide, mission.id);
    assert.ok(guide.checkpoints.length);
    assert.equal(new Set(guide.checkpoints.map(checkpoint => checkpoint.id)).size, guide.checkpoints.length);
    if (mission.id !== 'first-agent') assert.deepEqual(guide.checkpoints.map(checkpoint => checkpoint.id), mission.steps.map(step => step.id));
    for (const checkpoint of guide.checkpoints) {
      assert.ok(checkpoint.task && checkpoint.hint && checkpoint.steps.length && checkpoint.reference.length);
      checkpoint.reference.forEach(reference => assert.ok(reference.title && reference.body));
    }
    for (const resource of guide.resources) assert.ok(courseLessons.some(lesson => resource.href === `/learn/course/${lesson.id}`), resource.href);
  }
});

test('the first-agent guide teaches requirements that actually pass the current simulator checks', () => {
  const guide = getLabGuide('first-agent');
  assert.deepEqual(guide.checkpoints.map(checkpoint => checkpoint.id), ['build', 'test', 'protect', 'publish']);
  const starter = generateProject(DEFAULT_BRIEF);
  assert.equal(inspectProject(starter).filter(check => check.passed).length, 2);
  const example = guide.checkpoints[1].reference.find(reference => reference.example)?.example;
  assert.ok(example);
  const improved = generateProject(`${DEFAULT_BRIEF}\n${example}`);
  assert.ok(inspectProject(improved).every(check => check.passed));
  assert.notEqual(starter.previewHtml, improved.previewHtml);
});
