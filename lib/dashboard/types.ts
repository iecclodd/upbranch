/**
 * Core data models for the Polyshield gateway.
 *
 * Architecture: AI Agent → Polyshield MCP Server → Policy / Approval / Logs /
 * Credential layer → Connected MCP servers. Polyshield acts as an MCP *client*
 * toward downstream servers (calling tools/list to discover raw tools) and as
 * an MCP *server* toward the agent (exposing only enabled catalog tools).
 */

export type McpServerKind = "mock" | "remote";
export type McpServerStatus = "connected" | "connecting" | "pending" | "error";

/**
 * Local stdio servers are launched and supervised by the Polyshield local
 * runner. The runner dials OUT to the Polyshield control plane and only
 * accepts jobs from it — agents never connect to the runner directly, so the
 * policy decision point stays off the agent's machine.
 */
export interface StdioTransport {
  type: "stdio";
  command: string;
  args: string[];
  /**
   * Write-only: values here are masked for display. Raw values go straight
   * to the credential vault and are injected into the child process env by
   * the runner at execution time. There is no read-plaintext path.
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
   * Write-only: masked for display. The raw header lives only in the vault
   * and is attached by the gateway when it forwards approved calls.
   */
  authHeader?: string;
}

export type TransportConfig = StdioTransport | HttpTransport;

export interface McpServer {
  id: string;
  name: string;
  /** Namespace prepended to raw tool names, e.g. "crm" → crm.update_contact */
  prefix: string;
  kind: McpServerKind;
  status: McpServerStatus;
  transport: TransportConfig;
  description: string;
  lastActionAt: number | null;
}

/** A tool exactly as a downstream MCP server reports it via tools/list. */
export interface RawTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * A discovered tool in Polyshield's catalog. The agent only ever sees
 * `exposedName`; Polyshield maps it back to `rawName` on the source server.
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
}

export type AuditStatus =
  | "allowed"
  | "denied"
  | "waiting_for_approval"
  | "approved"
  | "blocked";

export interface AuditEntry {
  id: string;
  timestamp: number;
  agent: string;
  serverId: string;
  exposedTool: string;
  decision: PolicyDecision;
  status: AuditStatus;
  approver?: string;
  decidedVia?: ApprovalMethod;
  reason?: string;
}

export interface DashboardState {
  servers: McpServer[];
  tools: CatalogTool[];
  policies: Policy[];
  approvals: ApprovalRequest[];
  audit: AuditEntry[];
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
