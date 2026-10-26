# Guided lab system — October 26, 2026

## Learning-platform references

The user asked for a substantial CodeHS-inspired rework while preserving the preceding uncluttered interface. These official sources were checked on October 26, 2026:

| Reference | Verified pattern | Upbranch adaptation |
| --- | --- | --- |
| [CodeHS code editor guide](https://help.codehs.com/en/articles/3676369-using-the-codehs-code-editor) and [CodeHS IDE](https://codehs.com/ide) | Documentation in the editor, distinct run/check controls, assignment navigation and configurable work/output views. | Persistent Instructions/Docs pane beside the activity; separate build and checks; checkpoint selector and Back/Next. |
| [Codecademy lessons and projects](https://help.codecademy.com/hc/en-us/articles/14298560842267-How-Lessons-and-Projects-Differ-in-Codecademy-s-Learning-Environment) | Guided lessons use instructions and checked exercises; project tasks can use manual checklists. | Workspace checkpoints depend on actual simulator evidence. Decision exercises retain their authored scoring; neither is presented as an externally validated assessment. |
| [freeCodeCamp workshop authoring guide](https://contribute.freecodecamp.org/how-to-work-on-workshops/) | Short ordered tasks introduce concepts incrementally, with hints and tests matching the stated requirement. | Original contextual documentation, examples and hints; new regression coverage verifies the guide's example actually satisfies the simulator. |

These are design adaptations, not copied platform text, code, assets or branding. The lab documentation is original and explains Upbranch's actual behavior. The user-facing lessons remain about AI supervision, rather than the implementation of this website.

## Shipped behavior

- `/labs` lists three assignments, their activity type/duration, validated browser-local completion and the first unfinished lab. All-complete state offers Review labs.
- Both `/labs/[missionId]` and existing `/learn/[missionId]` use `LabActivity`, preserving their URLs and one shared layout.
- The first-agent lab has four checkpoints: build, test/improve, protect private data and review publishing. Instructions and contextual Docs remain beside the brief/workbench; references, examples, optional hints and related course lessons are available in place.
- The current checkpoint selector can navigate freely, but navigation grants no evidence. Next requires the current checkpoint's evidence. Completion still requires passing checks on the current artifact, the learner's sensitive-data denial and a separate pending mock-publish approval.
- Preview, virtual files, actual file diff, desktop/mobile views, literal checks and policy details remain available. Automatic repair is under Hint. Guide navigation replaces duplicate review buttons; completion offers the next project.
- Reality Check and Permission Architect use the same instruction/reference pattern, with their existing decision, feedback, debrief, Back, Reset, optional Activity and saved-score behavior. Docs remain available after completion.
- Main navigation is Learn / Labs / Projects / Radar; Paths remains in the footer with Studio and Progress.

The brief, virtual files and checkpoint evidence stay in the current tab. Only lab completion and existing decision-run state persist in the browser; there is no cloud autosave or new progress schema. No live AI, arbitrary code execution, filesystem access or real publishing was added. The six video/article/quiz lessons and publisher citations are unchanged.

## Code ownership

- `lib/upbranch/labs/guides.ts`: typed authored task/documentation content, separate from runtime logic.
- `components/upbranch/labs/agent-workspace.tsx` and CSS: guided workbench and evidence-driven navigation.
- `components/upbranch/labs/mission-player.tsx`, `lab-dashboard.tsx`, `guided-lab.module.css`: decision activities and assignment list.
- `components/upbranch/labs/lab-activity.tsx`, `app/labs`, `app/learn/[missionId]`: shared activity layout and route aliases.
- `components/upbranch/ui/site-shell.tsx`: primary Labs navigation.
- `tests/upbranch/lab-guides.test.mjs`: guide/catalog/reference alignment and executable documentation examples.

## Team and verification

| Role | Requested model / effort | Responsibility |
| --- | --- | --- |
| Repository scout | Luna / Low | Read-only component/state map before edits |
| Platform researcher | Terra / Medium | Independent official Codecademy/freeCodeCamp precedents |
| Workspace writer | Terra / Medium | Isolated workspace TSX/CSS ownership |
| Lab/index writer | Terra / Medium | Separate worktree, decision player, list and lab routes |
| Independent reviewer | Sol / High | Integrated state/evidence review and final parent delta |
| HTTP tester | Terra / High | Independent route/citation/CSP regression smoke |

Parent researched CodeHS, authored documentation/contracts/tests, integrated shared routes, refined navigation and performed browser checks. Writers had disjoint file ownership and isolated worktrees; no grandchildren were used. Effective model/effort routing was not independently observable.

- Typecheck and lint passed; inherited Node module-type and Next lint deprecation notices remain.
- All 17 Upbranch test groups passed, including the two new guide groups and 438 legacy authored paths. All 132 security checks passed.
- Independent local smoke passed 30 routes without redirects, unknown IDs returned 404, and course citations/video CSP remained intact.
- Browser: pre-generation permission controls disabled; Docs and examples beside the work; build enables Next; first checks 2/5; documented manual improvement produces three cards and 5/5; policy Allow remains denied but does not satisfy learner denial; Deny enables Next; publishing requires separate approval; completion enables next project; regeneration revokes completion/checks/approval and returns to Test.
- Browser: both decision exercises' Docs, authored feedback and next/debrief navigation passed; Back reopened the earlier question. Responsive workspace had no document overflow at 348px. Exact 375px and assistive-technology audits remain unperformed.
- Independent source review returned GO with no P1/P2 findings for both the integrated change and final parent delta.

Final cloud build was READY and promoted. Independent public smoke passed all 30 routes without redirects, missing IDs returned 404, and citations/CSP were retained. The public browser confirmed checkpoint Next, contextual Docs, generation and 5/5 checks; `outputs/screenshots/guided-lab-docs.png` shows the deployed result. Local browser checks also verified saved decision debrief after refresh, the correct 2-of-3 assignment count and first-unfinished resume, and the mobile navigation menu. Exact deployment identity is in `RELEASE_HANDOFF.md`. Original kit coverage limits remain in `KIT_COVERAGE.md`.
