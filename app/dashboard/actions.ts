"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isRiskyRawTool,
  simulatedToolsFor,
  toCatalogTool,
} from "@/lib/dashboard/connector";
import { maskSecret } from "@/lib/dashboard/format";
import type { McpServer, TransportConfig } from "@/lib/dashboard/types";

/**
 * Resolve the user's working project. Inlined here (rather than imported from
 * the repository) so this "use server" module — reachable from Client
 * Components — never pulls server-only query code into the client bundle.
 */
async function currentProjectId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
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

function maskTransport(transport: TransportConfig): TransportConfig {
  if (transport.type === "http") {
    return {
      ...transport,
      authHeader: transport.authHeader
        ? maskSecret(transport.authHeader)
        : undefined,
    };
  }
  return {
    ...transport,
    env: Object.fromEntries(
      Object.entries(transport.env).map(([k, v]) => [k, maskSecret(v)]),
    ),
  };
}

export async function addServerAction(input: {
  name: string;
  prefix: string;
  transport: TransportConfig;
}) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const prefix = input.prefix.trim().toLowerCase();

  const { data: server } = await supabase
    .from("mcp_servers")
    .insert({
      project_id: projectId,
      name: input.name.trim(),
      prefix,
      kind: "remote",
      status: "connected",
      transport: maskTransport(input.transport),
      description:
        input.transport.type === "stdio"
          ? "Local stdio server, launched via the Polyshield local runner."
          : "Remote HTTP server, connected by endpoint.",
      last_action_at: new Date().toISOString(),
    })
    .select("id, prefix")
    .single();
  if (!server) throw new Error("Could not add server");

  // Simulated tools/list discovery — a real connection swaps this for an MCP
  // client handshake. Risky raw verbs are auto-gated with require_approval.
  const stub = { prefix } as McpServer;
  const rawTools = simulatedToolsFor(prefix);
  const toolRows = rawTools.map((raw) => ({
    project_id: projectId,
    server_id: server.id,
    raw_name: raw.name,
    raw_description: raw.description,
    input_schema: raw.inputSchema,
    exposed_name: toCatalogTool(stub, raw).exposedName,
    enabled: true,
  }));
  if (toolRows.length) await supabase.from("catalog_tools").insert(toolRows);

  const policyRows = rawTools
    .filter((raw) => isRiskyRawTool(raw.name))
    .map((raw) => ({
      project_id: projectId,
      server_id: server.id,
      exposed_tool: `${prefix}.${raw.name}`,
      decision: "require_approval",
      description: "Auto-gated on discovery — destructive or outbound verb.",
    }));
  if (policyRows.length) await supabase.from("policies").insert(policyRows);

  revalidatePath("/dashboard", "layout");
}

export async function deleteServerAction(serverId: string) {
  const supabase = await createClient();
  await supabase.from("mcp_servers").delete().eq("id", serverId);
  revalidatePath("/dashboard", "layout");
}

export async function toggleToolAction(toolId: string, enabled: boolean) {
  const supabase = await createClient();
  await supabase.from("catalog_tools").update({ enabled }).eq("id", toolId);
  revalidatePath("/dashboard", "layout");
}

export async function setPolicyDecisionAction(
  policyId: string,
  decision: "allow" | "deny" | "require_approval",
) {
  const supabase = await createClient();
  await supabase.from("policies").update({ decision }).eq("id", policyId);
  revalidatePath("/dashboard", "layout");
}

async function decideApproval(approvalId: string, decision: "approved" | "denied") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const approver = user?.email ?? "unknown";

  const { data: approval } = await supabase
    .from("approvals")
    .select("audit_id, status")
    .eq("id", approvalId)
    .single();
  if (!approval || approval.status !== "pending") return;

  await supabase
    .from("approvals")
    .update({
      status: decision,
      approver,
      decided_via: "dashboard",
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId);

  if (approval.audit_id) {
    await supabase
      .from("audit_log")
      .update({
        status: decision,
        approver,
        decided_via: "dashboard",
        reason:
          decision === "approved"
            ? "Approved — forwarded to source MCP."
            : "Denied by approver — not forwarded.",
      })
      .eq("id", approval.audit_id);
  }
  revalidatePath("/dashboard", "layout");
}

export async function approveAction(approvalId: string) {
  await decideApproval(approvalId, "approved");
}

export async function denyAction(approvalId: string) {
  await decideApproval(approvalId, "denied");
}

/** Create an agent and return the raw key once — only its hash is stored. */
export async function createAgentAction(name: string): Promise<{ key: string }> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const key = `psk_live_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(key).digest("hex");

  await supabase.from("agents").insert({
    project_id: projectId,
    name: name.trim() || "New agent",
    status: "inactive",
    key_hash: keyHash,
    key_preview: key.slice(-4),
  });
  revalidatePath("/dashboard/agents");
  return { key };
}

export async function deleteAgentAction(agentId: string) {
  const supabase = await createClient();
  await supabase.from("agents").delete().eq("id", agentId);
  revalidatePath("/dashboard/agents");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
