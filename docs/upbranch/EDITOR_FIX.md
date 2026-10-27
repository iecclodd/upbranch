# File editor fix — October 26, 2026

The user could not edit or run files because Files → Source was a read-only `pre` element. The previous guided layout did not provide a code editor. The brief generator was the only editable input.

Files → Source now edits `index.html` and `brief.txt`. Create starter files works before generation. Run preview (or Ctrl/Cmd+Enter) applies the draft and renders the HTML/CSS. Generate from brief is named separately because it replaces file contents. Unsaved edits immediately invalidate checks, approval and completion; checking or approving stale drafts is disabled. Reset clears the tab-local draft.

Edited previews use a restricted static HTML/CSS subset, a first restrictive CSP and the existing empty iframe sandbox. Scripts, frames, navigable attributes, external resources, images and active namespaces are excluded. This is not JavaScript, Python, shell or a live AI runtime. Files are bounded to two known paths and 40 KiB per file; errors are shown in the workbench. Drafts are not cloud-saved.

Checks now inspect the canonical rendered output. Independent review caught a defect where discarded `noscript` content could pass raw-source checks; grading the preview fixes it, with a regression test for noscript, SVG and template wrappers. Authored doctypes no longer appear as visible text.

Changed: `agent-workspace.tsx`/CSS, `lib/upbranch/workspace/runtime.ts`, `lib/upbranch/labs/guides.ts`, `tests/upbranch/workspace.test.mjs`, and project guidance. No dependencies, auth, gateway or database changes.

Team: read-only scout Luna Low identified the source-view mismatch; isolated UI and runtime writers requested Terra Medium; independent security/correctness review requested Sol High. Parent integrated, fixed canonical grading, updated docs and tested in the browser. Effective routing was not independently observable; no grandchildren were used.

Validation: typecheck, lint, all 20 learning tests and all 132 security checks passed. Browser checks confirmed starter creation, actual HTML/CSS editing, changed rendered heading/styles/cards, 5/5 checks, immediate revocation after another edit and Ctrl+Enter preview. Production build and final hosted verification are recorded in `RELEASE_HANDOFF.md`.
