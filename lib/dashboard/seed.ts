import { toCatalogTool } from "./connector";
import { MOCK_RAW_TOOLS, MOCK_SERVERS } from "./mock-mcps";
import type {
  ApprovalRequest,
  AuditEntry,
  CatalogTool,
  DashboardState,
  Policy,
  PolicyDecision,
} from "./types";

const MIN = 60_000;

/**
 * Build the catalog the same way runtime discovery does: every mock server's
 * tools/list response mapped through toCatalogTool. Seeding is synchronous,
 * so it reads the mock map directly instead of awaiting the connector.
 */
function buildCatalog(): CatalogTool[] {
  return MOCK_SERVERS.flatMap((server) =>
    (MOCK_RAW_TOOLS[server.id] ?? []).map((raw) => toCatalogTool(server, raw)),
  );
}

interface PolicySeed {
  exposedTool: string;
  serverId: string;
  decision: PolicyDecision;
  condition?: string;
  description: string;
}

const POLICY_SEEDS: PolicySeed[] = [
  {
    exposedTool: "analytics.get_reports",
    serverId: "mcp_analytics",
    decision: "allow",
    description: "Read-only analytics are always safe to run.",
  },
  {
    exposedTool: "analytics.generate_summary",
    serverId: "mcp_analytics",
    decision: "allow",
    description: "Summaries never touch source data.",
  },
  {
    exposedTool: "crm.update_contact",
    serverId: "mcp_crm",
    decision: "require_approval",
    description: "Contact records are customer-facing — a human signs off.",
  },
  {
    exposedTool: "email.create_draft",
    serverId: "mcp_email",
    decision: "allow",
    description: "Drafts stay internal until someone sends them.",
  },
  {
    exposedTool: "email.send_external",
    serverId: "mcp_email",
    decision: "require_approval",
    description: "Outbound email leaves the org — review before send.",
  },
  {
    exposedTool: "project.archive_project",
    serverId: "mcp_project",
    decision: "require_approval",
    description: "Reversible but disruptive — confirm intent first.",
  },
  {
    exposedTool: "project.delete_workspace",
    serverId: "mcp_project",
    decision: "deny",
    description: "Destructive and irreversible. Never allowed from an agent.",
  },
  {
    exposedTool: "billing.refund_customer",
    serverId: "mcp_billing",
    decision: "require_approval",
    condition: "amount > 100",
    description: "Refunds over $100 wait for a human.",
  },
];

/**
 * Resolve the effective decision for an exposed tool. Tools without an
 * explicit policy default to allow — the catalog flags them as such.
 */
export function resolvePolicy(
  policies: Policy[],
  exposedTool: string,
): { decision: PolicyDecision; policy: Policy | null } {
  const policy = policies.find((p) => p.exposedTool === exposedTool) ?? null;
  return { decision: policy?.decision ?? "allow", policy };
}

export function buildInitialState(): DashboardState {
  const now = Date.now();
  const tools = buildCatalog();
  const policies: Policy[] = POLICY_SEEDS.map((seed, i) => ({
    id: `pol_${i + 1}`,
    ...seed,
  }));

  const audit: AuditEntry[] = [
    {
      id: "aud_seed_5",
      timestamp: now - 2 * MIN,
      agent: "demo-agent",
      serverId: "mcp_crm",
      exposedTool: "crm.update_contact",
      decision: "require_approval",
      status: "waiting_for_approval",
      reason: "Update customer status based on recent activity.",
    },
    {
      id: "aud_seed_4",
      timestamp: now - 4 * MIN,
      agent: "demo-agent",
      serverId: "mcp_project",
      exposedTool: "project.delete_workspace",
      decision: "deny",
      status: "blocked",
      reason: "Denied by policy — destructive and irreversible.",
    },
    {
      id: "aud_seed_3",
      timestamp: now - 6 * MIN,
      agent: "demo-agent",
      serverId: "mcp_email",
      exposedTool: "email.create_draft",
      decision: "allow",
      status: "allowed",
      reason: "Matched policy: drafts stay internal.",
    },
    {
      id: "aud_seed_2",
      timestamp: now - 7 * MIN,
      agent: "demo-agent",
      serverId: "mcp_analytics",
      exposedTool: "analytics.generate_summary",
      decision: "allow",
      status: "allowed",
      reason: "Matched policy: read-only.",
    },
    {
      id: "aud_seed_1",
      timestamp: now - 9 * MIN,
      agent: "demo-agent",
      serverId: "mcp_analytics",
      exposedTool: "analytics.get_reports",
      decision: "allow",
      status: "allowed",
      reason: "Matched policy: read-only.",
    },
  ];

  const approvals: ApprovalRequest[] = [
    {
      id: "apr_seed_1",
      agent: "demo-agent",
      exposedTool: "crm.update_contact",
      serverId: "mcp_crm",
      args: { contact_id: "12345", status: "active" },
      reason: "Update customer status based on recent activity.",
      status: "pending",
      requestedAt: now - 2 * MIN,
      auditId: "aud_seed_5",
    },
  ];

  const lastBy: Record<string, number> = {};
  for (const entry of audit) {
    lastBy[entry.serverId] = Math.max(lastBy[entry.serverId] ?? 0, entry.timestamp);
  }
  const servers = MOCK_SERVERS.map((server) => ({
    ...server,
    lastActionAt: lastBy[server.id] ?? null,
  }));

  return { servers, tools, policies, approvals, audit };
}
