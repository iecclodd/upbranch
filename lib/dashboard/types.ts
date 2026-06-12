/**
 * Core data models for the Polyshield gateway.
 *
 * Architecture: AI Agent → Polyshield MCP Server → Policy / Approval / Logs /
 * Credential layer → Connected MCP servers. Polyshield acts as an MCP *client*
 * toward downstream servers (calling tools/list to discover raw tools) and as
 * an MCP *server* toward the agent (exposing only enabled catalog tools).
 */

export type McpServerStatus = "connected" | "connecting" | "pending" | "error";

/**
 * Local stdio servers are launched and supervised by the Polyshield local
 * runner (polyshield-runner). The runner dials OUT to the control plane and
 * only executes jobs the policy engine already allowed — agents never
 * connect to the runner directly, so the policy decision point stays off the
 * agent's machine. A stdio server registers as "pending" and flips to
 * "connected" once a paired runner launches it and reports its tools.
 */
export interface StdioTransport {
  type: "stdio";
  command: string;
  args: string[];
  /**
   * Masked for display. Raw values are AES-256-GCM encrypted in the vault
   * (server_secrets, name "env:KEY") and released only to a paired runner.
   */
  env: Record<string, string>;
  /** Host env var names forwarded to the child process unchanged. */
  envPassthrough: string[];
  cwd?: string;
}

export interface HttpTransport {
  type: "http";
  endpoint: string;
  /**
   * Masked for display. The raw header is AES-256-GCM encrypted in the
   * credential vault (server_secrets) and attached only when the gateway
   * forwards an approved call. There is no read-plaintext path.
   */
  authHeader?: string;
}

export type TransportConfig = StdioTransport | HttpTransport;

/**
 * Prompt-injection shield mode per server. Downstream results are scanned;
 * "flag" prepends a warning to suspicious output, "block" withholds it.
 */
export type ShieldMode = "off" | "flag" | "block";

export interface McpServer {
  id: string;
  name: string;
  /** Namespace prepended to raw tool names, e.g. "crm" → crm.update_contact */
  prefix: string;
  status: McpServerStatus;
  transport: TransportConfig;
  description: string;
  shieldMode: ShieldMode;
  lastActionAt: number | null;
}

/**
 * A paired local runner: the daemon on the user's machine that launches stdio
 * MCP servers and executes their tool calls as jobs. Auth mirrors agents —
 * only a SHA-256 hash of the pairing token is stored.
 */
export interface Runner {
  id: string;
  name: string;
  hostname: string | null;
  version: string | null;
  /** Derived: online iff last_seen_at is fresher than ~90s. */
  online: boolean;
  lastSeenAt: number | null;
  createdAt: number;
}

/** A tool exactly as a downstream MCP server reports it via tools/list. */
export interface RawTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * A discovered tool in Polyshield's catalog. The agent only ever sees
 * `exposedName` (dots become underscores on the MCP wire); Polyshield maps it
 * back to `rawName` on the source server.
 */
export interface CatalogTool {
  id: string;
  serverId: string;
  rawName: string;
  rawDescription: string;
  inputSchema: Record<string, unknown>;
  exposedName: string;
  enabled: boolean;
}

export type PolicyDecision = "allow" | "deny" | "require_approval";

export interface Policy {
  id: string;
  exposedTool: string;
  serverId: string;
  decision: PolicyDecision;
  condition?: string;
  description: string;
}

export type ApprovalStatus = "pending" | "approved" | "denied";

/**
 * How an approval decision was authenticated. Only "dashboard" exists today;
 * "slack" (out-of-band) and "webauthn" (hardware step-up) are reserved so
 * audit history never needs a migration when they land. Invariant enforced
 * by the gateway: the requesting agent identity can never be the approver —
 * approvals require a human session, never an API key.
 */
export type ApprovalMethod = "dashboard" | "slack" | "webauthn";

export interface ApprovalRequest {
  id: string;
  agent: string;
  exposedTool: string;
  serverId: string;
  args: Record<string, unknown>;
  reason: string;
  status: ApprovalStatus;
  requestedAt: number;
  decidedAt?: number;
  approver?: string;
  decidedVia?: ApprovalMethod;
  /** Audit entry created when the call was held; updated on decision. */
  auditId: string;
  /** Downstream execution result, recorded when an approved call ran. */
  result?: unknown;
}

export type AuditStatus =
  | "allowed"
  | "denied"
  | "waiting_for_approval"
  | "approved"
  | "blocked"
  | "error"
  | "info";

/**
 * tool_call: an agent's call through the gateway. admin: a control-plane
 * change made in the dashboard (server added, tool toggled, policy edited…),
 * recorded with status "info" and the acting user in `agent`.
 */
export type AuditEventType = "tool_call" | "admin";

export interface AuditEntry {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  agent: string;
  serverId: string;
  exposedTool: string;
  decision: PolicyDecision;
  status: AuditStatus;
  approver?: string;
  decidedVia?: ApprovalMethod;
  reason?: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export type Plan = "free" | "builder" | "team" | "enterprise";

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  plan: Plan;
}

export interface Project {
  id: string;
  name: string;
}

export type AgentStatus = "active" | "inactive";

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  keyPreview: string | null;
  lastSeenAt: number | null;
  createdAt: number;
}

/** Free-tier caps surfaced as usage meters. Enforcement lands with billing. */
export interface PlanLimits {
  projects: number;
  agents: number;
  tools: number;
  actionsPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { projects: 1, agents: 1, tools: 3, actionsPerMonth: 100 },
  builder: { projects: 3, agents: 5, tools: 10, actionsPerMonth: 5000 },
  team: { projects: 10, agents: 50, tools: 100, actionsPerMonth: 50000 },
  enterprise: {
    projects: Infinity,
    agents: Infinity,
    tools: Infinity,
    actionsPerMonth: Infinity,
  },
};

export interface UsageSnapshot {
  projects: number;
  agents: number;
  tools: number;
  actionsThisMonth: number;
}
