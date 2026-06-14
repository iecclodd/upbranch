/**
 * Tool naming across the gateway boundary.
 *
 * Internally a tool is `prefix.raw_name` (shown everywhere in the dashboard).
 * On the MCP wire the dot becomes an underscore because most agent clients
 * (and the Anthropic API) only accept [a-zA-Z0-9_-] in tool names. Prefixes
 * are validated to ^[a-z][a-z0-9_]*$ at registration, so the mapping is
 * resolved in SQL by comparing replace(exposed_name, '.', '_').
 */

export function exposedName(prefix: string, rawName: string): string {
  return `${prefix}.${rawName}`;
}

export function wireName(exposed: string): string {
  return exposed.replaceAll(".", "_");
}

const RISKY_VERBS = new Set([
  "delete", "remove", "drop", "destroy", "purge", "wipe", "erase",
  "send", "publish", "post", "deploy", "push", "merge", "release",
  "refund", "charge", "transfer", "pay", "payout",
  "update", "create", "write", "edit", "modify", "patch", "set", "rename",
  "archive", "revoke", "grant", "disable", "enable", "reset", "cancel",
  "approve", "execute", "run", "invoke",
]);

/**
 * Raw tool names with destructive or outbound verbs get auto-gated with a
 * require_approval policy on discovery, so risky tools are never exposed
 * wide-open by default. The verb is matched as a whole token ANYWHERE in the
 * name (snake_case, kebab-case, or camelCase), so `user_delete`, `git-push`,
 * and `hardDelete` are all caught — not just leading-verb names.
 */
export function isRiskyRawTool(rawName: string): boolean {
  return tokenize(rawName).some((t) => RISKY_VERBS.has(t));
}

function tokenize(rawName: string): string[] {
  return rawName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase → token boundary
    .split(/[^a-zA-Z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}

// Irreversible/destructive verbs — the highest blast radius.
const DESTRUCTIVE_VERBS = new Set([
  "delete", "remove", "drop", "destroy", "purge", "wipe", "erase",
  "truncate", "reset", "revoke", "overwrite", "rmdir", "unlink",
]);

// Conservative set of "ingests external/untrusted content" verbs. Kept narrow
// (no generic read/get) so a local file read doesn't taint the whole session;
// shield-flagged results are the stronger taint signal.
const INGESTION_VERBS = new Set([
  "fetch", "browse", "web", "http", "https", "url", "scrape", "crawl",
  "search", "download", "navigate", "visit",
]);

/**
 * A tool that pulls in content from outside the trust boundary (a web page,
 * remote doc, search result). Output from these is treated as untrusted and
 * taints the agent so a later risky action gets escalated. See [[shield]].
 */
export function isIngestionTool(rawName: string): boolean {
  return tokenize(rawName).some((t) => INGESTION_VERBS.has(t));
}

export type RiskLevel = "low" | "moderate" | "high" | "destructive";

/**
 * Coarse risk label for a call, surfaced on approval cards and audit rows.
 * Destructive verbs are top severity; other risky verbs are high; untrusted
 * context (taint) bumps an otherwise-low call to moderate.
 */
export function riskLabel(rawName: string, tainted: boolean): RiskLevel {
  const tokens = tokenize(rawName);
  if (tokens.some((t) => DESTRUCTIVE_VERBS.has(t))) return "destructive";
  if (tokens.some((t) => RISKY_VERBS.has(t))) return "high";
  if (tainted) return "moderate";
  return "low";
}
