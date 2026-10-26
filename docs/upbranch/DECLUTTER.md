# Interface cleanup — October 26, 2026

The interface repeated instructions, labels, badges and actions across several competing panels. This release gives each screen one clear focus and puts optional information behind native disclosures.

## Changes

- Home: three focused sections, restrained ASCII motion, compact navigation and footer.
- Learn: one course action, a simple six-lesson list and compact practice links. Lessons retain Video, Article and Quiz; mobile course contents, source lists and progress explanations expand on demand.
- Workspace: preview first; Files, Checks and Permissions remain directly accessible. Failed checks stay visible, passed checks collapse. Contextual actions lead from successful checks to permissions and from protected-data denial to publishing review. Technical interpretation, activity and policy details expand on demand.
- Paths, Labs, Discover, Portfolio and Radar: removed repeated promotional copy and secondary labels. Search remains visible; filters, data actions and supporting details expand on demand.
- Kept educational article prose, publisher citations, quiz feedback, explicit simulation boundaries and consequential policy decisions. No dependency, catalog, progress-schema, gateway, account or database changes.

Readable workspace TSX/CSS replaces compressed presentation code. Native disclosure elements and semantic controls preserve an inspectable DOM and direct actions without another component system. Runtime behavior remains in the existing pure modules.

## Team and ownership

| Role | Requested model / effort | Scope | Purpose |
| --- | --- | --- | --- |
| Read-only scout | Luna / Low | Workspace clutter map | Identify priorities independently |
| Course writer | Terra / Medium | Course dashboard, lesson and CSS | Simplify course hierarchy |
| Site writer | Terra / Medium | Home, shared shell, inspection preview | Simplify entry and navigation |
| Workspace writer | Terra / Medium | Agent workspace and CSS | Simplify build/check/review flow |
| Secondary writer | Terra / Medium | Paths, Labs, Discover, Portfolio, Radar | Remove competing labels/actions |
| Independent reviewer | Sol / High | Integrated diff and qualification guards | Check correctness and regressions |
| HTTP tester | Terra / High | Local and production route smoke | Verify destinations and CSP |

Writers used separate Git worktrees with disjoint ownership and stopped after their scoped changes. The parent integrated commits and owned route wrappers, final copy, contextual navigation, responsive fixes and browser verification. Effective model/effort routing was not independently observable; requested routes are not proof of effective routing. No grandchildren were spawned.

## Evidence

- `npm run typecheck`: passed.
- `npm run lint`: passed; inherited Next lint deprecation notice only.
- `npm run test:upbranch`: 15/15 groups, including all 438 legacy paths, passed.
- `npm run test:security`: 132/132 checks passed.
- `git diff --check`: passed; Windows line-ending notices only.
- Independent local HTTP smoke: 30 routes returned 200 without redirects; unknown course/learn/labs routes returned 404.
- Local browser: build, failed checks, repair, all checks passing, source diff, protected-data denial, publishing approval, completion and revocation on a new run passed. Contextual navigation does not grant permissions or completion. Independent source review found no P1/P2 issue.
- Local browser: article/source disclosures, quiz grading 3/3 and persisted completion survived the presentation changes. At 348px viewport width, workspace tabs fit and the document had no horizontal overflow. Exact 375px and assistive-technology audits were not performed.

Production build, promotion and final public verification are recorded in `RELEASE_HANDOFF.md`. Original kit coverage limits remain in `KIT_COVERAGE.md`; this cleanup does not implement deferred backend or general agent execution.
