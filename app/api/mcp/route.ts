import { createHash } from "node:crypto";
import { gatewayClient } from "@/lib/gateway/db";
import { evaluatePolicy } from "@/lib/gateway/policy";
import { wireName } from "@/lib/gateway/tools";
import { McpHttpClient, truncateToolResult, type McpToolResult } from "@/lib/mcp/client";
import { decryptSecret } from "@/lib/vault";
import type { PolicyDecision, TransportConfig } from "@/lib/dashboard/types";

/**
 * The Polyshield gateway: an MCP server (streamable HTTP, stateless) that
 * agents connect to instead of the real tools. Every tools/call is checked
 * against the project's policies — allow forwards it downstream with vaulted
 * credentials, deny returns a structured refusal, require_approval parks it
 * as a ticket the agent can poll while a human decides in the dashboard.
 * Every request writes an audit row.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

const PROTOCOL_VERSION = "2025-03-26";
const SUPPORTED_VERSIONS = new Set(["2024-11-05", "2025-03-26", "2025-06-18"]);

const INSTRUCTIONS = `Polyshield is a policy gateway: every tool call is checked against this project's policies before it reaches the real tool.
- Calls may be allowed, denied, or held for human approval.
- A held call returns a pending_approval ticket. Poll polyshield_check_approval with the ticket_id until it resolves; when approved, the executed tool's result is returned there.
- You may include an optional "_reason" argument in any tool call explaining why you need the action. It is shown to the human approver and stripped before the call is forwarded.`;

const CHECK_APPROVAL_TOOL = {
  name: "polyshield_check_approval",
  description:
    "Check a Polyshield approval ticket. When a tool call returns status pending_approval, poll this with the ticket_id until a human decides; when approved, the executed tool's result is returned here.",
  inputSchema: {
    type: "object",
    properties: {
      ticket_id: {
        type: "string",
        description: "Ticket id returned by the held tool call.",
      },
    },
    required: ["ticket_id"],
  },
};

// ---------- JSON-RPC plumbing ----------

interface RpcMessage {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

type RpcResponse = Record<string, unknown>;

function rpcResult(id: RpcMessage["id"], result: unknown): RpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: RpcMessage["id"], code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

/** A tool-result payload whose single text block is a JSON status object. */
function textResult(payload: Record<string, unknown>, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// ---------- gateway context ----------

interface AgentContext {
  keyHash: string;
  agentId: string;
  agentName: string;
  projectId: string;
  db: ReturnType<typeof gatewayClient>;
}

interface CallContext {
  found: boolean;
  ambiguous?: boolean;
  tool?: {
    id: string;
    raw_name: string;
    exposed_name: string;
    enabled: boolean;
    input_schema: Record<string, unknown>;
  };
  server?: {
    id: string;
    name: string;
    prefix: string;
    status: string;
    transport: TransportConfig;
  };
  policies?: Array<{
    id: string;
    exposed_tool: string;
    decision: PolicyDecision;
    condition: string | null;
    description: string;
  }>;
  secrets?: Array<{ name: string; ciphertext: string }>;
}

async function audit(
  ctx: AgentContext,
  entry: {
    serverId: string | null;
    exposedTool: string;
    decision: PolicyDecision;
    status: string;
    args: Record<string, unknown>;
    reason: string;
    result?: unknown;
  },
): Promise<string | null> {
  const { data } = await ctx.db.rpc("gateway_log", {
    p_key_hash: ctx.keyHash,
    p_server_id: entry.serverId,
    p_exposed_tool: entry.exposedTool,
    p_decision: entry.decision,
    p_status: entry.status,
    p_args: entry.args,
    p_reason: entry.reason,
    p_result: entry.result ?? null,
  });
  return (data as string | null) ?? null;
}

function withReasonParam(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema?.type !== "object") return schema;
  return {
    ...schema,
    properties: {
      ...(schema.properties as Record<string, unknown> | undefined),
      _reason: {
        type: "string",
        description:
          "Optional: why you need this action. Shown to the human approver if the call is held; stripped before forwarding.",
      },
    },
  };
}

// ---------- method handlers ----------

async function handleToolsList(ctx: AgentContext): Promise<unknown> {
  const { data } = await ctx.db.rpc("gateway_list_tools", { p_key_hash: ctx.keyHash });
  const rows = (data ?? []) as Array<{
    exposed_name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  const tools: Array<Record<string, unknown>> = rows.map((t) => ({
    name: wireName(t.exposed_name),
    title: t.exposed_name,
    description: t.description,
    inputSchema: withReasonParam(t.input_schema),
  }));
  tools.push(CHECK_APPROVAL_TOOL);
  return { tools };
}

async function executeDownstream(
  call: CallContext,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const transport = call.server!.transport;
  if (transport.type !== "http") {
    return {
      content: [
        {
          type: "text",
          text: "This tool lives on a local stdio server. The Polyshield local runner is not yet available, so the call cannot be executed.",
        },
      ],
      isError: true,
    };
  }
  const secret = call.secrets?.find((s) => s.name === "authHeader");
  const authHeader = secret ? decryptSecret(secret.ciphertext) : undefined;
  const client = new McpHttpClient(transport.endpoint, authHeader);
  await client.connect();
  return client.callTool(call.tool!.raw_name, args);
}

async function handleToolCall(
  ctx: AgentContext,
  name: string,
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const { _reason, ...args } = rawArgs;
  const reason = typeof _reason === "string" ? _reason : "";

  const { data } = await ctx.db.rpc("gateway_call_context", {
    p_key_hash: ctx.keyHash,
    p_wire_name: name,
  });
  const call = data as CallContext | null;
  if (call?.ambiguous) {
    throw {
      code: -32602,
      message: `Ambiguous tool name "${name}": more than one tool maps to it. Rename one server's prefix to disambiguate.`,
    };
  }
  if (!call?.found || !call.tool || !call.server) {
    throw { code: -32602, message: `Unknown tool: ${name}` };
  }
  if (!call.tool.enabled) {
    throw { code: -32602, message: `Unknown tool: ${name}` };
  }

  const policies = (call.policies ?? []).map((p) => ({
    id: p.id,
    decision: p.decision,
    condition: p.condition,
    description: p.description,
  }));
  const { decision, policy } = evaluatePolicy(policies, args);
  const exposedTool = call.tool.exposed_name;
  const serverId = call.server.id;

  if (decision === "deny") {
    await audit(ctx, {
      serverId,
      exposedTool,
      decision,
      status: "blocked",
      args,
      reason: policy?.description || "Denied by policy.",
    });
    return textResult(
      {
        status: "denied",
        tool: exposedTool,
        policy: policy?.description ?? "Denied by Polyshield policy.",
        message:
          "Polyshield blocked this call before it reached the source tool. Do not retry; ask the user to change the policy if this action is genuinely needed.",
      },
      true,
    );
  }

  if (decision === "require_approval") {
    const auditId = await audit(ctx, {
      serverId,
      exposedTool,
      decision,
      status: "waiting_for_approval",
      args,
      reason: reason || policy?.description || "Held for approval.",
    });
    const { data: ticket } = await ctx.db.rpc("gateway_create_approval", {
      p_key_hash: ctx.keyHash,
      p_server_id: serverId,
      p_exposed_tool: exposedTool,
      p_args: args,
      p_reason: reason || policy?.description || "",
      p_policy_id: policy?.id ?? null,
      p_audit_id: auditId,
    });
    return textResult({
      status: "pending_approval",
      ticket_id: ticket,
      tool: exposedTool,
      message:
        "This call is held for human approval and has NOT run yet. Poll polyshield_check_approval with this ticket_id (every ~20s); when approved, the executed result is returned there.",
    });
  }

  // allow → execute downstream now
  try {
    const result = truncateToolResult(await executeDownstream(call, args));
    await audit(ctx, {
      serverId,
      exposedTool,
      decision,
      status: result.isError ? "error" : "allowed",
      args,
      reason: reason || (policy ? policy.description : "No policy matched — default allow."),
      result,
    });
    return result;
  } catch (err) {
    // Keep the specific reason in the audit trail (dashboard-only), but return
    // a generic message to the agent so downstream infra detail never leaks.
    const message = err instanceof Error ? err.message : "Downstream call failed.";
    await audit(ctx, {
      serverId,
      exposedTool,
      decision,
      status: "error",
      args,
      reason: `Execution failed: ${message}`,
    });
    return textResult(
      {
        status: "error",
        tool: exposedTool,
        message: "The downstream tool call failed. Polyshield recorded the error for the operator.",
      },
      true,
    );
  }
}

async function handleCheckApproval(
  ctx: AgentContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  const ticketId = typeof args.ticket_id === "string" ? args.ticket_id.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) {
    return textResult({ status: "error", message: "Invalid ticket_id." }, true);
  }
  const { data } = await ctx.db.rpc("gateway_check_approval", {
    p_key_hash: ctx.keyHash,
    p_approval_id: ticketId,
  });
  const approval = data as {
    status: "pending" | "approved" | "denied";
    result: McpToolResult | null;
    approver: string | null;
    exposed_tool: string;
  } | null;
  if (!approval) {
    return textResult({ status: "error", message: "Unknown ticket." }, true);
  }
  if (approval.status === "pending") {
    return textResult({
      status: "pending",
      ticket_id: ticketId,
      message: "Still waiting for a human decision. Poll again shortly.",
    });
  }
  if (approval.status === "denied") {
    return textResult(
      {
        status: "denied",
        ticket_id: ticketId,
        tool: approval.exposed_tool,
        message:
          "A human denied this action. Do not retry; ask the user if the action is genuinely needed.",
      },
      true,
    );
  }
  // approved — return the stored execution result as the tool result
  if (approval.result && Array.isArray(approval.result.content)) {
    return approval.result;
  }
  // Approved but no result recorded: the downstream side-effect MAY already
  // have run (execution and result-write are not one atomic step). Tell the
  // agent NOT to retry, so a non-idempotent action can't run twice via a new
  // ticket. A human can confirm the outcome in the dashboard.
  return textResult(
    {
      status: "approved_unconfirmed",
      ticket_id: ticketId,
      message:
        "This action was approved and may have already executed, but its result was not recorded. Do NOT retry — re-issuing could run the action twice. Ask the user to confirm the outcome.",
    },
    true,
  );
}

async function handleMessage(
  ctx: AgentContext,
  msg: RpcMessage,
): Promise<RpcResponse | null> {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  if (!method) {
    return isNotification ? null : rpcError(id, -32600, "Missing method");
  }
  if (method.startsWith("notifications/")) return null;

  try {
    switch (method) {
      case "initialize": {
        const requested = (params?.protocolVersion as string) ?? PROTOCOL_VERSION;
        return rpcResult(id, {
          protocolVersion: SUPPORTED_VERSIONS.has(requested) ? requested : PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "Polyshield Gateway", version: "0.1.0" },
          instructions: INSTRUCTIONS,
        });
      }
      case "ping":
        return rpcResult(id, {});
      case "tools/list":
        return rpcResult(id, await handleToolsList(ctx));
      case "tools/call": {
        const name = params?.name as string;
        const args = (params?.arguments ?? {}) as Record<string, unknown>;
        if (!name) return rpcError(id, -32602, "Missing tool name");
        const result =
          name === CHECK_APPROVAL_TOOL.name
            ? await handleCheckApproval(ctx, args)
            : await handleToolCall(ctx, name, args);
        return rpcResult(id, result);
      }
      default:
        return rpcError(id, -32601, `Method not supported: ${method}`);
    }
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "message" in err) {
      const e = err as { code: number; message: string };
      return rpcError(id, e.code, e.message);
    }
    const message = err instanceof Error ? err.message : "Internal gateway error";
    return rpcError(id, -32603, message);
  }
}

// ---------- HTTP handlers ----------

export async function POST(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return json(rpcError(null, -32000, "Missing agent key. Send Authorization: Bearer <key>."), 401);
  }
  const keyHash = createHash("sha256").update(token).digest("hex");
  const db = gatewayClient();
  const { data: agent } = await db.rpc("gateway_handshake", { p_key_hash: keyHash });
  const handshake = agent as {
    agent_id: string;
    agent_name: string;
    project_id: string;
  } | null;
  if (!handshake) {
    return json(rpcError(null, -32000, "Invalid agent key."), 401);
  }
  const ctx: AgentContext = {
    keyHash,
    agentId: handshake.agent_id,
    agentName: handshake.agent_name,
    projectId: handshake.project_id,
    db,
  };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  const messages = Array.isArray(body) ? (body as RpcMessage[]) : [body as RpcMessage];
  const responses = (
    await Promise.all(messages.map((m) => handleMessage(ctx, m)))
  ).filter((r): r is RpcResponse => r !== null);

  if (responses.length === 0) return new Response(null, { status: 202 });
  return json(Array.isArray(body) ? responses : responses[0]);
}

// Stateless server: no SSE stream to subscribe to, nothing to delete.
export async function GET(): Promise<Response> {
  return json(rpcError(null, -32000, "This MCP server is stateless; POST JSON-RPC messages."), 405);
}

export async function DELETE(): Promise<Response> {
  return new Response(null, { status: 200 });
}
