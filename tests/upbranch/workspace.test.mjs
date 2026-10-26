import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBrief, generateProject, inspectProject, repairProject, evaluateWorkspaceRequest, DEFAULT_BRIEF } from "../../lib/upbranch/workspace/runtime.ts";

test("specific instructions change the generated project", () => {
  const vague = generateProject("Make a website");
  const specific = generateProject("Title: Book Club\nAudience: readers\nInclude three cards with sample data and a mobile layout.");
  assert.equal(analyzeBrief(vague.analysis.prompt).title, "");
  assert.match(specific.previewHtml, /Book Club/);
  assert.match(specific.previewHtml, /readers/);
  assert.equal(inspectProject(specific).every((check) => check.passed), true);
  assert.ok(inspectProject(vague).some((check) => !check.passed));
  assert.notEqual(specific.files[0].content, vague.files[0].content);
});

test("repair turns failed mission checks into visible file changes", () => {
  const before = generateProject(DEFAULT_BRIEF);
  assert.match(before.previewHtml, /School Garden Club/);
  assert.deepEqual(inspectProject(before).filter((check) => !check.passed).map((check) => check.id), ["cards", "mobile", "data"]);
  const after = repairProject(before);
  assert.equal(inspectProject(after).every((check) => check.passed), true);
  assert.notEqual(before.files[0].content, after.files[0].content);
  assert.match(after.previewHtml, /Seed swap/);
  assert.equal((after.previewHtml.match(/<article class="card">/g) ?? []).length, 3);
});

test("user text is escaped and cannot inject scripts or network elements", () => {
  const project = generateProject('Title: <script src="https://evil.example/x.js"></script>\nAudience: <img src=x onerror=alert(1)>');
  assert.ok(project.previewHtml.includes("&lt;script"));
  assert.ok(project.previewHtml.includes("&lt;img"));
  assert.doesNotMatch(project.previewHtml, /<script|<img|<iframe|<form/i);
  assert.doesNotMatch(project.previewHtml, /(?:src|href)="https?:/i);
  assert.ok(analyzeBrief("x".repeat(5000)).prompt.length <= 2000);
  assert.equal(inspectProject(repairProject(generateProject("x".repeat(5000)))).every((check) => check.passed), true);
});

test("actual policy evaluator enforces learner choice and explicit deny", () => {
  assert.equal(evaluateWorkspaceRequest("read-project").decision, "allow");
  assert.equal(evaluateWorkspaceRequest("publish-project").decision, "require_approval");
  assert.equal(evaluateWorkspaceRequest("publish-project", "deny").decision, "deny");
  assert.equal(evaluateWorkspaceRequest("publish-project", "allow").decision, "allow");
  const protectedFile = evaluateWorkspaceRequest("read-sensitive", "allow");
  assert.equal(protectedFile.decision, "deny");
  assert.equal(protectedFile.matchingRule, "Protected fictional files");
  assert.equal(protectedFile.condition, 'path startsWith "private/"');
  assert.equal(protectedFile.request.path, "private/student-records.csv");
  assert.equal(evaluateWorkspaceRequest("publish-project").condition, null);
  assert.match(protectedFile.explanation, /precedence/);
});

test("edited files drive checks and preview, with bounded paths", async () => {
  const { applyEditedFiles } = await import("../../lib/upbranch/workspace/runtime.ts");
  const original = generateProject(DEFAULT_BRIEF);
  const edited = applyEditedFiles(original, [{ path: "index.html", content: '<h1>Changed</h1><p>students and families</p><article class="card">fictional</article><article class="card">sample</article><article class="card">example</article><style>@media (max-width: 600px) { .cards { grid-template-columns: 1fr; } }</style>' }]);
  assert.match(edited.previewHtml, /Changed/);
  assert.equal(inspectProject(edited).every((check) => check.passed), true);
  const missing = applyEditedFiles(edited, [{ path: "index.html", content: "<p>Empty</p>" }]);
  assert.equal(inspectProject(missing).every((check) => !check.passed), true);
  assert.throws(() => applyEditedFiles(original, [{ path: "index.html", content: "x".repeat(40961) }]));
  assert.throws(() => applyEditedFiles(original, [{ path: "index.html", content: "" }, { path: "other", content: "" }]));
  assert.throws(() => applyEditedFiles(original, [{ path: "index.html", content: "" }, { path: "index.html", content: "" }]));
  assert.throws(() => applyEditedFiles(original, [{ path: "brief.txt", content: "" }]));
});

test("preview removes navigation and active markup behind a first CSP", async () => {
  const { applyEditedFiles } = await import("../../lib/upbranch/workspace/runtime.ts");
  const html = '<meta http-equiv=refresh content="0;url=https://evil.test"><base href=https://evil.test><a href=https://evil.test onclick=alert(1)>link</a><form action=https://evil.test><button>go</button></form><svg><a href=https://evil.test><animate attributeName=href values=https://evil.test /></a></svg><script>alert(1)</script><iframe src=https://evil.test></iframe><style>@import url(https://evil.test/x);</style>';
  const result = applyEditedFiles(generateProject(DEFAULT_BRIEF), [{ path: "index.html", content: html }]);
  assert.match(result.previewHtml, /^<!doctype html><html><head><meta http-equiv="Content-Security-Policy"/);
  assert.match(result.previewHtml, /default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'/);
  assert.doesNotMatch(result.previewHtml, /<base|refresh|<script|<iframe|<svg|<animate|<form|\shref\s*=|\saction\s*=|onclick/i);
});
