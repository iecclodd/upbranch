# Hands-on workspace upgrade — October 26, 2026

The first-agent mission now teaches supervision by letting learners change a fictional website build. It replaces the multiple-choice player on both first-agent routes. Other missions, existing gateway/auth surfaces and research/project catalogs are preserved.

## What changed

- The homepage now opens with “It looks right. Can you trust it?” and a concrete missing-requirement/access example. Its small inspection card is explicitly a fixed illustration.
- Learners write a bounded brief, see recognized requirements, generate virtual `index.html` and `brief.txt`, inspect source and an actual first-run-to-current diff, and view the static website on desktop or in a narrow preview.
- Five literal checks inspect the generated artifact. The incomplete starter fails three checks. Editing the brief or applying a targeted repair changes files, rendering and check results. These are content/CSS checks, not an automated browser test suite or AI grading.
- The permission inspector calls the unchanged `evaluatePolicy` implementation. It shows the request, winning rule, actual condition and decision. A protected fictional student-records path remains denied even when the learner chooses Allow. Publishing uses a separate human approval step; no site or data is actually published by the simulation.
- Approval is tied to the current build: generation/repair clear approval and evidence. Changing a qualifying permission decision revokes completion. Policy actions are disabled before a project exists.
- Completion leads directly to the existing accessible-event project brief, connecting scoping, verification and permission practice to a beginner build.

## Boundaries

This is an intentionally small rule-based interpreter, with supported Title/Audience lines and requirement keywords. It does not understand arbitrary requests as a model would. There is no browser IDE, live model, arbitrary code runner, uploaded learner data, network access from the generated preview, or real filesystem access. The preview uses escaped static HTML in an iframe with an empty sandbox. Only completion is saved locally; prompts and virtual files stay in the current tab.

## Executed validation

- Integrated TypeScript and lint pass. Lint's internal Next navigation finding was fixed with `Link`.
- Eleven Upbranch test groups pass: the previous seven groups/438 legacy authored paths plus four workspace groups covering changed instructions, actual file repair, escaping/bounds and real policy evaluation.
- All 132 existing security checks pass (40 policy, 35 shield, 22 SSRF, 35 migration).
- Parent browser verification observed starter checks at 2/5, edited instructions changing source and rendered cards, a real colored diff, narrow preview, checks at 5/5, protected Allow resolving to Deny, human mock approval/completion, completion revoked on policy denial, and old approval cleared after regeneration. A vague brief failed 0/5; targeted repair produced a new preview and 5/5 checks.
- Independent source review identified the stale approval/completion bug. After correction, review returned go with no remaining blocker in scope. Exact full-page 375px, assistive technology and real provider/account integration were not tested.
- Cloud build, production commit and final hosted smoke are recorded in `DEPLOYMENT_STATUS.txt` beside the source checkout after release.

## Team and files

| Lane | Requested route | Ownership / reason for parallel execution |
| --- | --- | --- |
| Integration scout | Luna Low | Read-only route/progress/policy map before implementation |
| Runtime | Terra High | New pure workspace runtime and focused tests, separate from UI |
| Homepage story | Terra Medium | Homepage and isolated inspection component/styles |
| Workspace UI | Terra High | Workbench component and CSS module, using runtime contract |
| Independent review | Sol High | Read-only review of approval semantics, escaping and policy boundaries |

Effective routing was not exposed in authoritative runtime metadata and remains unverified. Writers used separate worktrees, with depth one and no grandchildren. The parent integrated and fixed review findings, owns both route adapters, metadata/content summary, documentation and production deployment. No new dependency or schema migration was introduced.
