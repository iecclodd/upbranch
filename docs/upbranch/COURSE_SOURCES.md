# Course source notes

Metadata checked 2026-10-26 using indexed YouTube video pages. Titles, channel names and IDs below match the publisher's YouTube records. Integration browser checks loaded all three embedded YouTube players and confirmed their displayed title/channel; the IBM language-model video also played briefly. Entire videos and playback in other regions/browsers were not tested. The lessons' articles and quizzes are original; video transcripts were not copied or downloaded.

- [How Large Language Models Work — IBM Technology](https://www.youtube.com/watch?v=5sLYAQS9sWQ): used for both foundations lessons. IBM's [large language models explainer](https://www.ibm.com/think/topics/large-language-models) supports the model overview.
- [Generative AI and prompting 101 — Microsoft 365 Developer](https://www.youtube.com/watch?v=PGI6oxbcYDc): used for both working-with-AI lessons. The video provides prompting background; the privacy lesson extends that topic with NIST guidance.
- [5 Ways to Connect AI Agents to Tools: From APIs to MCP — IBM Technology](https://www.youtube.com/watch?v=BHGTA6ZEls4): used for both agent lessons. It discusses tool connections; the lessons introduce supervision and permissions beyond the video.

Written source references: [NIST Generative AI Profile](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=958388) discusses confabulation, privacy, information integrity and human oversight. [NIST Agent Hijacking Evaluations](https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations) describes malicious instructions in ingested content. These are educational sources, not guarantees about any product's behavior.

## Integration evidence

- Six lessons, three units, six original articles and eighteen authored questions; three publisher videos are reused across related lessons and are cited by title/channel/link in the UI.
- `npm run typecheck`, `npm run lint`, all fifteen Upbranch groups and all 132 existing security checks passed. New tests cover catalog references, video URL/ID consistency, grading, best-score retention, required format completion, corrupted/oversized/unknown progress and storage-write failures.
- Parent browser checks: click-to-load player, self-marked video, article/citations, quiz feedback at 2/3, retry at 3/3, dashboard completion at 1/6 (17%), refresh persistence and next-incomplete lesson resume. Only review marks and best scores are persisted; no watch time is inferred.
- Independent HTTP verification: thirty local routes returned 200, unknown lesson routes 404, six distinct external source URLs returned 200. HTTP success alone does not establish playback.
- Independent review found an inherited CSP blocking embedded video. The fix adds only `frame-src 'self' https://www.youtube-nocookie.com`; its actual local response header was verified. Other directives remain intact.
- Course UI and content were implemented in separate worktrees (requested Terra High and Terra Medium); the progress/test/integration layer was parent-owned. Independent review requested Sol High; route/link checks requested Terra High; kit audit requested Luna Low. Effective routing remains unverified.

Current production commit and deployed smoke checks are recorded in `DEPLOYMENT_STATUS.txt` beside the checkout. This course pattern uses original Upbranch branding and prose; no Khan Academy lesson text, assets or source code was copied.
