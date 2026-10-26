# Upbranch release handoff

## Current state

- Source root: `C:\Users\azaan\Documents\Codex\2026-10-26\do-th\outputs\upbranch`
- Tested and deployed commit: `70f881e`; repository: https://github.com/iecclodd/upbranch
- Local development address: http://localhost:3000 when the development server is running.
- Vercel project: `upbranch`, `prj_eEGr3q3N3kwMBApkom4iRmfT2LT5`, under `azaannoman03-8683s-projects`. Production deployment `dpl_DK4vHmS7mrdpb3G6qYLaAPHqMVTF` is READY and promoted. Public production address: https://upbranch.vercel.app. All 21 public routes returned 200 without authentication or redirects; an unknown mission returned 404. The protected deployment URLs are separate from the public production domain.
- This documentation was added after the tested product commit. The user canceled the proposed Worktree app move; development remains in this Codex checkout. Preserve unrelated working-tree changes and inspect `git status` before edits.

## What exists

Upbranch is a Next.js App Router learning experience with authored mission content and a deterministic local simulation. The original PolyShield dashboard, authentication, gateway and API surfaces are retained. Learner progress is local browser storage; the public mission is not a real autonomous agent or remote code executor. The ASCII canopy is original implementation inspired by the visual feel of daoho.dev; no code was copied from that site.

- `app/page.tsx`, `app/globals.css`, `components/upbranch/marketing/` and `components/upbranch/ui/`: landing page, visual treatment, canopy, shared shell.
- `app/learn/`, `app/labs/`, `components/upbranch/labs/`, `lib/upbranch/content/` and `lib/upbranch/runtime/`: lessons, player, authored missions, transitions, scoring and fixed security demonstration.
- `app/paths/`, `app/discover/`, `app/portfolio/`, `components/upbranch/discover/`, `lib/upbranch/pathways/` and `lib/upbranch/bounties/`: pathways, project ideas and ranking.
- `app/radar/`, `components/upbranch/radar/`, `lib/upbranch/radar/`: curated research items and provenance.
- `lib/upbranch/contracts.ts`, `catalog.ts`, `config.ts`, `progress.ts`: shared contracts, catalog and bounded local progress.
- `app/dashboard/`, `app/api/mcp/`, `lib/gateway/`: original PolyShield product and security surfaces; preserve their behavior.
- `tests/upbranch/`, `scripts/`, `docs/upbranch/`: regression checks, existing security checks, release and third-party notes.

## Verification reported for commit 70f881e

The integrated Upbranch suite passed all seven test groups, including exhaustive replay of 438 completed mission choice paths. The existing security checks reported 132 passes. Typecheck, lint and the Vercel cloud build passed. `npm audit` reported zero vulnerabilities after updating Next.js and `eslint-config-next` to 15.5.28 and resolving compatible transitive dependencies. These are recorded results, not a claim that all security or accessibility concerns have been audited.

Reproduce from the source root with the existing lockfile and Node 24:

```powershell
npm ci
npm run test:upbranch
npm run test:security
npm run typecheck
npm run lint
npm run build
npm audit
npm run dev
```

`npm ci` modifies local dependencies; preserve any environment-specific setup. Use only safe test configuration. Do not print, copy, commit or share secrets, OIDC tokens, CLI authentication files, or `.env` files and their values.

## Audit priorities and known limits

1. Public production access, route smoke checks, first-agent completion (18/18) and refresh persistence passed. Review additional learner branches and account-dependent surfaces separately.
2. Review branch transitions, scores and feedback for educational correctness; confirm simulation language does not imply a live model or real tool access. Check the local progress reset and corrupt-storage behavior.
3. Check external project and Radar links, source dates and review labels; the Radar is curated, not an asserted live feed. Confirm project ideas are not described as paid work.
4. Inspect keyboard focus, reduced-motion behavior and responsive layouts. An exact 375px screen-reader audit has not been completed. The combined manual-pause/reduced-motion resume edge case was corrected before release.
5. Review separation from the existing dashboard, gateway and `/api/mcp`, including that no public learner content exposes credentials or invokes privileged tools. Account-dependent integrations are not configured and have not been validated end to end.
6. Review notices, AI-assistance disclosure and actual feature claims against the applicable submission requirements. A demo script is in `docs/upbranch/RELEASE_CHECKLIST.md`; no recording or portal submission is asserted here.
