# SECURITY_AUDIT.md

Date: 2026-06-16

Repos reviewed:
- `PolyShield-App` branch `main`, base commit `df06fa4`
- `Polyshield` branch `main`, base commit `88ca8e2`

Known skipped broken features:
- GitHub sign-in was not fixed. It was treated as known broken and not required for core local testing.
- Stripe payments were not fixed. They were treated as known broken unless security-relevant.

## Methodology

- Read the attached prompt, both repos, README/setup docs, positioning/PRD refresh notes, package manifests, migrations, gateway routes, dashboard actions, runner code, sandbox code, and security helpers.
- Used parallel subagents for architecture extraction, app security review, runner security review, test-gap review, dependency/supply-chain review, and baseline command discovery.
- Ran local static review with targeted `rg`, manual code inspection, TypeScript, lint, build, npm audit, security unit scripts, runner tests, and a browser smoke test.
- Started the Next app locally with dummy Supabase/vault env for public/auth-gate browser verification.
- Checked local database execution options. Supabase CLI, Docker, and `psql` were not installed. The connected Supabase project appeared unrelated to Polyshield based on its migration history, so it was inspected read-only and not modified.

## Findings Fixed

### Critical: runner silently launched remote-supplied stdio commands

Affected area: `Polyshield` runner command supervision.

Exploit path: a compromised or malicious control plane response could return a new or changed stdio server config. The runner would launch the process during discovery before any local review.

Fix:
- Added local command fingerprint trust in `src/config.js`.
- Added `polyshield trust` in `bin/polyshield.js`.
- `src/runner.js` now refuses new/changed server configs until trusted locally.
- `README.md` documents the local trust step.

Tests:
- `npm test` covers accepted trusted config and rejected changed config.

### High: runner dry-run previews could cause real pre-approval side effects

Affected area: `Polyshield` dry-run execution.

Exploit path: a dry-run job could run against a non-containerized or networked server, causing external side effects before a human approved the action.

Fix:
- `src/runner.js` rejects dry-run jobs unless filesystem scope is enforced, egress is `none`, and Docker containerization actually took effect.
- `README.md` now states dry-run previews are refused without an enforced no-egress container.

Tests:
- Runner sandbox test suite remains green.

### High: snapshot restore trusted control-plane supplied target paths

Affected area: `Polyshield` restore/undo.

Exploit path: a restore job could pair a valid snapshot ref with a different `scopePath`, causing the runner to overwrite/delete files in another directory.

Fix:
- `src/sandbox.js` writes local snapshot metadata containing `ref`, `serverId`, and canonical `scopePath`.
- Restore now refuses missing metadata, different server ids, and different target roots.

Tests:
- `npm test` covers restore refusal for a different root and different server id.

### High: host-mode sandbox path scope had symlink and shell-command gaps

Affected area: `Polyshield` filesystem scope enforcement.

Exploit path: symlink paths inside scope could point outside the scope. Shell-like MCP tools could receive command strings that read outside scope without using path-like JSON keys.

Fix:
- `src/sandbox.js` now checks `realpath` for existing paths and closest existing parents.
- Host-mode scoped calls reject shell-like argument keys such as `command`, `cmd`, `script`, and `exec` unless the server is actually containerized.

Tests:
- `npm test` covers nested path arrays, host shell command arg refusal, and symlink directory escape refusal.

### High: direct Supabase writes bypassed gateway/approval controls

Affected area: `PolyShield-App` database RLS and dashboard actions.

Exploit path: a project owner JWT could insert directly into `runner_jobs` and cause local runner execution without policy/approval, or mutate `audit_log` / `approvals` directly.

Fix:
- Added `supabase/migrations/0016_security_audit_fixes.sql`.
- Replaced broad `for all` RLS on `runner_jobs`, `audit_log`, and `approvals` with owner `select` only.
- Revoked direct insert/update/delete grants for `public`, `anon`, and `authenticated`.
- Added narrow `SECURITY DEFINER` dashboard RPCs for admin audit logging, approval decisions/finalization, approved stdio job enqueue, and snapshot restore enqueue.
- Updated `app/dashboard/actions.ts` to use those RPCs.
- Added a disabled-tool recheck before approved calls execute, including `catalog_tools.enabled = true` in the approved runner enqueue RPC.

Tests:
- `npm run typecheck` passed.
- Targeted search found no remaining direct app DML writes to those hardened tables.
- `npm run test:security` now includes `scripts/security-migration-test.mjs`, which verifies the migration retains select-only policies, DML revokes, definer RPCs, ciphertext handling, enabled-tool enforcement, and restore row locking.

### High: privacy mode persisted raw approval args/results

Affected area: approval queue and audit persistence.

Exploit path: privacy mode redacted audit rows, but pending approval args and approved results could still be stored raw in `approvals`.

Fix:
- `app/api/mcp/route.ts` encrypts privacy-mode pending approval args with the vault and stores only redacted metadata in `approvals.args`.
- `0016_security_audit_fixes.sql` adds `approvals.args_ciphertext`, extends `gateway_create_approval`, and clears ciphertext after denial/finalization.
- `app/dashboard/actions.ts` decrypts approval args only in memory for execution and persists redacted approval/audit results in privacy mode.

Tests:
- `npm run typecheck` and `npm run test:security` passed.

### Medium: approval polling was project-scoped instead of agent-scoped

Affected area: gateway approval polling.

Exploit path: another agent key in the same project could poll a known approval id and receive the approved result for a ticket created by a different agent.

Fix:
- `0016_security_audit_fixes.sql` adds `approvals.agent_id` and stores the creating agent id in `gateway_create_approval`.
- `gateway_check_approval` now requires the polling key to belong to the exact creating agent.

Tests:
- `npm run test:security` verifies the agent id column, creation path, and polling join.

### Medium: runner tokens could be sent to arbitrary HTTP URLs

Affected area: `Polyshield` control-plane client.

Exploit path: `polyshield pair --url http://example.com` would send the bearer runner token to a non-TLS endpoint.

Fix:
- `src/api.js` now requires HTTPS by default.
- Loopback HTTP is allowed only with explicit `--insecure-local-dev` or `POLYSHIELD_INSECURE_LOCAL_DEV=1`.

Tests:
- `npm test` covers HTTPS accepted, non-loopback HTTP refused, and loopback HTTP opt-in behavior.

### Medium: MCP HTTP client had DNS rebinding TOCTOU gap

Affected area: `PolyShield-App/lib/mcp/client.ts`.

Exploit path: endpoint registration resolved a public IP, but later `fetch` could connect after DNS changed to private/metadata IP.

Fix:
- Replaced internal MCP POST transport with `http/https.request` using a guarded DNS lookup on every connection.
- Redirects are still not followed.
- Response body size is capped.

Tests:
- `npm run typecheck` and `npm run test:security` passed.

### Low: security headers missing

Affected area: Next config.

Fix:
- Added CSP, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and production-only HSTS in `next.config.ts`.

Verification:
- Local HTTP response includes CSP, nosniff, referrer policy, and permissions policy.

## Issues Not Fixed

- Full kernel-level sandboxing is still partial unless Docker containerization is enabled and succeeds. Host-mode still cannot guarantee true process containment for arbitrary trusted MCP servers.
- MFA is still enforced mainly in Next middleware, not in Supabase RLS write policies. A future migration should require `aal2` for sensitive direct table writes where applicable.
- The `Polyshield` repo still tracks `polyshield-runner.zip` and `youtube-research.sqlite`. No high-confidence secrets were found, but these opaque artifacts should be removed from source history if not required.
- The new migration was not applied to a live Supabase database in this run because no real `SUPABASE_DB_URL` was available.
- The only connected Supabase project exposed through the connector appeared unrelated to Polyshield, so no migration was applied there.

## Validation Summary

- `npm ci` in both repos: passed.
- `npm run typecheck` in `PolyShield-App`: passed.
- `npm run lint` in `PolyShield-App`: passed after adding minimal ESLint config and fixing two lint findings.
- `npm run test:security` in `PolyShield-App`: passed, including policy, shield, SSRF, and security migration regression checks.
- `npm run build` in `PolyShield-App`: failed without env, passed with dummy local Supabase/vault env.
- `npm audit --audit-level=high` in both repos: passed, zero vulnerabilities.
- `npm test` in `Polyshield`: passed, 26 checks.
- Browser smoke: landing page, sign-in page, and unauthenticated dashboard redirect passed.
