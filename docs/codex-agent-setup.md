# Codex Agent Setup

## Classification

PolyShield-App is a fullstack Next.js, TypeScript, Supabase, and agentic-AI security application.

## Agent Settings

- `max_threads = 10`
- `max_depth = 1`
- `job_max_runtime_seconds = 2400`

Ten threads are useful for independent frontend, gateway, policy, migration, tests, docs, security, and release work. Depth stays at `1` because security-sensitive changes need top-level coordination and bounded ownership.

## Custom Agents

- Global agents: `repo_scout`, `architect`, `implementer`, `tester`, `reviewer`, `security_auditor`, `docs_writer`, `release_manager`.
- Project agents: `gateway_security_reviewer`, `db_migration_reviewer`.

## Recommended Prompt Pattern

```text
Use parallel subagents.
Goal: [PolyShield-App task]
Scout app/gateway/migration boundaries first.
Keep security-sensitive work mocked or local unless explicitly approved.
Run type/security checks relevant to touched modules and review migrations before finalizing.
```

## CSV Fanout Candidates

- Supabase migration-by-migration review.
- Gateway module security audit.
- Policy/security test inventory.
- Component-level UI checks.

## Tasks That Should Not Use Many Agents

- Small copy edits.
- One component style adjustment.
- Single test fixture updates.

## Known Risks

- Gateway policy bugs can expose tool-call, SSRF, or audit integrity issues.
- Supabase migrations require RLS/grant/RPC review.
- Real service credentials and production infrastructure must not be used without explicit approval.

## Commands Discovered

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:security`

## Validation Performed

This setup pass inspected existing instructions, package scripts, repo structure, git status, and Codex docs. It did not run builds or tests.
