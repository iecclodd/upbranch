import type { PolicyDecision, SandboxProfile } from "@/lib/dashboard/types";

/**
 * Curated catalog of common local (stdio) MCP servers, each with a risk score,
 * supply-chain advice (pin a version, don't run @latest blind), a starter
 * sandbox profile, and pre-built Polyshield policies for its dangerous tools.
 *
 * This answers the question the whole ecosystem is asking — "which MCP servers
 * are safe to point my agent at, and how do I gate them?" — which nobody else
 * is productizing. Adding one is a single click: it registers the stdio server
 * (pending until your runner launches it) and lays down the recommended
 * policies + sandbox so the risky tools are gated before they ever run.
 */

export type RegistryCategory =
  | "filesystem"
  | "vcs"
  | "browser"
  | "database"
  | "search"
  | "comms"
  | "memory";

export interface RegistryPolicy {
  /** Raw tool name on the server (joined to the prefix at install). */
  tool: string;
  decision: PolicyDecision;
  description: string;
}

export interface RegistryEntry {
  id: string;
  name: string;
  category: RegistryCategory;
  description: string;
  /** npm package the stdio server ships as (for the pinning note). */
  pkg: string;
  command: string;
  args: string[];
  /** Env var names the server needs; the user fills values at install. */
  envKeys: string[];
  defaultPrefix: string;
  risk: "low" | "moderate" | "high";
  riskReason: string;
  pinningAdvice: string;
  homepage: string;
  recommendedSandbox: Partial<SandboxProfile>;
  recommendedPolicies: RegistryPolicy[];
}

const gateWrites = (tools: string[], description: string): RegistryPolicy[] =>
  tools.map((tool) => ({ tool, decision: "require_approval" as PolicyDecision, description }));

export const REGISTRY: RegistryEntry[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    category: "filesystem",
    description: "Read, write, move, and delete files. The highest-blast-radius local tool.",
    pkg: "@modelcontextprotocol/server-filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "~/code"],
    envKeys: [],
    defaultPrefix: "fs",
    risk: "high",
    riskReason: "Full read/write/delete on whatever directory it's pointed at.",
    pinningAdvice: "Pin an exact version (e.g. @0.6.2) instead of running latest, and scope it to one project directory.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    recommendedSandbox: { fsScope: ["~/code"], egress: { mode: "none", allow: [] }, snapshotBeforeWrite: true, dryRunOnApproval: true },
    recommendedPolicies: gateWrites(
      ["write_file", "edit_file", "move_file", "create_directory"],
      "File mutation — held for review.",
    ).concat([
      { tool: "delete_file", decision: "require_approval", description: "Deletion is irreversible — held for review." },
    ]),
  },
  {
    id: "git",
    name: "Git",
    category: "vcs",
    description: "Inspect a repo, stage, commit, branch, and push.",
    pkg: "@modelcontextprotocol/server-git",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-git", "--repository", "~/code"],
    envKeys: [],
    defaultPrefix: "git",
    risk: "high",
    riskReason: "Can rewrite history and push to remotes without a human reviewing the diff.",
    pinningAdvice: "Pin an exact version; review the diff in the approval card before allowing a push.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/git",
    recommendedSandbox: { fsScope: ["~/code"], snapshotBeforeWrite: true, dryRunOnApproval: true, egress: { mode: "allowlist", allow: ["github.com"] } },
    recommendedPolicies: gateWrites(["git_commit", "git_push", "git_reset"], "Repo-altering git action — held for review."),
  },
  {
    id: "github",
    name: "GitHub",
    category: "vcs",
    description: "Issues, pull requests, and repo operations via the GitHub API.",
    pkg: "@modelcontextprotocol/server-github",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    envKeys: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    defaultPrefix: "github",
    risk: "high",
    riskReason: "Holds a GitHub token; can merge PRs, push, and change repo settings.",
    pinningAdvice: "Pin a version and scope the GitHub token to the minimum repos/permissions needed.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
    recommendedSandbox: { stripEnv: true, egress: { mode: "allowlist", allow: ["api.github.com"] } },
    recommendedPolicies: gateWrites(
      ["merge_pull_request", "create_or_update_file", "push_files", "delete_file", "create_repository"],
      "Write to GitHub — held for review.",
    ),
  },
  {
    id: "playwright",
    name: "Playwright (browser)",
    category: "browser",
    description: "Drive a real browser — navigate, read pages, fill forms, click.",
    pkg: "@playwright/mcp",
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"],
    envKeys: [],
    defaultPrefix: "browser",
    risk: "moderate",
    riskReason: "Reads untrusted web content (taint source) and can submit forms on admin pages.",
    pinningAdvice: "Pin a version; pair with the shield so injected page content can't drive risky follow-ups.",
    homepage: "https://github.com/microsoft/playwright-mcp",
    recommendedSandbox: { egress: { mode: "inherit", allow: [] } },
    recommendedPolicies: gateWrites(["browser_file_upload", "browser_handle_dialog"], "Browser action with side effects — held for review."),
  },
  {
    id: "postgres",
    name: "Postgres",
    category: "database",
    description: "Query a local/dev Postgres database.",
    pkg: "@modelcontextprotocol/server-postgres",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"],
    envKeys: [],
    defaultPrefix: "db",
    risk: "high",
    riskReason: "A broad or destructive query against a dev DB with real data is hard to undo.",
    pinningAdvice: "Pin a version; point it at a non-production database and gate anything that mutates.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    recommendedSandbox: { egress: { mode: "allowlist", allow: ["localhost"] } },
    recommendedPolicies: [
      { tool: "query", decision: "flag", description: "Query results are data — marked untrusted for the agent." },
    ],
  },
  {
    id: "fetch",
    name: "Fetch (web)",
    category: "search",
    description: "Fetch a URL and return its content as markdown.",
    pkg: "@modelcontextprotocol/server-fetch",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    envKeys: [],
    defaultPrefix: "fetch",
    risk: "moderate",
    riskReason: "Pulls untrusted web content — a classic prompt-injection vector.",
    pinningAdvice: "Pin a version; keep the shield on so fetched content can't override the agent.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
    recommendedSandbox: { egress: { mode: "inherit", allow: [] } },
    recommendedPolicies: [],
  },
  {
    id: "slack",
    name: "Slack",
    category: "comms",
    description: "Read channels and post messages to Slack.",
    pkg: "@modelcontextprotocol/server-slack",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    envKeys: ["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"],
    defaultPrefix: "slack",
    risk: "moderate",
    riskReason: "Outbound — can post messages to your workspace on the agent's behalf.",
    pinningAdvice: "Pin a version; scope the Slack token to the channels you intend.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
    recommendedSandbox: { stripEnv: true, egress: { mode: "allowlist", allow: ["slack.com"] } },
    recommendedPolicies: gateWrites(["slack_post_message", "slack_reply_to_thread"], "Posting to Slack — held for review."),
  },
  {
    id: "memory",
    name: "Memory (knowledge graph)",
    category: "memory",
    description: "A local persistent memory / knowledge graph for the agent.",
    pkg: "@modelcontextprotocol/server-memory",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    envKeys: [],
    defaultPrefix: "memory",
    risk: "low",
    riskReason: "Local-only state; low blast radius.",
    pinningAdvice: "Pin a version. Low risk, but pinning still protects against supply-chain swaps.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
    recommendedSandbox: {},
    recommendedPolicies: [],
  },
];

export function registryEntry(id: string): RegistryEntry | undefined {
  return REGISTRY.find((e) => e.id === id);
}
