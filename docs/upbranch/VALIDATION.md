# Upbranch R0 validation — October 26, 2026

This records the initial release. The first-agent player has since been replaced with a hands-on workspace; see `WORKSPACE_UPGRADE.md`. The subsequent video/article/quiz course is documented in `COURSE_SOURCES.md` and `KIT_COVERAGE.md`. Current deployment evidence is in the sibling `outputs/DEPLOYMENT_STATUS.txt` deliverable.

## Scope and result

Built on PolyShield baseline `3f3a7a0b624dcabd594684b9d0cee5acbfa802bb`: public homepage, six-stage branching first-agent simulation, two additional playable simulations, three future lesson previews, three pathways, ten unpaid educational project briefs, local evidence checklist/export/reset, five source-backed curated Radar cards, and an honest read-only Studio preview.

Changes are confined to public Upbranch routes/components/domain data/tests, root marketing/layout/style, compatible dependency security patches, package test script, and project agent guidance. `lib/gateway`, `lib/supabase`, `app/dashboard`, `app/api`, `app/auth`, middleware and migrations have no diff from baseline. Global legacy CSS tokens remain. Local Satoshi is retained; Google serif/mono fonts use system fallbacks, which can slightly change those faces in legacy pages.

## Executed checks

| Check | Result |
| --- | --- |
| `npm ci --no-fund --no-audit` | Initial install passed; final lockfile subsequently received compatible security patches, with no new direct runtime capability |
| `npm run typecheck` | Pass; production build also checks TypeScript |
| `npm run test:upbranch` | 7/7 pass; 438 complete published mission paths checked |
| `npm run test:security` | Pass: policy 40, shield 35, SSRF 22, migration 35; 132 total |
| `npm run lint` | Pass, no warnings/errors; `next lint` is deprecated in Next 15 |
| `npm run build` | Pass; 32 pages generated and all dynamic routes compiled |
| `git diff --check` | Pass; Git may report Windows LF/CRLF conversion notices |
| Scoped changed-code secret-pattern scan | Zero matches in four tested token/private-key patterns; not a comprehensive secret audit |
| `.codex/config.toml` parsing | Pass with Python `tomllib` |
| `npm audit --json` after compatible patches | Zero known registry advisories; no `--force` upgrades used |

The inherited auth pages require a Supabase URL/key during prerender. The successful local build used an `.invalid` URL and an explicitly fake test-only key, supplied only to the build process; no production credentials were used. An initial build without these values failed at the inherited auth pages. The earlier uncached build also reported the inherited Supabase Edge `process.version` compatibility warning. These checks do not establish real account sign-in or production provider connectivity.

## Actual browser checks

In the local app, without learner login or API credentials:

- Loaded the finished homepage and its real mission, project and Radar links.
- Completed first-agent with six decisions and an 18/18 path score. Feedback and the synthetic workspace updated; the fixed protected-file request resolved to deny using the existing policy evaluator.
- Refreshed and observed the completed debrief resume from browser storage.
- Used back twice, reset to the initial state, and took the alternative brief-remediation branch.
- Viewed all three pathway previews, ten project cards and a project detail page. Project search reduced the visible results.
- Viewed five curated Radar sources; selecting Agents reduced the results to two.
- Confirmed the formerly hidden project CTA computes as white text on ink background after the independent review fix.
- Observed narrow and wider layouts (approximately 487px and 957px). Exact 375px emulation, assistive-technology testing and a full accessibility audit were not performed.

Screenshots in the sibling outputs/screenshots directory capture the actual app. The sibling `upbranch-demo.mp4` is an 80-second silent, captioned walkthrough composed from those captures; it is not continuous screen-recorded interaction. Its verified encoding is H.264, 1280×720, 24 fps.

## Independent review and agents

Ten agents contributed across independent scopes. All feature writers used isolated Git worktrees. The parent integrated branches, fixed review findings and ran final checks.

| Role | Requested model / effort | Purpose |
| --- | --- | --- |
| Product/contracts scout | Luna / Medium | Frozen interfaces and R0 scope |
| Reuse/provenance scout | Luna / Medium | Independent source/date and reuse check |
| Core/curriculum | Terra / Medium | Types, progress, lessons and learner routes |
| Frontend | Terra / Medium | Shared shell, responsive editorial homepage |
| Labs/runtime | Terra / High | Branch replay, scoring and safe synthetic policy fixture |
| Discovery | Terra / Medium | Paths, matching, project briefs, portfolio |
| Radar | Terra / Medium | Static curated metadata and filters |
| QA | Terra / High | Durable runtime, storage, source and fixture tests |
| Final reviewer | Sol / High | Independent correctness and boundary review |
| Demo video | Terra / Medium | Actual-screen captioned walkthrough |

Effective child routing was not exposed in authoritative runtime results and remains unverified. The review found the link-reset specificity issue and missing skip-link targets; both were corrected and independently rechecked. Keyed players prevent cross-mission state reuse; reset/back now consistently remove the current mission's completion flag. No new review blockers remained.

The subsequent user-directed design pass added an original, contained ASCII canopy to the hero. TypeScript, lint and diff checks passed; browser checks observed the glyph field and confirmed Pause/Resume. Independent QA reviewed the bounded drawing, SSR-safe effects, reduced-motion handling and observer/timer cleanup. The small combined pause/reduced-motion resume edge case was corrected. Source and hosting were moved to the user's independent `iecclodd/upbranch` repository and own Vercel project; the prior Arya-host deployment is outside the current release target.

The first cloud install exposed ten inherited dependency advisories. Independent review identified applicable App Router/Server Actions denial of service in Next 15.5.19 ([GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r)), along with conditional image and platform issues. Next and eslint-config-next were pinned to 15.5.28. Ordinary `npm audit fix`, without `--force`, patched compatible transitive versions, including sharp 0.35.5 and PostCSS 8.5.32. The resulting audit is zero, and TypeScript, lint, all 132 security checks and all seven Upbranch groups (438 paths) passed again. The final cloud build and hosting result are recorded separately.

## Production release evidence

Product commit `70f881e` built successfully on Vercel with `npm ci` and Next 15.5.28. Deployment `dpl_DK4vHmS7mrdpb3G6qYLaAPHqMVTF` was READY and promoted on October 26, 2026 to https://upbranch.vercel.app, under the user's own Vercel project. Source is https://github.com/iecclodd/upbranch. The production domain is publicly accessible without a Vercel login; deployment URL protection was preserved.

Independent `node --experimental-strip-types work/smoke-production.mjs` checked all 21 public production routes: HTTP 200, no redirects, correct Upbranch/main-content markers. `/learn/does-not-exist` returned 404. Curated Radar and unpaid project labels were confirmed in hosted HTML. In the production browser, the parent completed the first-agent mission at 18/18 and refreshed to confirm saved debrief persistence. `outputs/screenshots/live-home.png` and `live-mission-complete.png` record the live UI. Later documentation-only commits do not change the deployed product code.

## Remaining limits

The shipped activities are authored simulations, not live AI. Studio execution, remote Worktree handoff, automatic paper ingestion, server-synced accounts and validated adaptive learning are future scope. Real sign-in/billing/provider integration was not exercised. No production database writes, security permission changes, real runner invocation, video portal upload or contest submission occurred. Deployment status must be recorded separately; local build success does not prove a hosted deployment or submission acceptance.
