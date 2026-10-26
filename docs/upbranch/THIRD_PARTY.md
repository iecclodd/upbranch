# Third-party and AI assistance notes

This is a release preparation record, not a complete third-party license inventory. Existing project notices and license files must be retained. Before distribution, generate and review a full direct and transitive dependency inventory from the final lockfile, preserve required license texts and notices, and check any provider terms. Versions below are the packages installed in the QA checkout when inspected, not a claim about the final deployment.

| Package | Installed version | Declared license | Source |
| --- | --- | --- | --- |
| Next.js | 15.5.28 | MIT | https://github.com/vercel/next.js |
| React | 19.2.7 | MIT | https://github.com/facebook/react |
| React DOM | 19.2.7 | MIT | https://github.com/facebook/react |
| Lucide React | 0.468.0 | ISC | https://github.com/lucide-icons/lucide |
| Framer Motion | 12.40.0 | MIT | https://github.com/motiondivision/motion |
| Tailwind CSS | 3.4.19 | MIT | https://github.com/tailwindlabs/tailwindcss |
| ESLint config Next | 15.5.28 | MIT | https://github.com/vercel/next.js |
| PostCSS | 8.5.32 | MIT | https://github.com/postcss/postcss |
| sharp (existing Next image dependency) | 0.35.5 | Apache-2.0 | https://github.com/lovell/sharp |

The Upbranch build used AI coding assistance through Codex, including parallel implementation and QA assistance. Human contributors should identify their own actual roles and review the final wording against the relevant competition rules. No video recording or portal submission is implied by this note.

The kit evaluates Sandpack, WebContainers and other candidates; their appearance in planning material does not mean they were installed or shipped. If adopted later, review the actual versions, licenses, separate execution-service terms, privacy, CSP and network behavior before release.

The original hero ASCII canopy takes visual inspiration from the organic character motion on https://www.daoho.dev. Its glyph field, shapes and animation implementation were authored for Upbranch; no source code, fish artwork or other assets were copied. The accent has pause/resume, reduced-motion and offscreen behavior.

Before the independent production release, Next and its ESLint configuration were pinned to 15.5.28, and compatible transitive patches were applied with `npm audit fix` without `--force`. The final local audit reports zero known registry advisories. This is a dependency advisory check, not a proof that the application is free of vulnerabilities.
