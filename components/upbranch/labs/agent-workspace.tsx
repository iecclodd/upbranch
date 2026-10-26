"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, CircleHelp, FileCode2, Folder, Play, RotateCcw, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import {
  DEFAULT_BRIEF, REQUEST_FIXTURES, analyzeBrief, evaluateWorkspaceRequest, generateProject, inspectProject, repairProject,
  type RequestKey, type WorkspaceCheck, type WorkspaceDecision, type WorkspacePolicyResult, type WorkspaceProject,
} from "@/lib/upbranch/workspace/runtime";
import styles from "./agent-workspace.module.css";

type Props = {
  onComplete?: (result: { missionId: string; score: number; completedAt: string }) => void;
  onReset?: () => void;
};
type Tab = "preview" | "tests" | "policy";

function lineChanges(before: string, after: string) {
  const a = before.split("\n"), b = after.split("\n");
  const lengths = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lengths[i][j] = a[i] === b[j] ? 1 + lengths[i + 1][j + 1] : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const rows: { kind: "same" | "added" | "removed"; text: string }[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { rows.push({ kind: "same", text: a[i] }); i++; j++; }
    else if (j < b.length && (i === a.length || lengths[i][j + 1] >= lengths[i + 1][j])) rows.push({ kind: "added", text: b[j++] });
    else rows.push({ kind: "removed", text: a[i++] });
  }
  return rows;
}

export function AgentWorkspace({ onComplete, onReset }: Props) {
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [baseline, setBaseline] = useState<WorkspaceProject | null>(null);
  const [checks, setChecks] = useState<WorkspaceCheck[] | null>(null);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileView, setFileView] = useState<"source" | "changes">("source");
  const [tab, setTab] = useState<Tab>("preview");
  const [requestKey, setRequestKey] = useState<RequestKey>(REQUEST_FIXTURES[0].key);
  const [policy, setPolicy] = useState<WorkspacePolicyResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [repaired, setRepaired] = useState(false);
  const [sensitiveDenied, setSensitiveDenied] = useState(false);
  const [publishApproved, setPublishApproved] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [sampleContext, setSampleContext] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [completed, setCompleted] = useState(false);
  const analysis = analyzeBrief(brief);
  const currentFile = project?.files.find((file) => file.path === selectedFile);
  const oldFile = baseline?.files.find((file) => file.path === selectedFile);
  const allPassing = !!checks?.length && checks.every((check) => check.passed);
  const qualifies = allPassing && sensitiveDenied && publishApproved;

  useEffect(() => {
    if (qualifies === completed) return;
    setCompleted(qualifies);
    if (qualifies) onComplete?.({ missionId: "first-agent", score: 100, completedAt: new Date().toISOString() });
    else onReset?.();
  }, [qualifies, completed, onComplete, onReset]);

  function record(action: string) { setHistory((items) => [...items.slice(-99), action]); }
  function invalidateArtifactReview() {
    setChecks(null); setPublishPending(false); setPublishApproved(false);
    setSensitiveDenied(false); setSampleContext(false); setPolicy(null);
    setCompleted(false); onReset?.();
  }
  function run() {
    invalidateArtifactReview();
    const next = generateProject(brief);
    setProject(next);
    setBaseline((previous) => previous ?? next);
    setSelectedFile(next.files[0]?.path ?? "");
    setChecks(null);
    setTab("preview");
    record(`Generated ${next.files.length} fictional files from your brief.`);
  }
  function test() {
    if (!project) return;
    const results = inspectProject(project);
    setChecks(results);
    setTab("tests");
    record(`Checked the project: ${results.filter((item) => item.passed).length} of ${results.length} checks passed.`);
  }
  function fix() {
    if (!project) return;
    invalidateArtifactReview();
    const next = repairProject(project);
    setProject(next);
    setBrief(next.analysis.prompt);
    setChecks(null);
    setRepaired(true);
    setFileView("changes");
    setTab("preview");
    record("Applied a targeted repair to the missing requirements. Run the checks again to verify it.");
  }
  function decide(decision: WorkspaceDecision) {
    if (!project) return;
    const result = evaluateWorkspaceRequest(requestKey, decision);
    setPolicy(result);
    if (requestKey === "read-project" && decision === "allow" && result.decision === "allow") setSampleContext(true);
    if (requestKey === "read-sensitive") setSensitiveDenied(decision === "deny" && result.decision === "deny");
    if (requestKey === "publish-project") { setPublishPending(result.decision === "require_approval"); setPublishApproved(false); }
    record(`Evaluated ${result.request.action} on ${result.request.path}: ${result.decision.replaceAll("_", " ")}.`);
  }
  function approvePublish() {
    if (!project || !publishPending || policy?.decision !== "require_approval" || policy.request.action !== "publish") return;
    setPublishApproved(true);
    record("Human approved the pending mock publish request; nothing was published.");
  }
  function reset() {
    setBrief(DEFAULT_BRIEF); setProject(null); setBaseline(null); setChecks(null); setSelectedFile("");
    setFileView("source"); setTab("preview"); setRequestKey(REQUEST_FIXTURES[0].key); setPolicy(null);
    setHistory([]); setRepaired(false); setSensitiveDenied(false); setPublishApproved(false); setPublishPending(false); setSampleContext(false); setMobilePreview(false); setCompleted(false); onReset?.();
  }

  return <section className={styles.workspace} aria-label="First agent practice workspace">
    <header className={styles.topbar}>
      <div className={styles.brand}><span className={styles.brandMark}>✳</span><div><strong>Agent workspace</strong><span>FIRST PROJECT / 01</span></div></div>
      <div className={styles.topRight}><span className={styles.simBadge}><span /> SIMULATION</span><button className={styles.reset} onClick={reset}><RotateCcw size={14} /> Reset</button></div>
    </header>
    <div className={styles.intro}>
      <div><p className={styles.eyebrow}>YOUR FIRST AGENT <span> / </span> BUILD &amp; VERIFY</p><h2>Make an idea <em>real-ish.</em></h2><p>Give a simulated agent a task, inspect what it makes, and guide it toward a better result.</p></div>
      <div className={styles.introNote}><CircleHelp size={17} /><span>Rule-based simulation. No live AI, device files, or external execution.</span></div>
    </div>
    <div className={styles.main}>
      <div className={styles.left}>
        <section className={styles.briefCard}>
          <div className={styles.sectionHeading}><div><span className={styles.number}>01</span><h3>Give it a task</h3></div><span className={styles.smallLabel}>YOUR INSTRUCTIONS</span></div>
          <p>Start with this short brief, or write your own. What should the school club site include?</p>
          <label htmlFor="agent-brief" className={styles.label}>Project brief</label>
          <textarea id="agent-brief" value={brief} onChange={(event) => setBrief(event.target.value)} rows={5} maxLength={2000} />
          <div className={styles.hint}><Sparkles size={15} /><span>Try asking for <strong>three project cards</strong>, a <strong>mobile-friendly</strong> layout, and <strong>fictional sample data</strong>.</span></div>
          <button className={styles.runButton} onClick={run} disabled={!brief.trim()}><Play size={15} fill="currentColor" /> {project ? "Run again" : "Run agent"}<span>↗</span></button>
        </section>
        <section className={styles.planCard}>
          <div className={styles.sectionHeading}><div><span className={styles.number}>02</span><h3>Agent’s interpretation</h3></div><span className={styles.smallLabel}>LIVE PLAN</span></div>
          <p className={styles.muted}>The simulator recognizes a small set of requirements in your words.</p>
          <div className={styles.planRow}><span>PROJECT</span><strong>{analysis.title || "Not specified"}</strong></div>
          <div className={styles.planRow}><span>AUDIENCE</span><strong>{analysis.audience || "Not specified"}</strong></div>
          <div className={styles.planRow}><span>RECOGNIZED</span><strong>{analysis.recognized.length ? analysis.recognized.join(" · ") : "No supported requirements yet"}</strong></div>
          {analysis.missing.length > 0 && <div className={styles.planMissing}><span>STILL UNCLEAR</span><p>{analysis.missing.join(" · ")}</p></div>}
        </section>
      </div>
      <section className={styles.workbench} aria-label="Generated project workbench">
        <div className={styles.workbenchTop}><div><span className={styles.greenDot} /> <strong>school-club</strong><span className={styles.workbenchSub}> / workspace</span></div><span className={styles.smallLabel}>FICTIONAL FILES</span></div>
        <div className={styles.editorGrid}>
          <aside className={styles.explorer} aria-label="File explorer"><p>EXPLORER <span>···</span></p><div className={styles.folder}><ChevronRight size={13} /><Folder size={14} /> school-club</div>{project ? project.files.map((file) => <button key={file.path} className={selectedFile === file.path ? styles.fileActive : ""} onClick={() => { setSelectedFile(file.path); setFileView("source"); }}><FileCode2 size={14} />{file.path.split("/").pop()}</button>) : <div className={styles.emptyFiles}>Run the agent to create files.</div>}</aside>
          <div className={styles.editor}>
            <div className={styles.editorTabs}><span><FileCode2 size={14} /> {currentFile?.path ?? "No file selected"}</span><div><button className={fileView === "source" ? styles.activeMini : ""} onClick={() => setFileView("source")}>Source</button><button className={fileView === "changes" ? styles.activeMini : ""} onClick={() => setFileView("changes")}>Changes</button></div></div>
            {currentFile ? fileView === "source" ? <pre className={styles.code}>{currentFile.content}</pre> : <div className={styles.diff}><span>CHANGES SINCE FIRST RUN · − REMOVED / + ADDED</span><pre>{lineChanges(oldFile?.content ?? "", currentFile.content).map((row, index) => <span key={index} className={styles[row.kind]}>{row.kind === "added" ? "+ " : row.kind === "removed" ? "− " : "  "}{row.text}{"\n"}</span>)}</pre></div> : <div className={styles.editorEmpty}><FileCode2 size={24} /><strong>Your files will appear here</strong><span>Run the agent to build a first version.</span></div>}
          </div>
        </div>
        <div className={styles.panelTabs} role="tablist" aria-label="Workspace results"><button role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>Preview</button><button role="tab" aria-selected={tab === "tests"} onClick={() => setTab("tests")}>Checks {checks && <span>{checks.filter((item) => item.passed).length}/{checks.length}</span>}</button><button role="tab" aria-selected={tab === "policy"} onClick={() => setTab("policy")}>Permissions</button></div>
        <div className={styles.resultPanel} aria-live="polite">
          {tab === "preview" && <><div className={styles.panelHeader}><div><strong>Live preview</strong><p>A static, isolated preview of the fictional site. {publishApproved ? "Mock publish approved; nothing was published." : "Not published."}</p></div>{project && <button className={styles.secondaryButton} onClick={test}>Run checks <ArrowRight size={14} /></button>}</div>{project ? <><div className={styles.previewControls}><button onClick={() => setMobilePreview(false)} aria-pressed={!mobilePreview}>Desktop</button><button onClick={() => setMobilePreview(true)} aria-pressed={mobilePreview}>Mobile</button></div><div className={`${styles.browser} ${mobilePreview ? styles.mobileBrowser : ""}`}><div className={styles.browserBar}><span>● ● ●</span><div>school-club.local</div></div><iframe title="Fictional school club site preview" sandbox="" srcDoc={project.previewHtml} /></div></> : <div className={styles.previewEmpty}><div>✳</div><strong>Waiting for your first run</strong><p>Your project preview will show up here.</p></div>}</>}
          {tab === "tests" && <><div className={styles.panelHeader}><div><strong>Check your work</strong><p>Literal checks inspect generated content and CSS; they do not automate a browser.</p></div><button className={styles.secondaryButton} onClick={test} disabled={!project}>Run checks <ArrowRight size={14} /></button></div>{checks ? <><div className={styles.checkList}>{checks.map((check) => <div key={check.id} className={styles.checkRow}><span className={check.passed ? styles.pass : styles.fail}>{check.passed ? <Check size={14} /> : "!"}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div><span className={styles.checkStatus}>{check.passed ? "PASS" : "NEEDS WORK"}</span></div>)}</div>{!allPassing && <div className={styles.fixCallout}><div><strong>Found something to improve?</strong><p>Edit your brief and run again, or ask for a targeted repair.</p></div><button onClick={fix}><Wrench size={14} /> Fix missing requirements</button></div>}{allPassing && <div className={styles.successNote}>All checks passed. Inspect the changes and review a permission request.</div>}</> : <div className={styles.simpleEmpty}>Run the checks to see what the project may have missed.</div>}</>}
          {tab === "policy" && <><div className={styles.panelHeader}><div><strong>Tool permission inspector</strong><p>Explore how a policy handles a simulated tool request.</p></div><ShieldCheck size={21} /></div><label className={styles.label} htmlFor="policy-request">Select a request</label><select id="policy-request" value={requestKey} onChange={(event) => { setRequestKey(event.target.value as RequestKey); setPolicy(null); }}>{REQUEST_FIXTURES.map((fixture) => <option value={fixture.key} key={fixture.key}>{fixture.title}</option>)}</select><p className={styles.policyDescription}>{REQUEST_FIXTURES.find((fixture) => fixture.key === requestKey)?.description}</p><p className={styles.policyDescription}>For publishing, first require approval, then resolve the simulated request below. Protected context stays unavailable.</p><div className={styles.policyActions}><span>SET REQUEST POLICY</span>{requestKey !== "publish-project" && <button disabled={!project} onClick={() => decide("allow")}>Allow</button>}<button disabled={!project} onClick={() => decide("require_approval")}>Require approval</button><button disabled={!project} onClick={() => decide("deny")}>Deny</button></div>{sampleContext && <div className={styles.sampleContext}><strong>Available project context</strong><p>{project ? `Read ${project.files[0]?.path}: ${project.files[0]?.content.slice(0, 140)}…` : "The fictional project file is available after generation."}</p></div>}{policy && <div className={styles.policyResult}><div><span>REQUEST</span><code>{policy.request.action} · {policy.request.path}</code></div><div><span>MATCHING RULE</span><strong>{policy.matchingRule}</strong></div><div><span>CONDITION</span><code>{policy.condition ?? "Matches the selected request"}</code></div><div><span>POLICY DECISION</span><strong>{policy.decision.replaceAll("_", " ")}</strong></div><p>{policy.explanation}</p><small>The protected-file rule matches paths starting with private/. An explicit deny cannot be overridden here.</small>{requestKey === "publish-project" && publishPending && <div className={styles.approval}><span>{publishApproved ? "MOCK APPROVED" : "AWAITING HUMAN APPROVAL"}</span><button onClick={approvePublish} disabled={publishApproved}>{publishApproved ? "Approved" : "Approve mock publish"}</button></div>}</div>}</>}
        </div>
      </section>
    </div>
    <div className={styles.bottom}>
      <div className={styles.history}><div className={styles.historyTitle}><span>03</span><strong>Activity log</strong><small>YOUR ACTIONS</small></div>{history.length ? <ol>{history.map((item, index) => <li key={`${index}-${item}`}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol> : <p>Your actions will appear here as you work.</p>}</div>
      <div className={styles.progress}><p className={styles.eyebrow}>YOUR PRACTICE PATH</p><div><span className={project ? styles.stepDone : ""}>1 <b>Generate</b></span><span className={checks ? styles.stepDone : ""}>2 <b>Check</b></span><span className={repaired || allPassing ? styles.stepDone : ""}>3 <b>Improve</b></span><span className={sensitiveDenied && publishApproved ? styles.stepDone : ""}>4 <b>Decide</b></span></div><p>{completed ? "Nice work. You checked your project and handled the protected and mock publish requests." : "Generate and check a project, deny the protected request, then require and grant approval for mock publishing."}</p>{completed && <><p>Put those skills to work: plan an accessible school event page using fictional details, a clear brief, and checks against its requirements.</p><Link href="/discover/accessible-event-planner">Build an accessible event page <ArrowRight size={15} /></Link></>}</div>
    </div>
  </section>;
}
