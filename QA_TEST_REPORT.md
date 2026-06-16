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
- No real Supabase project, `SUPABASE_DB_URL`, runner pairing token, agent key, GitHub OAuth config, or Stripe config was available.
- Supabase CLI, Docker, and `psql` were not installed. The connected Supabase project available through the connector had unrelated fitness/coach migrations, so it was not modified.

## Browser Flows Tested

Passed:
- Landing page renders at `/`.
- Sign-in page renders at `/signin`.
- Unauthenticated `/dashboard` access redirects to `/signin`.
- Security headers are present on local responses: CSP, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

Not end-to-end tested:
- Account creation and login against Supabase.
- Project creation after real signup.
- Runner pairing through the dashboard.
- MCP discovery through a live paired runner.
- Tool enable/disable persistence against a real database.
- Approval queue execution against a live runner.
- Audit log UI with real persisted events.
- Prompt-injection shield through a live gateway call.

Reason: no real local/test Supabase database and no real runner/agent tokens were available.

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

Not live-tested:
- Pairing with a real dashboard token.
- Runner heartbeat against a real control plane.
- Runner tool discovery and claim/complete cycle against a live database.
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
| PolyShield-App | `npm run build` | Fail | Missing Supabase env caused prerender failure. |
| PolyShield-App | build with dummy Supabase/vault env | Pass | Build succeeds; Supabase Edge warning remains. |
| PolyShield-App | `npm audit --audit-level=high` | Pass | Zero vulnerabilities. |
| Polyshield | `npm test` | Pass | 26 runner sandbox/security checks. |
| Polyshield | `npm audit --audit-level=high` | Pass | Zero vulnerabilities. |
| Browser | `/`, `/signin`, `/dashboard` | Pass | Dashboard redirects unauthenticated user to sign-in. |

## App Changes Verified

- `test:security` runs existing security regression scripts using Node type stripping.
- Next lint is now non-interactive.
- Production build passes when required Supabase/vault env is present.
- MCP client uses guarded DNS lookup at connection time.
- Dashboard approval/job/audit writes were moved behind RPCs.
- Privacy-mode pending approval args are stored encrypted, not raw, and are cleared after denial/finalization.
- Approval tickets are bound to the creating agent id for gateway polling.
- Approved calls recheck that the catalog tool is still enabled before execution.

## Runner Changes Verified

- Local command trust blocks unreviewed new/changed stdio configs.
- Snapshot restore is bound to local snapshot metadata.
- Host-mode path guard resolves symlinks.
- Host-mode scoped shell command args fail closed.
- Dry-run previews require enforced containerized no-egress sandbox.
- Runner token transport rejects non-HTTPS except explicit loopback dev.

## Remaining Recommendations

1. Apply `supabase/migrations/0016_security_audit_fixes.sql` to a real Polyshield test database and add DB regression tests for RLS/direct PostgREST denial.
2. Add Playwright E2E with a local Supabase test instance for signup, login, runner pairing, tool toggles, approval, and audit log.
3. Add RLS `aal2` checks for sensitive writes for MFA-enabled accounts.
4. Remove tracked binary/local artifacts from `Polyshield` if they are not required.
