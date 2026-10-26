// Node's type-stripping test runner needs the extension; Next resolves it too.
// @ts-expect-error TypeScript requires allowImportingTsExtensions for this import.
import { evaluatePolicy } from "../../gateway/policy.ts";

// This is an intentionally small interpreter, not an AI model or code runner.
export type WorkspaceDecision = "allow" | "require_approval" | "deny";
export type RequestKey = "read-project" | "publish-project" | "read-sensitive";
export interface BriefAnalysis {
  prompt: string;
  title: string;
  audience: string;
  features: string[];
  recognized: string[];
  missing: string[];
}
export interface WorkspaceProject {
  analysis: BriefAnalysis;
  files: { path: string; content: string }[];
  previewHtml: string;
}
export interface WorkspaceCheck { id: string; label: string; passed: boolean; detail: string }
export interface WorkspacePolicyResult {
  decision: WorkspaceDecision;
  matchingRule: string;
  condition: string | null;
  explanation: string;
  request: { action: string; path: string };
}

export const DEFAULT_BRIEF = "Title: School Garden Club\nAudience: students and families\nInclude an introduction and a contact button.";

export const REQUEST_FIXTURES: readonly { key: RequestKey; title: string; description: string; defaultDecision: WorkspaceDecision }[] = [
  { key: "read-project", title: "Read a project file", description: "Read the fictional index.html file.", defaultDecision: "allow" },
  { key: "publish-project", title: "Publish project preview", description: "Simulate a request to publish the project preview; nothing is made public.", defaultDecision: "require_approval" },
  { key: "read-sensitive", title: "Read a sensitive file", description: "Attempt to inspect fictional private student records; no real data is used.", defaultDecision: "deny" },
];

const FEATURE_PATTERNS: readonly [string, RegExp][] = [
  ["introduction", /\b(introduction|intro|about)\b/i],
  ["contact button", /\b(contact|button|call to action|cta)\b/i],
  ["services", /\b(services|offerings)\b/i],
  ["testimonials", /\b(testimonials|reviews)\b/i],
  ["three cards", /\b(three|3)\s+(?:\w+\s+){0,2}cards?\b/i],
  ["mobile layout", /\b(mobile|responsive)\b/i],
  ["sample data", /\b(sample data|example data|fictional data)\b/i],
];

function field(prompt: string, name: string): string {
  const match = prompt.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, "im"));
  return (match?.[1] ?? "").trim().slice(0, 100);
}

export function analyzeBrief(input: string): BriefAnalysis {
  const prompt = String(input).slice(0, 2000);
  const title = field(prompt, "title");
  const audience = field(prompt, "audience");
  const features = FEATURE_PATTERNS.filter(([, pattern]) => pattern.test(prompt)).map(([name]) => name);
  const recognized = [title && `Title: ${title}`, audience && `Audience: ${audience}`, ...features.map((name) => `Feature: ${name}`)].filter(Boolean) as string[];
  const missing = [!title && "title", !audience && "audience", !features.includes("three cards") && "three cards", !features.includes("mobile layout") && "mobile layout", !features.includes("sample data") && "sample data"].filter(Boolean) as string[];
  return { prompt, title, audience, features, recognized, missing };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function renderProject(analysis: BriefAnalysis): WorkspaceProject {
  const title = escapeHtml(analysis.title || "Untitled project");
  const audience = escapeHtml(analysis.audience || "your visitors");
  const has = (feature: string) => analysis.features.includes(feature);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:0;color:#21332c;background:#f5f5e9}main{max-width:760px;margin:auto;padding:64px 24px}h1{font-size:clamp(2.5rem,8vw,4.5rem);line-height:1.1}section{margin:36px 0}a{display:inline-block;background:#245b43;color:white;padding:12px 20px;border-radius:8px;text-decoration:none}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{background:white;padding:16px;border-radius:12px}${has("mobile layout") ? "@media(max-width:600px){.cards{grid-template-columns:1fr}main{padding:32px 20px}}" : ""}</style></head>
<body><main><h1>${title}</h1><p>A place for ${audience}.</p>
${has("introduction") ? "<section><h2>Welcome</h2><p>Discover what this community can offer.</p></section>" : ""}
${has("services") ? "<section><h2>Services</h2><p>Explore our offerings.</p></section>" : ""}
${has("testimonials") ? "<section><h2>Testimonials</h2><p>Community stories will appear here.</p></section>" : ""}
${has("three cards") ? `<section><h2>Explore</h2><div class="cards">${(has("sample data") ? ["Seed swap", "Garden workshop", "Community harvest"] : ["Card one", "Card two", "Card three"]).map((label) => `<article class="card"><h3>${label}</h3><p>${has("sample data") ? "A fictional community activity." : "Details coming soon."}</p></article>`).join("")}</div></section>` : ""}
${has("contact button") ? '<section><a href="#contact">Contact us</a><p id="contact">Contact details coming soon.</p></section>' : ""}
</main></body></html>`;
  return { analysis, files: [{ path: "index.html", content: html }, { path: "brief.txt", content: analysis.prompt }], previewHtml: html };
}

export function generateProject(prompt: string): WorkspaceProject {
  return renderProject(analyzeBrief(prompt));
}

export function inspectProject(project: WorkspaceProject): WorkspaceCheck[] {
  const analysis = project.analysis;
  const cardCount = (project.previewHtml.match(/<article class="card">/g) ?? []).length;
  const styles = project.previewHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const mobile = styles.includes("@media(max-width:600px){.cards{grid-template-columns:1fr}");
  const data = ["Seed swap", "Garden workshop", "Community harvest"].every((label) => project.previewHtml.includes(`<article class="card"><h3>${label}</h3>`));
  return [
    { id: "title", label: "A named project", passed: !!analysis.title, detail: analysis.title ? "The brief names the project." : "Add a Title: line." },
    { id: "audience", label: "An intended audience", passed: !!analysis.audience, detail: analysis.audience ? "The page addresses its audience." : "Add an Audience: line." },
    { id: "cards", label: "Three cards", passed: cardCount === 3, detail: cardCount === 3 ? "The page contains three cards." : "Ask for three cards." },
    { id: "mobile", label: "Mobile layout", passed: mobile, detail: mobile ? "Cards stack on narrow screens." : "Ask for a mobile layout." },
    { id: "data", label: "Sample data", passed: data, detail: data ? "Three fictional activities appear in the cards." : "Ask for three cards with sample data." },
  ];
}

export function repairProject(project: WorkspaceProject): WorkspaceProject {
  // Reserve room for repair instructions, then check the actual retained brief.
  const retainedPrompt = project.analysis.prompt.slice(0, 1500);
  const checks = inspectProject(generateProject(retainedPrompt));
  const failed = (id: string) => !checks.find((check) => check.id === id)?.passed;
  const additions = [failed("title") && "Title: Community Project", failed("audience") && "Audience: community members", failed("cards") && "Include three cards.", failed("mobile") && "Use a mobile layout.", failed("data") && "Include sample data."].filter(Boolean);
  return generateProject([retainedPrompt, ...additions].filter(Boolean).join("\n"));
}

export function evaluateWorkspaceRequest(key: RequestKey, learnerDecision?: WorkspaceDecision): WorkspacePolicyResult {
  const fixture = REQUEST_FIXTURES.find((item) => item.key === key);
  if (!fixture) throw new Error("Unknown workspace request");
  const request = key === "read-project" ? { action: "read", path: "project/index.html" } : key === "publish-project" ? { action: "publish", path: "project/" } : { action: "read", path: "private/student-records.csv" };
  const chosen = learnerDecision && ["allow", "require_approval", "deny"].includes(learnerDecision) ? learnerDecision : fixture.defaultDecision;
  const rules: { decision: WorkspaceDecision; condition?: string; name: string }[] = [
    { decision: "deny", condition: 'path startsWith "private/"', name: "Protected fictional files" },
    { decision: chosen, name: "Learner's request policy" },
  ];
  const result = evaluatePolicy(rules, request);
  const decision = result.decision as WorkspaceDecision;
  const matchingRule = result.policy?.name ?? "Default allow";
  const explanation = result.policy?.name === "Protected fictional files" ? "The explicit protected-file deny takes precedence over the learner's policy." : decision === "allow" ? "The learner's policy allows this simulated request." : decision === "require_approval" ? "The learner's policy requires approval before this simulated request." : "The learner's policy denies this simulated request.";
  return { decision, matchingRule, condition: result.policy?.condition ?? null, explanation, request };
}
