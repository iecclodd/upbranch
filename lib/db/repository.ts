import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Agent,
  ApprovalRequest,
  AuditEntry,
  CatalogTool,
  McpServer,
  Policy,
  Project,
  Runner,
  UsageSnapshot,
} from "@/lib/dashboard/types";

/**
 * Data-access layer. Pages and server actions go through these functions —
 * never supabase-js directly — so a future move to another backend (RDS,
 * etc.) only touches this folder.
 */

const ms = (t: string | null): number | null => (t ? Date.parse(t) : null);

// ---------- row → domain mappers ----------

type ServerRow = {
  id: string;
  name: string;
  prefix: string;
  status: string;
  transport: McpServer["transport"];
  description: string;
  shield_mode: string | null;
  last_action_at: string | null;
};

function mapServer(r: ServerRow): McpServer {
  return {
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    status: r.status as McpServer["status"],
    transport: r.transport,
    description: r.description,
    shieldMode: (r.shield_mode ?? "flag") as McpServer["shieldMode"],
    lastActionAt: ms(r.last_action_at),
  };
}

/** A runner is "online" while its heartbeat is fresher than this. */
const RUNNER_ONLINE_WINDOW_MS = 90_000;

// ---------- workspace ----------

/**
 * Return the user's default project, creating it on first visit. Idempotent.
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
  return project;
}

/**
 * The user's working project id. Wrapped in React cache() so the layout and
 * page (which Next.js renders in parallel) share one ensureProject call per
 * request — a fresh account no longer races itself into "No project".
 */
export const currentProjectId = cache(async (): Promise<string> => {
  const project = await ensureProject();
  return project.id;
});

// ---------- reads ----------

export async function listServers(projectId: string): Promise<McpServer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mcp_servers")
    .select("id, name, prefix, status, transport, description, shield_mode, last_action_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => mapServer(r as ServerRow));
}

export async function listRunners(projectId: string): Promise<Runner[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("runners")
    .select("id, name, hostname, version, last_seen_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  const now = Date.now();
  return (data ?? []).map((r) => {
    const lastSeenAt = ms(r.last_seen_at);
    return {
      id: r.id,
      name: r.name,
      hostname: r.hostname,
      version: r.version,
      online: lastSeenAt !== null && now - lastSeenAt < RUNNER_ONLINE_WINDOW_MS,
      lastSeenAt,
      createdAt: Date.parse(r.created_at),
    };
  });
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
    result: r.result ?? undefined,
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
    eventType: (r.event_type ?? "tool_call") as AuditEntry["eventType"],
    agent: r.agent,
    serverId: r.server_id ?? "",
    exposedTool: r.exposed_tool,
    decision: r.decision,
    status: r.status,
    approver: r.approver ?? undefined,
    decidedVia: r.decided_via ?? undefined,
    reason: r.reason ?? undefined,
    args: r.args ?? {},
    result: r.result ?? undefined,
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
