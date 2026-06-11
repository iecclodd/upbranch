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
  const tokens = rawName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase → token boundary
    .split(/[^a-zA-Z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
  return tokens.some((t) => RISKY_VERBS.has(t));
}
