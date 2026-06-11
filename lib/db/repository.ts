import { createClient } from "@/lib/supabase/server";
import { MOCK_RAW_TOOLS, MOCK_SERVERS } from "@/lib/dashboard/mock-mcps";
import { toCatalogTool } from "@/lib/dashboard/connector";
import type {
  Agent,
  ApprovalRequest,
  AuditEntry,
  CatalogTool,
  McpServer,
  Policy,
  Project,
  UsageSnapshot,
} from "@/lib/dashboard/types";

/**
 * Data-access layer. Pages and server actions go through these functions —
 * never supabase-js directly — so a future move to another backend (RDS,
 * etc.) only touches this folder.
 */

type Db = Awaited<ReturnType<typeof createClient>>;

const ms = (t: string | null): number | null => (t ? Date.parse(t) : null);

// ---------- row → domain mappers ----------

type ServerRow = {
  id: string;
  name: string;
  prefix: string;
  kind: string;
  status: string;
  transport: McpServer["transport"];
  description: string;
  last_action_at: string | null;
};

function mapServer(r: ServerRow): McpServer {
  return {
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    kind: r.kind as McpServer["kind"],
    status: r.status as McpServer["status"],
    transport: r.transport,
    description: r.description,
    lastActionAt: ms(r.last_action_at),
  };
}

// ---------- workspace ----------

/**
 * Return the user's default project, creating and seeding it with demo MCP
 * servers on first visit so the dashboard is never empty. Idempotent.
 */
export async function ensureProject(): Promise<Project> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("projects")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, name: "My Project" })
    .select("id, name")
    .single();
  if (error || !project) throw error ?? new Error("Could not create project");

  await seedDemoServers(supabase, project.id);
  return project;
}

/** The user's working project id. Throws if none (pages call ensureProject). */
export async function currentProjectId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("No project");
  return data.id;
}

/** Insert the demo MCP servers + their discovered tools + starter policies. */
async function seedDemoServers(supabase: Db, projectId: string) {
  for (const mock of MOCK_SERVERS) {
    const { data: server } = await supabase
      .from("mcp_servers")
      .insert({
        project_id: projectId,
        name: mock.name,
        prefix: mock.prefix,
        kind: "mock",
        status: "connected",
        transport: mock.transport,
        description: mock.description,
        last_action_at: new Date().toISOString(),
      })
      .select("id, prefix")
      .single();
    if (!server) continue;

    const rawTools = MOCK_RAW_TOOLS[mock.id] ?? [];
    const toolRows = rawTools.map((raw) => {
      const exposed = toCatalogTool(mock, raw);
      return {
        project_id: projectId,
        server_id: server.id,
        raw_name: raw.name,
        raw_description: raw.description,
        input_schema: raw.inputSchema,
        exposed_name: exposed.exposedName,
        enabled: true,
      };
    });
    if (toolRows.length) await supabase.from("catalog_tools").insert(toolRows);

    // Starter policies: gate destructive/outbound verbs by default.
    const policyRows = rawTools
      .filter((raw) =>
        /^(delete|remove|send|publish|refund|archive|merge|update)/i.test(
          raw.name,
        ),
      )
      .map((raw) => ({
        project_id: projectId,
        server_id: server.id,
        exposed_tool: `${mock.prefix}.${raw.name}`,
        decision: /^(delete|remove)/i.test(raw.name)
          ? "deny"
          : "require_approval",
        description: "Auto-gated on discovery — sensitive verb detected.",
      }));
    if (policyRows.length) await supabase.from("policies").insert(policyRows);
  }
}

// ---------- reads ----------

export async function listServers(projectId: string): Promise<McpServer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mcp_servers")
    .select("id, name, prefix, kind, status, transport, description, last_action_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => mapServer(r as ServerRow));
}

export async function listTools(projectId: string): Promise<CatalogTool[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_tools")
    .select("id, server_id, raw_name, raw_description, input_schema, exposed_name, enabled")
    .eq("project_id", projectId)
    .order("exposed_name", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    serverId: r.server_id,
    rawName: r.raw_name,
    rawDescription: r.raw_description,
    inputSchema: r.input_schema,
    exposedName: r.exposed_name,
    enabled: r.enabled,
  }));
}

export async function listPolicies(projectId: string): Promise<Policy[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("policies")
    .select("id, server_id, exposed_tool, decision, condition, description")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    serverId: r.server_id,
    exposedTool: r.exposed_tool,
    decision: r.decision as Policy["decision"],
    condition: r.condition ?? undefined,
    description: r.description,
  }));
}

export async function listApprovals(
  projectId: string,
): Promise<ApprovalRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("approvals")
    .select("*")
    .eq("project_id", projectId)
    .order("requested_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    agent: r.agent,
    exposedTool: r.exposed_tool,
    serverId: r.server_id,
    args: r.args,
    reason: r.reason,
    status: r.status,
    requestedAt: Date.parse(r.requested_at),
    decidedAt: r.decided_at ? Date.parse(r.decided_at) : undefined,
    approver: r.approver ?? undefined,
    decidedVia: r.decided_via ?? undefined,
    auditId: r.audit_id ?? "",
  }));
}

export async function listAudit(projectId: string): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => ({
    id: r.id,
    timestamp: Date.parse(r.created_at),
    agent: r.agent,
    serverId: r.server_id ?? "",
    exposedTool: r.exposed_tool,
    decision: r.decision,
    status: r.status,
    approver: r.approver ?? undefined,
    decidedVia: r.decided_via ?? undefined,
    reason: r.reason ?? undefined,
  }));
}

export async function listAgents(projectId: string): Promise<Agent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agents")
    .select("id, name, status, key_preview, last_seen_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status as Agent["status"],
    keyPreview: r.key_preview,
    lastSeenAt: ms(r.last_seen_at),
    createdAt: Date.parse(r.created_at),
  }));
}

export async function getUsage(projectId: string): Promise<UsageSnapshot> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const counted = (n: number | null) => n ?? 0;
  const [projects, agents, tools, actions] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("catalog_tools")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("enabled", true),
    supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", monthStart.toISOString()),
  ]);

  return {
    projects: counted(projects.count),
    agents: counted(agents.count),
    tools: counted(tools.count),
    actionsThisMonth: counted(actions.count),
  };
}
