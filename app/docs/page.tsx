import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  FileClock,
  GitBranch,
  ListChecks,
  Lock,
  Network,
  ScrollText,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { BlurFade } from "@/components/ui/blur-fade";
import { CodeBlock } from "@/components/docs/code-block";
import { Toc, type TocItem } from "@/components/docs/toc";

export const metadata: Metadata = {
  title: "Docs & Setup — Polyshield",
  description:
    "Set up Polyshield: pair the local runner, register MCP servers, review your tool catalog, connect your coding agent, and watch a gated call flow through policy, approval, runner, and audit log.",
};

const toc: TocItem[] = [
  { id: "intro", label: "What Polyshield is" },
  { id: "quickstart", label: "Quickstart" },
  { id: "concepts", label: "Core concepts" },
  { id: "privacy", label: "Offline / privacy mode" },
  { id: "why", label: "Why Polyshield" },
  { id: "next", label: "Next steps" },
];

/** A flow node in the one-line architecture diagram. */
function FlowNode({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={
        accent
          ? "inline-flex items-center rounded-lg bg-violet px-2.5 py-1.5 font-mono text-xs font-medium text-white"
          : "inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-foreground/80 ring-1 ring-ink/10"
      }
    >
      {children}
    </span>
  );
}

function Arrow() {
  return (
    <span className="font-mono text-sm text-muted-foreground/60" aria-hidden="true">
      &rarr;
    </span>
  );
}

/** A numbered quickstart step. */
function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative pl-12">
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-sm font-semibold text-white">
        {n}
      </span>
      <h3 className="pt-1 text-lg font-semibold leading-snug text-foreground">
        {title}
      </h3>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-foreground/75">
        {children}
      </div>
    </div>
  );
}

/** A core-concept card. */
function ConceptCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-ink/5 shadow-chip">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet/10 text-violet">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <span className="font-mono text-xs font-medium uppercase tracking-wider text-violet">
        {eyebrow}
      </span>
      <h2
        id={id}
        className="mt-3 scroll-mt-28 text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
      >
        {title}
      </h2>
      {children ? (
        <p className="mt-4 text-lg leading-8 text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

const POLICY_DECISIONS = [
  {
    key: "allow",
    label: "allow",
    tone: "text-emerald-700 bg-emerald-50 ring-emerald-600/20",
    desc: "Runs immediately. Still logged.",
  },
  {
    key: "flag",
    label: "flag",
    tone: "text-amber-700 bg-amber-50 ring-amber-600/20",
    desc: "Runs, but marked for review in the audit log.",
  },
  {
    key: "require_approval",
    label: "require_approval",
    tone: "text-violet bg-violet/10 ring-violet/20",
    desc: "Pauses as a durable job until a human approves or denies.",
  },
  {
    key: "deny",
    label: "deny",
    tone: "text-rose-700 bg-rose-50 ring-rose-600/20",
    desc: "Blocked before it reaches the runner. Logged with the reason.",
  },
];

export default function DocsPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-ink/5 px-4 pb-12 pt-36 sm:px-6 sm:pt-40">
        <div className="mx-auto max-w-6xl">
          <BlurFade>
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-violet">
              Docs &amp; Setup
            </span>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Get Polyshield{" "}
              <span className="font-serif italic text-violet">in front of</span>{" "}
              your coding agent.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              This guide takes you from sign-in to your first gated tool call:
              pair a local runner, register your MCP servers, review the tools
              they expose, point your agent at the gateway, and watch policy,
              approval, runner, and audit log work together.
            </p>
          </BlurFade>
        </div>
      </section>

      {/* Body: TOC + content */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <Toc items={toc} />
            </div>
          </aside>

          <div className="min-w-0 space-y-24">
            {/* 1. Intro */}
            <section>
              <SectionHeading
                id="intro"
                eyebrow="Overview"
                title={
                  <>
                    The control plane for{" "}
                    <span className="font-serif italic text-violet">local</span>{" "}
                    agent tools
                  </>
                }
              >
                Polyshield is the authorization, approval, and audit layer for AI
                coding agents and the local MCP tools they use. Your agent
                connects to Polyshield as its single MCP endpoint. Every tool
                call passes through a cloud policy brain, a prompt-injection
                shield, credential isolation, and an audit log before a runner on
                your own machine executes it against the real MCP server.
              </SectionHeading>

              <div className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-ink/5 shadow-chip">
                <p className="mb-4 text-sm font-medium text-foreground/70">
                  The whole request path, end to end:
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <FlowNode>Coding Agent</FlowNode>
                  <Arrow />
                  <FlowNode accent>Polyshield Gateway</FlowNode>
                  <Arrow />
                  <FlowNode>Cloud Policy + Approval</FlowNode>
                  <Arrow />
                  <FlowNode>Local Runner</FlowNode>
                  <Arrow />
                  <FlowNode>Local MCP Server</FlowNode>
                </div>
                <p className="mt-5 text-[14px] leading-6 text-muted-foreground">
                  The gateway and policy engine live in the cloud, off your
                  agent&apos;s host. The runner lives on your machine and dials{" "}
                  <span className="font-medium text-foreground/80">out</span> to
                  the control plane — nothing connects inbound to your laptop, and
                  agents never reach the runner directly. Remote HTTP MCP servers
                  skip the runner: Polyshield connects to them itself.
                </p>
              </div>
            </section>

            {/* 2. Quickstart */}
            <section>
              <SectionHeading
                id="quickstart"
                eyebrow="Setup"
                title="Quickstart"
              >
                Six steps. Most of the work is registering what you already run
                locally and pointing your agent at one new URL.
              </SectionHeading>

              <div className="mt-10 space-y-12">
                <Step n={1} title="Create a project">
                  <p>
                    A project is created automatically the first time you sign in
                    — it&apos;s the boundary that holds your runners, MCP servers,
                    tool catalog, policies, and audit log. Nothing to configure
                    here; just sign in and you have one.
                  </p>
                </Step>

                <Step n={2} title="Pair the local runner">
                  <p>
                    The runner is a small daemon (<span className="font-mono text-[13px]">polyshield-runner</span>)
                    that runs on your machine and launches your local stdio MCP
                    servers. Install it, then open{" "}
                    <span className="font-medium text-foreground/80">Runners</span>{" "}
                    in the dashboard and generate a pairing token. Run the pair
                    command with that token:
                  </p>
                  <CodeBlock
                    label="Copy pair command"
                    code={`polyshield-runner pair --token prt_live_xxxxxxxxxxxxxxxxxxxx`}
                  />
                  <p>
                    The runner dials{" "}
                    <span className="font-medium text-foreground/80">out</span>{" "}
                    only — it opens an outbound connection to the control plane and
                    waits for approved work. Agents never connect to it directly,
                    and nothing dials into your machine. Only a SHA-256 hash of the
                    token is stored, so keep the token itself somewhere safe.
                  </p>
                </Step>

                <Step n={3} title="Add an MCP server">
                  <p>There are two kinds, and they execute differently:</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/60 p-4 ring-1 ring-ink/5">
                      <p className="text-sm font-semibold text-foreground">
                        Local (stdio)
                      </p>
                      <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                        Your paired runner launches the process and talks to it
                        over stdio. Example command:
                      </p>
                      <div className="mt-3">
                        <CodeBlock
                          label="Copy stdio example"
                          code={`npx -y @modelcontextprotocol/server-filesystem ~/code`}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-4 ring-1 ring-ink/5">
                      <p className="text-sm font-semibold text-foreground">
                        Remote (HTTP)
                      </p>
                      <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                        Polyshield connects directly to the server&apos;s HTTP
                        endpoint. No runner needed — useful for hosted MCP
                        servers, e.g.
                      </p>
                      <div className="mt-3">
                        <CodeBlock
                          label="Copy http example"
                          code={`https://api.example.com/mcp`}
                        />
                      </div>
                    </div>
                  </div>
                  <p>
                    A stdio server shows as{" "}
                    <span className="font-medium text-foreground/80">pending</span>{" "}
                    until a paired runner picks it up, launches it, and reports its
                    tools. If it stays pending, check that your runner is online.
                  </p>
                </Step>

                <Step n={4} title="Review the tool catalog">
                  <p>
                    Once a server is connected, Polyshield discovers the tools it
                    exposes and lists them in the{" "}
                    <span className="font-medium text-foreground/80">Tool Catalog</span>.
                    Enable only the subset you actually want your agent to use —
                    everything starts disabled, and you turn on what you trust.
                  </p>
                  <p>
                    During discovery the prompt-injection shield also scans the
                    tool <span className="italic">definitions</span> themselves.
                    High-risk or &ldquo;poisoned&rdquo; definitions — ones whose
                    descriptions try to smuggle instructions into your agent — are
                    auto-disabled so you can&apos;t enable them by accident.
                  </p>
                </Step>

                <Step n={5} title="Connect your coding agent">
                  <p>
                    Point your agent at the Polyshield gateway MCP endpoint instead
                    of at the MCP servers directly. The gateway URL for your
                    project is your Polyshield host plus{" "}
                    <span className="font-mono text-[13px]">/api/mcp</span>, and
                    you authenticate with an agent key:
                  </p>
                  <CodeBlock
                    label="Copy Claude Code command"
                    code={`claude mcp add --transport http polyshield https://app.polyshield.ai/api/mcp \\
  --header "Authorization: Bearer <agent-key>"`}
                  />
                  <p>
                    Cursor, Codex, and Cline use the same URL and bearer key in
                    their own MCP config format. The dashboard&apos;s{" "}
                    <span className="font-medium text-foreground/80">Agents</span>{" "}
                    page shows ready-to-paste snippets for each client with your
                    real gateway URL filled in — copy from there. Toggling a tool
                    on or off takes effect live: the gateway pushes a{" "}
                    <span className="font-mono text-[13px]">tools/list_changed</span>{" "}
                    notification, so connected clients refresh without a restart.
                  </p>
                </Step>

                <Step n={6} title="Make a first gated call">
                  <p>
                    Ask your agent to do something that touches a gated tool. The
                    request flows through the policy engine; if it needs sign-off
                    it pauses as an approval; once approved (or if it was an
                    instant allow) the runner executes it and the result returns to
                    your agent. Open the{" "}
                    <span className="font-medium text-foreground/80">Audit log</span>{" "}
                    to watch the whole sequence — policy decision, approval,
                    runner, result — land as one record.
                  </p>
                </Step>
              </div>
            </section>

            {/* 3. Core concepts */}
            <section>
              <SectionHeading
                id="concepts"
                eyebrow="How it works"
                title="Core concepts"
              >
                The moving parts, and what each one is responsible for.
              </SectionHeading>

              {/* Policy decisions callout */}
              <div className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-ink/5 shadow-chip">
                <h3 className="text-base font-semibold text-foreground">
                  The policy engine&apos;s four decisions
                </h3>
                <p className="mt-1.5 text-[14px] leading-6 text-muted-foreground">
                  Every tool call resolves to exactly one of these before anything
                  executes:
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {POLICY_DECISIONS.map((d) => (
                    <div
                      key={d.key}
                      className="flex items-start gap-3 rounded-xl bg-muted/50 p-3.5"
                    >
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-medium ring-1 ${d.tone}`}
                      >
                        {d.label}
                      </span>
                      <span className="text-[13px] leading-5 text-foreground/75">
                        {d.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ConceptCard icon={Network} title="Gateway">
                  The single MCP endpoint your agent connects to. It speaks MCP to
                  the agent, runs every call through policy and the shield, and
                  routes execution to a runner or a remote server.
                </ConceptCard>

                <ConceptCard icon={ShieldCheck} title="Policy engine">
                  Deterministic rules that resolve each call to allow, flag,
                  require_approval, or deny — in milliseconds, before anything
                  reaches your machine.
                </ConceptCard>

                <ConceptCard icon={ListChecks} title="Approvals">
                  A require_approval decision becomes a durable job, not a blocking
                  prompt. Your agent isn&apos;t left hanging — a human can approve
                  or deny hours later, and the call resumes from where it paused.
                </ConceptCard>

                <ConceptCard icon={TerminalSquare} title="Local runner">
                  The outbound-only daemon on your machine. It launches your stdio
                  MCP servers and executes only the calls policy approved. The
                  decision point stays in the cloud, off the agent&apos;s host.
                </ConceptCard>

                <ConceptCard icon={Boxes} title="Sandbox">
                  Constrains what an approved local tool can actually do:
                  project-scoped filesystem, snapshots with undo, and dry-run diffs
                  shown at approval time. When Docker is present it isolates with{" "}
                  <span className="font-mono text-[12px]">--network none</span>,
                  memory caps, and{" "}
                  <span className="font-mono text-[12px]">--cap-drop ALL</span>;
                  without Docker it falls back gracefully.
                </ConceptCard>

                <ConceptCard icon={Lock} title="Prompt-injection shield">
                  Per server, set to off, flag, or block. It scans untrusted
                  downstream output for injected instructions and exfiltration
                  attempts, and scans tool definitions at discovery so a poisoned
                  description can&apos;t hijack your agent.
                </ConceptCard>

                <ConceptCard icon={FileClock} title="Audit log">
                  An ordered record of what happened: the tool, the policy
                  decision, any approval, byte sizes, and timestamps — and, unless
                  privacy mode is on, the call&apos;s arguments and a size-capped
                  copy of its result.
                </ConceptCard>

                <ConceptCard icon={Boxes} title="MCP Registry">
                  A curated catalog of common MCP servers (filesystem, git,
                  Postgres, Playwright, and more) with risk scores and one-click
                  hardening, so you can add a known-good server without writing
                  config by hand.
                </ConceptCard>

                <ConceptCard icon={GitBranch} title="Stdio job queue">
                  How local execution stays on the same path as HTTP: the gateway
                  enqueues a job, your runner pulls it, runs the local tool, and
                  returns the result through the same allow/deny/approval/audit
                  flow.
                </ConceptCard>
              </div>
            </section>

            {/* 4. Offline / privacy mode */}
            <section>
              <SectionHeading
                id="privacy"
                eyebrow="Privacy"
                title={
                  <>
                    Offline / privacy mode,{" "}
                    <span className="font-serif italic text-violet">
                      explained simply
                    </span>
                  </>
                }
              >
                Normally the audit log records each call&apos;s arguments and a
                size-capped copy of its result, so you can review exactly what
                happened. Privacy mode strips those out before the log is written.
              </SectionHeading>

              <div className="mt-8 space-y-6 text-[15px] leading-7 text-foreground/75">
                <p>
                  With privacy mode{" "}
                  <span className="font-semibold text-foreground">on</span>,
                  Polyshield keeps only the metadata: the tool name, the policy
                  decision, byte sizes, and the timestamp. Your file contents,
                  diffs, and query results are never written to Polyshield&apos;s
                  database.
                </p>
                <p>
                  Crucially, this only changes what gets{" "}
                  <span className="italic">saved</span>. Policies, approvals, and
                  the prompt-injection shield still run on the live call exactly as
                  before — you keep all of the protection. Only the stored record
                  is redacted.
                </p>
              </div>

              {/* Before / after */}
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-card p-6 ring-1 ring-ink/5 shadow-chip">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">
                      Logged with privacy mode OFF
                    </p>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    A <span className="font-mono text-[12px]">read_file</span> call,
                    full record.
                  </p>
                  <CodeBlock
                    label="Copy off example"
                    code={`{
  "tool": "read_file",
  "decision": "allow",
  "args": { "path": "~/code/.env" },
  "result": "DATABASE_URL=postgres://...
STRIPE_KEY=sk_live_51H...",
  "result_bytes": 184,
  "at": "2026-06-14T17:02:11Z"
}`}
                  />
                </div>

                <div className="rounded-2xl bg-card p-6 ring-1 ring-violet/20 shadow-chip">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-violet" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">
                      Logged with privacy mode ON
                    </p>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Same call — arguments and result stripped before write.
                  </p>
                  <CodeBlock
                    label="Copy on example"
                    code={`{
  "tool": "read_file",
  "decision": "allow",
  "args": null,
  "result": null,
  "result_bytes": 184,
  "at": "2026-06-14T17:02:11Z"
}`}
                  />
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-[14px] leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
                <span>
                  Same decision, same byte count, same timestamp. The file&apos;s
                  contents — including those secrets — never touched
                  Polyshield&apos;s database.
                </span>
              </p>
            </section>

            {/* 5. Why Polyshield */}
            <section>
              <SectionHeading
                id="why"
                eyebrow="Rationale"
                title="Why Polyshield"
              >
                Local developer tools were built for a trusted human at the
                keyboard — not for a semi-autonomous agent acting on their behalf.
              </SectionHeading>

              <div className="mt-8 space-y-6 text-[15px] leading-7 text-foreground/75">
                <p>
                  Filesystem, git, databases, and a headless browser each carry a
                  huge blast radius: an agent with those tools can delete files,
                  rewrite history, run destructive queries, or exfiltrate data.
                  And prompt injection makes it worse — untrusted content the agent
                  reads (a web page, an email, a GitHub issue) can carry
                  instructions that the agent then tries to act on with those same
                  tools.
                </p>
                <p>
                  Polyshield reduces that risk without asking every MCP server
                  author to rebuild permissions. Because it proxies the calls
                  rather than reimplementing the servers, you get policy,
                  approvals, a prompt-injection shield, credential isolation, and
                  an audit trail in front of tools that have none of their own —
                  including the local stdio servers your coding agent already runs.
                </p>
              </div>

              <div className="mt-8 rounded-2xl bg-muted/50 p-6 ring-1 ring-ink/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      An honest boundary
                    </h3>
                    <p className="mt-2 text-[14px] leading-6 text-foreground/75">
                      Polyshield can only gate what flows through it. If you also
                      hand the agent raw tokens or direct filesystem access{" "}
                      <span className="font-medium text-foreground/85">outside</span>{" "}
                      Polyshield — say, an MCP server configured straight into the
                      agent, or credentials in its environment — those paths bypass
                      every control here. Route the risky tools through the gateway,
                      or the gateway can&apos;t protect them.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Closing */}
            <section id="next" className="scroll-mt-28">
              <div className="rounded-2xl bg-gradient-to-br from-violet to-violet-deep p-8 text-white sm:p-10">
                <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                  You&apos;re set up.
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/80">
                  Pair a runner, register the servers you already run, enable a
                  safe subset of tools, and point your agent at the gateway. When
                  you&apos;re ready to scale up runners, servers, and seats, see
                  what each plan includes.
                </p>
                <div className="mt-6">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.03]"
                  >
                    <ScrollText className="h-4 w-4" aria-hidden="true" />
                    View pricing
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
