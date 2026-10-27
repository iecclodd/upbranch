export type LabReference = {
  title: string;
  body: string;
  example?: string;
  href?: string;
};

export type LabCheckpoint = {
  id: string;
  title: string;
  task: string;
  steps: string[];
  reference: LabReference[];
  hint: string;
};

export type LabGuide = {
  missionId: string;
  title: string;
  description: string;
  checkpoints: LabCheckpoint[];
  resources: { title: string; href: string }[];
};

export const labGuides: LabGuide[] = [
  {
    missionId: "first-agent",
    title: "Your First AI Agent",
    description: "Build, test and review a fictional school club website.",
    checkpoints: [
      {
        id: "build",
        title: "Build a first draft",
        task: "Generate starter files, then edit and run the page in Files.",
        steps: ["Choose Generate from brief, or open Files and create starter files.", "Edit index.html in Source, then choose Run preview."],
        reference: [
          { title: "Brief format", body: "Title: names the website. Audience: names its readers. Put the required sections and behavior on the following lines.", example: "Title: School Garden Club\nAudience: students and families\nInclude an introduction and a contact button." },
          { title: "Edit and run files", body: "Files → Source is an editable HTML/CSS editor. Run preview applies the edited files and renders index.html; Ctrl/Cmd+Enter also runs it. Changes compares source with the first build. Only a static subset of HTML/CSS is rendered: scripts, external requests, images and links are blocked. Drafts stay in this tab; only completion is saved locally." },
          { title: "Supported requirements", body: "The simulator recognizes intro/about, contact, services, testimonials, three cards, mobile/responsive, and sample/example/fictional data. Other requests may be ignored. This is a rule-based exercise, not a live model." },
        ],
        hint: "The first draft intentionally leaves out three requirements. Running it creates a draft; it does not prove the draft is complete.",
      },
      {
        id: "test",
        title: "Test and improve",
        task: "Make the page include three cards, a mobile layout and fictional sample data. Pass all five checks.",
        steps: ["Open Checks and run the checks.", "Edit index.html in Files, then choose Run preview. You can also regenerate from a refined brief.", "Inspect the new preview and Changes; rerun the checks."],
        reference: [
          { title: "Generate, Run and Check", body: "Generate from brief replaces the files using the supported brief phrases. Files → Run preview renders your edited HTML/CSS instead. Run checks inspects that rendered output. Edits immediately clear previous checks and approvals; run the draft before checking." },
          { title: "Acceptance criteria", body: "The five checks look for a title, an audience, exactly three cards, responsive CSS and fictional sample data. They are literal content/CSS checks, not automated browser or accessibility tests.", example: "Include three cards.\nUse a mobile layout.\nInclude fictional sample data." },
          { title: "HTML and CSS example", body: "Add three article.card elements to the page and a narrow-screen CSS rule. Keep the intended audience visible in the page text.", example: '<style>.cards{display:grid;grid-template-columns:repeat(3,1fr)}\n@media(max-width:600px){.cards{grid-template-columns:1fr}}</style>\n<div class="cards">\n  <article class="card">Fictional seed swap</article>\n  <article class="card">Fictional workshop</article>\n  <article class="card">Fictional harvest</article>\n</div>' },
          { title: "Inspect both views", body: "Desktop and Mobile change the preview width. Check text wrapping and card layout yourself; a passing literal check cannot establish every visual detail." },
        ],
        hint: "Add explicit requests for three cards, a mobile layout and fictional sample data. Run again before checking. Use the optional repair only after inspecting what failed.",
      },
      {
        id: "protect",
        title: "Protect private data",
        task: "Review the sensitive-file request and deny access to the fictional private student records.",
        steps: ["Select Read a sensitive file in Permissions.", "Compare the request with the website task, then choose Deny."],
        reference: [
          { title: "Least privilege", body: "A public club page needs only the project context required for that page. Private student records are unnecessary for this task. Choosing a narrower request reduces what the fictional assistant can access." },
          { title: "Policy result", body: "The existing policy evaluator checks the fictional request. Its explicit deny for private/ paths wins even if you choose Allow. To finish this checkpoint, you must choose Deny yourself.", example: "read private/student-records.csv → deny" },
          { title: "What the inspector shows", body: "Policy details exposes the requested action/path, matching rule and condition. No file on your device is read. The real gateway defaults to allow when no policy matches; this exercise supplies explicit protective rules." },
        ],
        hint: "A blocked request and a good human decision are separate things. Choose Deny to record your own review.",
      },
      {
        id: "publish",
        title: "Review publishing",
        task: "Require a human approval before the mock publishing action, then approve the checked build.",
        steps: ["Select Publish project preview.", "Choose Require approval, then Approve mock publish."],
        reference: [
          { title: "Separate review from approval", body: "Requiring approval pauses the fictional request. Approve mock publish is a separate human action; selecting the policy alone does not approve it. Nothing is actually published." },
          { title: "Completion evidence", body: "The lab completes only when the current build passes all five checks, you have denied the sensitive request, and you have approved the pending mock publish. Regenerating or repairing the build clears that evidence." },
        ],
        hint: "If approval is unavailable, generate a build first. Complete the checks and private-data checkpoint for that build, then request approval for publishing.",
      },
    ],
    resources: [
      { title: "Lesson: Give clear instructions", href: "/learn/course/clear-instructions" },
      { title: "Lesson: Tools and permissions", href: "/learn/course/tools-and-permissions" },
    ],
  },
  {
    missionId: "spot-the-hallucination",
    title: "Reality Check",
    description: "Decide how to investigate an unsupported AI claim.",
    checkpoints: [{
      id: "sources",
      title: "Check a claim",
      task: "The cited report cannot be opened. Choose a next step that could establish whether the claim is supported.",
      steps: ["Read the scenario and the reference in Docs.", "Choose a response, inspect its feedback and review your result."],
      reference: [
        { title: "Claim and evidence", body: "Confident wording and a citation-shaped URL do not establish that a source exists or supports a claim. Identify the exact claim, look for an accessible original source, and check whether its text supports that claim." },
        { title: "When a source is unavailable", body: "An unavailable link leaves the evidence unresolved. Ask for a verifiable source or search the original publisher. Keep the uncertainty visible rather than repeating the claim as fact.", example: "Claim → original source → supporting passage → limits" },
      ],
      hint: "Choose the response that seeks a source you can verify, rather than accepting the claim because it sounds authoritative.",
    }],
    resources: [{ title: "Lesson: Verify the claim", href: "/learn/course/verify-claims" }],
  },
  {
    missionId: "permission-architect",
    title: "Permission Architect",
    description: "Choose the minimum access needed for a fictional task.",
    checkpoints: [{
      id: "scope",
      title: "Choose minimal access",
      task: "The assistant only needs to summarize a public README. Give it the smallest useful set of tools.",
      steps: ["Compare each proposed permission with the task.", "Choose a response, inspect its feedback and review your result."],
      reference: [
        { title: "Match access to the task", body: "Reading the supplied README can support a summary. Shell execution, arbitrary network access and unrelated private files are not required for this fictional task." },
        { title: "Permission decisions", body: "Allow permits a scoped request. Deny blocks it. Require approval pauses a consequential action for a separate human review. Prefer a narrowly scoped request when it can complete the task.", example: "Task: summarize README\nNeeded: read the supplied README\nUnnecessary: private files or shell execution" },
      ],
      hint: "Look for the option limited to reading the relevant public document.",
    }],
    resources: [{ title: "Lesson: Tools and permissions", href: "/learn/course/tools-and-permissions" }],
  },
];

export function getLabGuide(missionId: string): LabGuide | undefined {
  return labGuides.find((guide) => guide.missionId === missionId);
}
