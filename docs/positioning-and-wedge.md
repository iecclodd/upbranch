# Polyshield — positioning & wedge (for the PRD refresh)

Context for whoever updates the PRD: this captures the strategic shift after discovering Clawvisor (YC S26), plus what shipped to back it up. Hand this to ChatGPT alongside the existing PRD.

## The one-line

**The authorization, approval, and audit layer for AI agents and the local tools they use** — a universal MCP proxy that gates *any* MCP server you point it at, including the local stdio servers running on a developer's machine.

## Why we changed the framing

Clawvisor occupies the generic "authorization layer for agents" position with funding, a repeat founder, and a head start: credential vault (same AES-256-GCM), task/approval gating, audit, risk scoring, and an MCP server of their own. Competing there head-on is a losing fight.

Their architecture has one structural limit we don't share: their downstream is a **curated set of cloud OAuth connectors** (Gmail, GitHub, Slack, …) that they build and maintain. They cannot gate a filesystem, git, shell, Playwright, or local-DB MCP running on a user's laptop — their model has no agent on the machine.

## The wedge

**Coding agents and their local tools.** Claude Code, Cursor, Codex, and Cline run *local* stdio MCP servers, and that's exactly where ungated agent actions are most dangerous (shell + filesystem + git). Polyshield gates those, on the user's own machine, through the local runner. That's defensible territory Clawvisor's connector model structurally can't reach.

Secondary differentiators (real but not the moat): universal bring-your-own-MCP proxy vs. a fixed connector catalog; self-hostable; transparent (we proxy your servers, we don't reimplement them).

## What shipped to make this real (this build)

- **Local runner** (`polyshield-runner`, separate repo) — outbound-only daemon. Pairs with a hashed token, launches local stdio MCP servers, discovers their tools, and executes only policy-approved calls. Nothing dials into the user's machine; the policy decision point stays in the cloud, off the agent's host.
- **Stdio execution via a job queue** — agent → gateway → `runner_jobs` → runner → local MCP → back. Same allow/deny/approval/audit path as HTTP servers.
- **Prompt-injection shield** (per-server off/flag/block) — every downstream result is scanned for instruction-override, exfil, secrecy, hidden-unicode, and chat-template injection; flagged output is fenced as untrusted data or withheld. This is the Phase-2 "untrusted context" requirement, now table stakes because Clawvisor has it too.
- **Live tool updates** — the gateway is now stateful on the GET channel: it watches `catalog_revision` and pushes `notifications/tools/list_changed`, so toggling a tool in the dashboard reaches Codex/Claude Code without a restart (this was a reported UX gap).
- **Defense-in-depth** — side-effecting gateway RPCs now require a server-only "proof" secret, so a malicious agent can't bypass the policy engine by calling the queue/audit RPCs directly.
- **Admin audit trail, ToS + Privacy with signup acceptance, styled in-app dialogs.**

## PRD sections worth rewriting

1. **Positioning / target user** — lead with coding-agent + local-dev-tool operators, not "any team with agents."
2. **Differentiation** — replace any "we use MCP, they don't" claim (false — Clawvisor exposes MCP too). The real difference is universal/local MCP vs. curated cloud connectors.
3. **Roadmap** — promote the runner and the agent **sandbox** (next: constrain what an approved local tool can touch — filesystem scope, network egress, resource limits) to headline features. Demote connector breadth (a race we lose).
4. **Success metrics** — instrument time-to-first-gated-local-call and approvals acted on.

## The sandbox (next, per the original PRD)

The runner already isolates *where policy lives* (off the agent host). The sandbox isolates *what an approved local tool can do*: run each stdio MCP in a constrained environment (scoped filesystem, no/limited network, CPU+mem caps, no ambient host creds). That turns "we gate the call" into "even an allowed call can't exceed its blast radius" — the natural Polyshield-only story for local agents, and squarely outside a cloud-connector competitor's reach.
