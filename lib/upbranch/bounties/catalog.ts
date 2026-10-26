import type { Bounty } from '../contracts';

export const bounties: Bounty[] = [
  {
    "id": "ai-source-checker",
    "title": "AI Claim Evidence Checker",
    "problem": "Unsupported AI claims can spread in student research.",
    "whyItMatters": "Build practical understanding through verifiable artifacts and a clearly scoped real-world problem.",
    "aiOpportunity": "Use AI for initial hypotheses or explanations, then verify claims against source data and a simple baseline.",
    "difficulty": "beginner",
    "domains": [
      "research",
      "education"
    ],
    "prerequisiteSkillIds": [
      "verification"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "Source comparison exercise",
        "url": "https://pair.withgoogle.com/guidebook/",
        "type": "tutorial"
      },
      {
        "title": "Evaluating AI agents",
        "url": "https://arxiv.org/abs/2407.01502",
        "type": "paper"
      }
    ],
    "mvpDeliverables": [
      "Working prototype or structured evidence document",
      "Documented source references and assumptions"
    ],
    "evaluationCriteria": [
      "Clear baseline comparison",
      "Reproducible checks against known examples",
      "Discussion of limitations and error cases"
    ],
    "stretchGoals": [
      "Test with a consenting user and improve accessibility"
    ],
    "evidenceChecklist": [
      "GitHub repository or dated notebook",
      "Screenshots/video of actual functioning features",
      "Evaluation results and limitations",
      "Short reflection on what AI did versus student work"
    ],
    "estimatedScope": "weekend",
    "isPaidOpportunity": false
  },
  {
    "id": "study-guide-verifier",
    "title": "Study Guide Verification Tool",
    "problem": "AI summaries may omit important context or introduce errors.",
    "whyItMatters": "Build practical understanding through verifiable artifacts and a clearly scoped real-world problem.",
    "aiOpportunity": "Use AI for initial hypotheses or explanations, then verify claims against source data and a simple baseline.",
    "difficulty": "beginner",
    "domains": [
      "general",
      "education"
    ],
    "prerequisiteSkillIds": [
      "verification"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "UNESCO student AI competency framework",
        "url": "https://www.unesco.org/en/articles/ai-competency-framework-students",
        "type": "organization"
      }
    ],
    "mvpDeliverables": [
      "Working prototype or structured evidence document",
      "Documented source references and assumptions"
    ],
    "evaluationCriteria": [
      "Clear baseline comparison",
      "Reproducible checks against known examples",
      "Discussion of limitations and error cases"
    ],
    "stretchGoals": [
      "Test with a consenting user and improve accessibility"
    ],
    "evidenceChecklist": [
      "GitHub repository or dated notebook",
      "Screenshots/video of actual functioning features",
      "Evaluation results and limitations",
      "Short reflection on what AI did versus student work"
    ],
    "estimatedScope": "weekend",
    "isPaidOpportunity": false
  },
  {
    "id": "open-source-first-pr",
    "title": "Your First Reviewed Open-Source Contribution",
    "problem": "New developers lack a repeatable way to inspect and verify small changes.",
    "whyItMatters": "Build practical understanding through verifiable artifacts and a clearly scoped real-world problem.",
    "aiOpportunity": "Use AI for initial hypotheses or explanations, then verify claims against source data and a simple baseline.",
    "difficulty": "intermediate",
    "domains": [
      "software",
      "education"
    ],
    "prerequisiteSkillIds": [
      "coding-agents"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "GitHub good-first-issue resources",
        "url": "https://github.com/topics/good-first-issue",
        "type": "open-source"
      }
    ],
    "mvpDeliverables": [
      "Working prototype or structured evidence document",
      "Documented source references and assumptions"
    ],
    "evaluationCriteria": [
      "Clear baseline comparison",
      "Reproducible checks against known examples",
      "Discussion of limitations and error cases"
    ],
    "stretchGoals": [
      "Test with a consenting user and improve accessibility"
    ],
    "evidenceChecklist": [
      "GitHub repository or dated notebook",
      "Screenshots/video of actual functioning features",
      "Evaluation results and limitations",
      "Short reflection on what AI did versus student work"
    ],
    "estimatedScope": "multiweek",
    "isPaidOpportunity": false
  },
  {
    "id": "agent-approval-demo",
    "title": "Agent Permissions Visualizer",
    "problem": "People struggle to see which tool permissions an AI assistant actually needs.",
    "whyItMatters": "Build practical understanding through verifiable artifacts and a clearly scoped real-world problem.",
    "aiOpportunity": "Use AI for initial hypotheses or explanations, then verify claims against source data and a simple baseline.",
    "difficulty": "intermediate",
    "domains": [
      "security",
      "education"
    ],
    "prerequisiteSkillIds": [
      "least-privilege"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "AgentDojo paper",
        "url": "https://arxiv.org/abs/2406.13352",
        "type": "paper"
      },
      {
        "title": "PolyShield gateway reference",
        "url": "https://github.com/aryasalem09/PolyShield-App",
        "type": "open-source"
      }
    ],
    "mvpDeliverables": [
      "Working prototype or structured evidence document",
      "Documented source references and assumptions"
    ],
    "evaluationCriteria": [
      "Clear baseline comparison",
      "Reproducible checks against known examples",
      "Discussion of limitations and error cases"
    ],
    "stretchGoals": [
      "Test with a consenting user and improve accessibility"
    ],
    "evidenceChecklist": [
      "GitHub repository or dated notebook",
      "Screenshots/video of actual functioning features",
      "Evaluation results and limitations",
      "Short reflection on what AI did versus student work"
    ],
    "estimatedScope": "multiweek",
    "isPaidOpportunity": false
  },
  {
    "id": "air-quality-explainer",
    "title": "Air Quality Data Explainer",
    "problem": "Public environmental data can be difficult to interpret.",
    "whyItMatters": "Build practical understanding through verifiable artifacts and a clearly scoped real-world problem.",
    "aiOpportunity": "Use AI for initial hypotheses or explanations, then verify claims against source data and a simple baseline.",
    "difficulty": "intermediate",
    "domains": [
      "environment",
      "education"
    ],
    "prerequisiteSkillIds": [
      "research-literacy"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "OpenAQ documentation",
        "url": "https://docs.openaq.org/",
        "type": "dataset"
      }
    ],
    "mvpDeliverables": [
      "Working prototype or structured evidence document",
      "Documented source references and assumptions"
    ],
    "evaluationCriteria": [
      "Clear baseline comparison",
      "Reproducible checks against known examples",
      "Discussion of limitations and error cases"
    ],
    "stretchGoals": [
      "Test with a consenting user and improve accessibility"
    ],
    "evidenceChecklist": [
      "GitHub repository or dated notebook",
      "Screenshots/video of actual functioning features",
      "Evaluation results and limitations",
      "Short reflection on what AI did versus student work"
    ],
    "estimatedScope": "multiweek",
    "isPaidOpportunity": false
  },
  {
    "id": "nasa-data-explorer",
    "title": "Space Data Explorer",
    "problem": "Open science data is valuable but intimidating to newcomers.",
    "whyItMatters": "Build practical understanding through verifiable artifacts and a clearly scoped real-world problem.",
    "aiOpportunity": "Use AI for initial hypotheses or explanations, then verify claims against source data and a simple baseline.",
    "difficulty": "intermediate",
    "domains": [
      "space",
      "education"
    ],
    "prerequisiteSkillIds": [
      "research-literacy"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "NASA citizen science",
        "url": "https://science.nasa.gov/citizen-science/",
        "type": "organization"
      }
    ],
    "mvpDeliverables": [
      "Working prototype or structured evidence document",
      "Documented source references and assumptions"
    ],
    "evaluationCriteria": [
      "Clear baseline comparison",
      "Reproducible checks against known examples",
      "Discussion of limitations and error cases"
    ],
    "stretchGoals": [
      "Test with a consenting user and improve accessibility"
    ],
    "evidenceChecklist": [
      "GitHub repository or dated notebook",
      "Screenshots/video of actual functioning features",
      "Evaluation results and limitations",
      "Short reflection on what AI did versus student work"
    ],
    "estimatedScope": "semester",
    "isPaidOpportunity": false
  },
  {
    "id": "paper-research-explorer",
    "title": "Paper Research Explorer",
    "problem": "Research papers are hard to compare without losing context.",
    "whyItMatters": "A small, transparent project can help learners and community members understand the problem.",
    "aiOpportunity": "AI may help draft explanations, but a human should check each claim. A non-AI solution is also valid.",
    "difficulty": "beginner",
    "domains": [
      "research",
      "education"
    ],
    "prerequisiteSkillIds": [
      "research-literacy"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "OpenAlex API documentation",
        "url": "https://help.openalex.org/api/",
        "type": "tutorial"
      }
    ],
    "mvpDeliverables": [
      "Compare paper metadata and link to original sources; distinguish preprints from peer-reviewed work.",
      "Create a small prototype or structured evidence document with source references."
    ],
    "evaluationCriteria": [
      "Check representative examples against their sources.",
      "Document accessibility, limitations and errors."
    ],
    "stretchGoals": [
      "Ask a consenting person to review the prototype."
    ],
    "evidenceChecklist": [
      "Problem statement and sources",
      "Actual artifact or dated notebook",
      "Human checks and test results",
      "How AI was used, reflection and limitations"
    ],
    "estimatedScope": "weekend",
    "isPaidOpportunity": false
  },
  {
    "id": "accessible-event-planner",
    "title": "Accessible Event Planner",
    "problem": "Event details can be difficult to navigate for people with different access needs.",
    "whyItMatters": "A small, transparent project can help learners and community members understand the problem.",
    "aiOpportunity": "AI may help draft explanations, but a human should check each claim. A non-AI solution is also valid.",
    "difficulty": "beginner",
    "domains": [
      "accessibility",
      "education"
    ],
    "prerequisiteSkillIds": [
      "responsible-ai"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "W3C accessibility fundamentals",
        "url": "https://www.w3.org/WAI/fundamentals/",
        "type": "tutorial"
      }
    ],
    "mvpDeliverables": [
      "Use entirely fictional events; provide keyboard navigation and clear labels.",
      "Create a small prototype or structured evidence document with source references."
    ],
    "evaluationCriteria": [
      "Check representative examples against their sources.",
      "Document accessibility, limitations and errors."
    ],
    "stretchGoals": [
      "Ask a consenting person to review the prototype."
    ],
    "evidenceChecklist": [
      "Problem statement and sources",
      "Actual artifact or dated notebook",
      "Human checks and test results",
      "How AI was used, reflection and limitations"
    ],
    "estimatedScope": "weekend",
    "isPaidOpportunity": false
  },
  {
    "id": "energy-dashboard",
    "title": "Energy Data Dashboard",
    "problem": "Public energy data can be difficult to interpret.",
    "whyItMatters": "A small, transparent project can help learners and community members understand the problem.",
    "aiOpportunity": "AI may help draft explanations, but a human should check each claim. A non-AI solution is also valid.",
    "difficulty": "beginner",
    "domains": [
      "energy",
      "education"
    ],
    "prerequisiteSkillIds": [
      "research-literacy"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "US Energy Information Administration open data",
        "url": "https://www.eia.gov/opendata/",
        "type": "dataset"
      }
    ],
    "mvpDeliverables": [
      "Choose a public dataset after checking its terms; label units, dates and uncertainty.",
      "Create a small prototype or structured evidence document with source references."
    ],
    "evaluationCriteria": [
      "Check representative examples against their sources.",
      "Document accessibility, limitations and errors."
    ],
    "stretchGoals": [
      "Ask a consenting person to review the prototype."
    ],
    "evidenceChecklist": [
      "Problem statement and sources",
      "Actual artifact or dated notebook",
      "Human checks and test results",
      "How AI was used, reflection and limitations"
    ],
    "estimatedScope": "weekend",
    "isPaidOpportunity": false
  },
  {
    "id": "bilingual-study-workflow",
    "title": "Bilingual Study Workflow",
    "problem": "Translations and summaries can introduce subtle errors.",
    "whyItMatters": "A small, transparent project can help learners and community members understand the problem.",
    "aiOpportunity": "AI may help draft explanations, but a human should check each claim. A non-AI solution is also valid.",
    "difficulty": "beginner",
    "domains": [
      "education",
      "education"
    ],
    "prerequisiteSkillIds": [
      "verification"
    ],
    "prerequisiteMissionIds": [],
    "resourceLinks": [
      {
        "title": "UNESCO student AI competency framework",
        "url": "https://www.unesco.org/en/articles/ai-competency-framework-students",
        "type": "organization"
      }
    ],
    "mvpDeliverables": [
      "Use synthetic examples and a human verification checklist; never collect real grades or school IDs.",
      "Create a small prototype or structured evidence document with source references."
    ],
    "evaluationCriteria": [
      "Check representative examples against their sources.",
      "Document accessibility, limitations and errors."
    ],
    "stretchGoals": [
      "Ask a consenting person to review the prototype."
    ],
    "evidenceChecklist": [
      "Problem statement and sources",
      "Actual artifact or dated notebook",
      "Human checks and test results",
      "How AI was used, reflection and limitations"
    ],
    "estimatedScope": "weekend",
    "isPaidOpportunity": false
  }
];
