# QA_TEST_REPORT.md

Date: 2026-06-16

Repos:
- `C:\Users\aryas\Programming\YC\PolyShield-App`
- `C:\Users\aryas\Programming\YC\Polyshield`

## Local Setup Used

- Node/npm dependencies installed with `npm ci` in both repos.
- Next dev server started at `http://localhost:3000` with dummy local env:
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key`
  - `POLYSHIELD_VAULT_KEY=<dummy 32-byte base64 key>`
- Continued with the supplied live env file at `C:\Users\aryas\Downloads\env.download`. The file was copied temporarily to ignored `.env.local` for the dev server and removed after testing.
- Direct Postgres on the supplied pooler URL port `5432` timed out, but the same Supabase pooler on port `6543` worked. `0016_security_audit_fixes.sql` was applied and verified against the live Polyshield database.
- A throwaway live user, agent, runner, and local stdio server were created for E2E. The test runner used an isolated temp `USERPROFILE` so the normal `~/.polyshield` config was not overwritten.
- Supabase CLI, Docker, and `psql` were not installed. Docker-enforced sandbox preview behavior was not live-tested.

## Browser Flows Tested

Passed:
- Landing page renders at `/`.
- Sign-in page renders at `/signin`.
- Signup succeeds against the supplied Supabase project, but requires email confirmation.
- Login succeeds after confirming the throwaway test user in the database.
- Authenticated dashboard renders overview, servers, tools, policies, approvals, agents, and audit logs.
- Unauthenticated `/dashboard` access redirects to `/signin`.
- Invalid password and unconfirmed email fail closed with visible errors.
- Security headers are present on local responses: CSP, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

Live E2E passed:
- Project/default dashboard state was created for the test user.
- Agent key path works; a controlled test agent key authenticated to `/api/mcp`.
- Local stdio server was registered and persisted.
- Local runner paired to `http://localhost:3000` with explicit loopback dev opt-in, trusted the server command, discovered 4 tools, and stayed online.
- `tools/list` exposed discovered tools plus `polyshield_check_approval`.
- Safe `echo` call executed through the runner.
- Prompt-injection shield flagged injected `fetch_page` output.
- Destructive `delete_everything` call created a pending approval and denial was returned to the agent after dashboard denial.
- Risky `write_file` call was approved in the dashboard, executed through the runner, and returned the runner result to the agent.
- Tool hiding persisted: `codexsafe050787.echo` was disabled in the UI, subsequent gateway calls returned `Unknown tool`, and the runner did not execute another `echo`.
- Unknown/disabled tool denials appeared in the audit log.

## Runner Flows Tested

Passed through `npm test` in `Polyshield`:
- Snapshot and restore.
- Restore refuses different target root.
- Restore refuses different server id.
- Basic and nested path traversal refusal.
- Absolute outside path refusal.
- Symlink directory escape refusal when symlink creation is supported.
- Host-mode shell-like command argument refusal.
- HTTPS control-plane URL accepted.
- Non-loopback HTTP control-plane URL refused.
- Loopback HTTP requires explicit local-dev opt-in.
- Trusted server config accepted.
- Changed server config rejected.
- Dry-run diff shape detects added, modified, and deleted files.

Live-tested:
- Pairing with a live DB runner token.
- Runner heartbeat/status through `/api/runner`.
- Runner config fetch for the registered stdio server.
- Tool discovery and catalog registration for 4 tools.
- Job claim/complete cycle for `echo`, `fetch_page`, and approved `write_file`.
- Disabled tool did not reach the runner.

Not live-tested:
- Docker-enforced dry-run preview path.

## Commands Run

| Repo | Command | Result | Notes |
|---|---|---:|---|
| PolyShield-App | `npm ci` | Pass | Installed from lockfile. |
| Polyshield | `npm ci` | Pass | Installed from lockfile. |
| PolyShield-App | `npm run typecheck` | Pass | TypeScript clean. |
| PolyShield-App | `npm run lint` | Pass | Added `.eslintrc.json`; fixed two lint issues. |
| PolyShield-App | `npm run test:security` | Pass | Policy, shield, SSRF scripts. |
| PolyShield-App | `node scripts/security-migration-test.mjs` | Pass | Included in `test:security`; checks migration RLS/RPC safeguards. |
| PolyShield-App | `npm run build` without env | Fail | Missing Supabase env caused prerender failure during the earlier baseline. |
| PolyShield-App | `npm run build` with supplied live env | Pass | Build succeeds with `.env.local`; the file was removed after testing. |
| PolyShield-App | `npm audit --audit-level=high` | Pass | Zero vulnerabilities. |
| Polyshield | `npm test` | Pass | 26 runner sandbox/security checks. |
| Polyshield | `npm audit --audit-level=high` | Pass | Zero vulnerabilities. |
| Browser | `/`, `/signin`, `/dashboard` | Pass | Dashboard redirects unauthenticated user to sign-in. |
| PolyShield-App | apply `0016_security_audit_fixes.sql` to live Supabase via pooler `6543` | Pass | Verified RLS policies, DML revokes, approval columns, and definer RPCs. |
| Browser/live DB | signup/login/dashboard pages | Pass | Email confirmation required; throwaway test user confirmed through DB for E2E. |
| Polyshield | isolated-profile `pair`, `trust`, `start` | Pass | Runner discovered 4 tools from `scripts/test-stdio-mcp.mjs`. |
| MCP gateway | initialize/tools/list/safe call/shield/approval/disabled tool | Pass | Verified with live runner and audit log. |

## App Changes Verified

- `test:security` runs existing security regression scripts using Node type stripping.
- Next lint is now non-interactive.
- Production build passes when required Supabase/vault env is present.
- MCP client uses guarded DNS lookup at connection time.
- Dashboard approval/job/audit writes were moved behind RPCs.
- Privacy-mode pending approval args are stored encrypted, not raw, and are cleared after denial/finalization.
- Approval tickets are bound to the creating agent id for gateway polling.
- Unknown/disabled tool denials are now audited with redacted argument metadata.
- Approved calls recheck that the catalog tool is still enabled before execution.

## Runner Changes Verified

- Local command trust blocks unreviewed new/changed stdio configs.
- Snapshot restore is bound to local snapshot metadata.
- Host-mode path guard resolves symlinks.
- Host-mode scoped shell command args fail closed.
- Dry-run previews require enforced containerized no-egress sandbox.
- Runner token transport rejects non-HTTPS except explicit loopback dev.
- Live runner pairing, trust, discovery, job execution, and disabled-tool non-execution were verified against the supplied Supabase project.

## Remaining Recommendations

1. Add automated Playwright E2E for signup, login, runner pairing, tool toggles, approval, and audit log using a seeded test Supabase project.
2. Add RLS `aal2` checks for sensitive writes for MFA-enabled accounts.
3. Remove tracked binary/local artifacts from `Polyshield` if they are not required.
4. Add a formal migration history table or Supabase CLI flow for the live database; this project did not expose `supabase_migrations.schema_migrations`.
