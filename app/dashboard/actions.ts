"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { maskSecret } from "@/lib/dashboard/format";
import { exposedName, isRiskyRawTool } from "@/lib/gateway/tools";
import { isParseableCondition } from "@/lib/gateway/policy";
import {
  discoverHttpTools,
  McpHttpClient,
  truncateToolResult,
  type McpToolResult,
} from "@/lib/mcp/client";
import { decryptSecret, encryptSecret } from "@/lib/vault";
import type {
  PolicyDecision,
  RawTool,
  TransportConfig,
} from "@/lib/dashboard/types";

export interface ActionResult {
  error?: string;
}

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

/**
 * Display copy of a transport: secret values replaced with masks. The raw
 * values go to the vault (http) or stay with the future local runner (stdio);
 * the database only ever sees this masked shape.
 */
function maskTransport(transport: TransportConfig): TransportConfig {
  if (transport.type === "http") {
    return {
      ...transport,
      authHeader: transport.authHeader ? maskSecret(transport.authHeader) : undefined,
    };
  }
  return {
    ...transport,
    env: Object.fromEntries(
      Object.entries(transport.env).map(([k, v]) => [k, maskSecret(v)]),
    ),
  };
}

// ---------- servers ----------

export async function addServerAction(input: {
  name: string;
  prefix: string;
  transport: TransportConfig;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const prefix = input.prefix.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(prefix)) {
    return { error: "Namespace must start with a letter and use only a-z, 0-9, _." };
  }
  const { data: duplicate } = await supabase
    .from("mcp_servers")
    .select("id")
    .eq("project_id", projectId)
    .eq("prefix", prefix)
    .maybeSingle();
  if (duplicate) return { error: `The "${prefix}" namespace is already in use.` };

  if (input.transport.type === "http") {
    const endpoint = input.transport.endpoint.trim();
    const rawAuth = input.transport.authHeader?.trim() || undefined;

    // Encrypt the credential BEFORE any DB write, so a missing/misconfigured
    // vault key fails closed instead of leaving an orphaned server whose only
    // credential is the irreversible display mask.
    let ciphertext: string | null = null;
    if (rawAuth) {
      try {
        ciphertext = encryptSecret(rawAuth);
      } catch {
        return {
          error: "Credential vault is not configured (POLYSHIELD_VAULT_KEY). Credential not stored.",
        };
      }
    }

    // Real MCP handshake — the server must answer tools/list to be added.
    let tools: RawTool[];
    try {
      tools = await discoverHttpTools(endpoint, rawAuth);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not connect to the MCP server.",
      };
    }

    const { data: server, error } = await supabase
      .from("mcp_servers")
      .insert({
        project_id: projectId,
        name: input.name.trim(),
        prefix,
        kind: "remote",
        status: "connected",
        transport: maskTransport({ type: "http", endpoint, authHeader: rawAuth }),
        description: "Remote HTTP MCP server.",
        last_action_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !server) return { error: "Could not save the server." };

    if (ciphertext) {
      const { error: secretError } = await supabase.from("server_secrets").insert({
        project_id: projectId,
        server_id: server.id,
        name: "authHeader",
        ciphertext,
      });
      if (secretError) {
        await supabase.from("mcp_servers").delete().eq("id", server.id);
        return { error: "Could not store the credential in the vault." };
      }
    }

    if (tools.length > 0) {
      await supabase.from("catalog_tools").insert(
        tools.map((raw) => ({
          project_id: projectId,
          server_id: server.id,
          raw_name: raw.name,
          raw_description: raw.description,
          input_schema: raw.inputSchema,
          exposed_name: exposedName(prefix, raw.name),
          enabled: true,
        })),
      );
      const risky = tools.filter((raw) => isRiskyRawTool(raw.name));
      if (risky.length > 0) {
        await supabase.from("policies").insert(
          risky.map((raw) => ({
            project_id: projectId,
            server_id: server.id,
            exposed_tool: exposedName(prefix, raw.name),
            decision: "require_approval",
            description: "Auto-gated on discovery — destructive or outbound verb.",
          })),
        );
      }
    }
  } else {
    // stdio servers wait for the local runner; no tools until one pairs.
    await supabase.from("mcp_servers").insert({
      project_id: projectId,
      name: input.name.trim(),
      prefix,
      kind: "remote",
      status: "pending",
      transport: maskTransport(input.transport),
      description: "Local stdio server — waiting for the Polyshield local runner (coming soon).",
    });
  }

  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteServerAction(serverId: string) {
  const supabase = await createClient();
  await supabase.from("mcp_servers").delete().eq("id", serverId);
  revalidatePath("/dashboard", "layout");
}

// ---------- tools + policies ----------

export async function toggleToolAction(toolId: string, enabled: boolean) {
  const supabase = await createClient();
  await supabase.from("catalog_tools").update({ enabled }).eq("id", toolId);
  revalidatePath("/dashboard", "layout");
}

export async function setPolicyDecisionAction(
  policyId: string,
  decision: PolicyDecision,
) {
  const supabase = await createClient();
  await supabase.from("policies").update({ decision }).eq("id", policyId);
  revalidatePath("/dashboard", "layout");
}

export async function createPolicyAction(input: {
  exposedTool: string;
  decision: PolicyDecision;
  condition?: string;
  description?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);

  const { data: tool } = await supabase
    .from("catalog_tools")
    .select("server_id")
    .eq("project_id", projectId)
    .eq("exposed_name", input.exposedTool)
    .maybeSingle();
  if (!tool) return { error: "No tool in the catalog matches that name." };

  const condition = input.condition?.trim() || undefined;
  if (condition && !isParseableCondition(condition)) {
    return {
      error: 'Condition not understood. Use e.g. `amount > 100` or `branch == "main"`, joined with `and`.',
    };
  }

  await supabase.from("policies").insert({
    project_id: projectId,
    server_id: tool.server_id,
    exposed_tool: input.exposedTool,
    decision: input.decision,
    condition: condition ?? null,
    description: input.description?.trim() || "Added from the policy editor.",
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deletePolicyAction(policyId: string) {
  const supabase = await createClient();
  await supabase.from("policies").delete().eq("id", policyId);
  revalidatePath("/dashboard", "layout");
}

// ---------- approvals ----------

/**
 * Execute an approved call against its source server using vaulted
 * credentials. Returns an MCP-shaped tool result either way so the agent
 * polling the ticket gets something it can read.
 */
async function executeApprovedCall(
  supabase: Awaited<ReturnType<typeof createClient>>,
  approval: {
    server_id: string | null;
    exposed_tool: string;
    args: Record<string, unknown>;
  },
): Promise<{ result: McpToolResult; ok: boolean }> {
  const failure = (text: string): { result: McpToolResult; ok: boolean } => ({
    result: { content: [{ type: "text", text }], isError: true },
    ok: false,
  });

  if (!approval.server_id) return failure("The source server no longer exists.");

  const { data: server } = await supabase
    .from("mcp_servers")
    .select("id, transport")
    .eq("id", approval.server_id)
    .maybeSingle();
  if (!server) return failure("The source server no longer exists.");

  const transport = server.transport as TransportConfig;
  if (transport.type !== "http") {
    return failure(
      "This tool lives on a local stdio server. The Polyshield local runner is not yet available, so the approved call could not be executed.",
    );
  }

  const { data: tool } = await supabase
    .from("catalog_tools")
    .select("raw_name")
    .eq("server_id", server.id)
    .eq("exposed_name", approval.exposed_tool)
    .maybeSingle();
  if (!tool) return failure("The tool is no longer in the catalog.");

  const { data: secret } = await supabase
    .from("server_secrets")
    .select("ciphertext")
    .eq("server_id", server.id)
    .eq("name", "authHeader")
    .maybeSingle();

  try {
    const authHeader = secret ? decryptSecret(secret.ciphertext) : undefined;
    const client = new McpHttpClient(transport.endpoint, authHeader);
    await client.connect();
    const result = truncateToolResult(await client.callTool(tool.raw_name, approval.args));
    return { result, ok: !result.isError };
  } catch (err) {
    return failure(
      `Approved, but execution failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
}

async function decideApproval(approvalId: string, decision: "approved" | "denied") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const approver = user?.email ?? "unknown";

  // Atomic claim — a second click or a races approve/deny finds no row.
  const { data: approval } = await supabase
    .from("approvals")
    .update({
      status: decision,
      approver,
      decided_via: "dashboard",
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("status", "pending")
    .select("id, audit_id, server_id, exposed_tool, args")
    .single();
  if (!approval) return;

  if (decision === "denied") {
    if (approval.audit_id) {
      await supabase
        .from("audit_log")
        .update({
          status: "denied",
          approver,
          decided_via: "dashboard",
          reason: "Denied by approver — not forwarded.",
        })
        .eq("id", approval.audit_id);
    }
    revalidatePath("/dashboard", "layout");
    return;
  }

  const { result, ok } = await executeApprovedCall(supabase, approval);
  await supabase.from("approvals").update({ result }).eq("id", approvalId);
  if (approval.audit_id) {
    await supabase
      .from("audit_log")
      .update({
        status: ok ? "approved" : "error",
        approver,
        decided_via: "dashboard",
        reason: ok
          ? "Approved — executed against the source MCP."
          : "Approved, but execution failed.",
        result,
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

// ---------- agents ----------

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
