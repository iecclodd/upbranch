"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { maskSecret } from "@/lib/dashboard/format";
import { exposedName, isRiskyRawTool } from "@/lib/gateway/tools";
import { isParseableCondition } from "@/lib/gateway/policy";
import { applyShield, describeScan, scanToolDefinition, scanToolResult } from "@/lib/gateway/shield";
import {
  discoverHttpTools,
  McpHttpClient,
  truncateToolResult,
  type McpToolResult,
} from "@/lib/mcp/client";
import { decryptSecret, encryptSecret } from "@/lib/vault";
import { registryEntry } from "@/lib/registry/catalog";
import {
  DEFAULT_SANDBOX_PROFILE,
  type PolicyDecision,
  type RawTool,
  type SandboxProfile,
  type ShieldMode,
  type TransportConfig,
} from "@/lib/dashboard/types";

export interface ActionResult {
  error?: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve the user's working project. Inlined here (rather than imported from
 * the repository) so this "use server" module — reachable from Client
 * Components — never pulls server-only query code into the client bundle.
 */
async function currentProjectId(supabase: Supabase): Promise<string> {
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
 * Record a control-plane change in the audit log (event_type='admin'). The
 * acting user lands in the `agent` column; `target` is the entity touched and
 * `detail` the human-readable sentence shown in the log row.
 */
async function logAdminEvent(
  supabase: Supabase,
  projectId: string,
  event: { target: string; detail: string; serverId?: string | null },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    project_id: projectId,
    server_id: event.serverId ?? null,
    agent: user?.email ?? "dashboard",
    exposed_tool: event.target,
    decision: "allow",
    status: "info",
    event_type: "admin",
    reason: event.detail,
    args: {},
  });
}

/**
 * Display copy of a transport: secret values replaced with masks. The raw
 * values go to the vault; the database only ever sees this masked shape.
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
      // Tool-poisoning scan: a malicious server can hide instructions in a
      // tool's name/description/schema. High-risk tools land DISABLED.
      await supabase.from("catalog_tools").insert(
        tools.map((raw) => {
          const scan = scanToolDefinition({
            name: raw.name,
            description: raw.description,
            inputSchema: raw.inputSchema,
          });
          return {
            project_id: projectId,
            server_id: server.id,
            raw_name: raw.name,
            raw_description: raw.description,
            input_schema: raw.inputSchema,
            exposed_name: exposedName(prefix, raw.name),
            enabled: scan.risk !== "high",
            risk: scan.risk,
            risk_detail: scan.detail ?? null,
          };
        }),
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

    await logAdminEvent(supabase, projectId, {
      serverId: server.id,
      target: input.name.trim(),
      detail: `Connected HTTP MCP server "${input.name.trim()}" (${prefix}.*) — ${tools.length} tools discovered.`,
    });
  } else {
    if (!input.transport.command.trim()) {
      return { error: "A launch command is required for a local stdio server." };
    }

    // Env values go to the vault as env:KEY ciphertext; the database keeps
    // only masks. The control plane releases them solely to a paired runner.
    const envEntries = Object.entries(input.transport.env).filter(([k, v]) => k && v);
    let envSecrets: Array<{ name: string; ciphertext: string }> = [];
    if (envEntries.length > 0) {
      try {
        envSecrets = envEntries.map(([key, value]) => ({
          name: `env:${key}`,
          ciphertext: encryptSecret(value),
        }));
      } catch {
        return {
          error: "Credential vault is not configured (POLYSHIELD_VAULT_KEY). Secrets not stored.",
        };
      }
    }

    const { data: server, error } = await supabase
      .from("mcp_servers")
      .insert({
        project_id: projectId,
        name: input.name.trim(),
        prefix,
        kind: "remote",
        status: "pending",
        transport: maskTransport(input.transport),
        description: "Local stdio server — start the Polyshield runner on your machine to connect it.",
      })
      .select("id")
      .single();
    if (error || !server) return { error: "Could not save the server." };

    if (envSecrets.length > 0) {
      const { error: secretError } = await supabase.from("server_secrets").insert(
        envSecrets.map((s) => ({
          project_id: projectId,
          server_id: server.id,
          name: s.name,
          ciphertext: s.ciphertext,
        })),
      );
      if (secretError) {
        await supabase.from("mcp_servers").delete().eq("id", server.id);
        return { error: "Could not store the secrets in the vault." };
      }
    }

    await logAdminEvent(supabase, projectId, {
      serverId: server.id,
      target: input.name.trim(),
      detail: `Registered local stdio server "${input.name.trim()}" (${prefix}.*) — waiting for the local runner.`,
    });
  }

  revalidatePath("/dashboard", "layout");
  return {};
}

/**
 * One-click install from the MCP registry: registers the stdio server with its
 * recommended sandbox profile, vaults any env secrets, and lays down the
 * pre-built starter policies so the risky tools are gated before the runner
 * even launches it.
 */
export async function addFromRegistryAction(input: {
  registryId: string;
  prefix?: string;
  env?: Record<string, string>;
}): Promise<ActionResult> {
  const entry = registryEntry(input.registryId);
  if (!entry) return { error: "Unknown registry entry." };

  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);

  // Pick a free prefix (append a number if the default is taken).
  const base = (input.prefix?.trim().toLowerCase() || entry.defaultPrefix).replace(/[^a-z0-9_]/g, "");
  if (!/^[a-z][a-z0-9_]*$/.test(base)) return { error: "Invalid namespace." };
  const { data: existing } = await supabase
    .from("mcp_servers")
    .select("prefix")
    .eq("project_id", projectId);
  const taken = new Set((existing ?? []).map((s) => s.prefix));
  let prefix = base;
  for (let i = 2; taken.has(prefix); i++) prefix = `${base}${i}`;

  // Encrypt provided env secrets before any write (fail closed on no vault key).
  const envEntries = Object.entries(input.env ?? {}).filter(([k, v]) => k && v);
  let envSecrets: Array<{ name: string; ciphertext: string }> = [];
  if (envEntries.length > 0) {
    try {
      envSecrets = envEntries.map(([k, v]) => ({ name: `env:${k}`, ciphertext: encryptSecret(v) }));
    } catch {
      return { error: "Credential vault is not configured (POLYSHIELD_VAULT_KEY)." };
    }
  }

  const sandbox: SandboxProfile = { ...DEFAULT_SANDBOX_PROFILE, ...entry.recommendedSandbox };
  const transport: TransportConfig = {
    type: "stdio",
    command: entry.command,
    args: entry.args,
    env: Object.fromEntries(envEntries.map(([k, v]) => [k, maskSecret(v)])),
    envPassthrough: ["PATH"],
  };

  const { data: server, error } = await supabase
    .from("mcp_servers")
    .insert({
      project_id: projectId,
      name: entry.name,
      prefix,
      kind: "remote",
      status: "pending",
      transport,
      sandbox_profile: sandbox,
      origin: "registry",
      registry_id: entry.id,
      description: `${entry.name} — added from the registry. Start the Polyshield runner to connect it.`,
    })
    .select("id")
    .single();
  if (error || !server) return { error: "Could not add the server." };

  if (envSecrets.length > 0) {
    await supabase.from("server_secrets").insert(
      envSecrets.map((s) => ({ project_id: projectId, server_id: server.id, name: s.name, ciphertext: s.ciphertext })),
    );
  }

  if (entry.recommendedPolicies.length > 0) {
    await supabase.from("policies").insert(
      entry.recommendedPolicies.map((p) => ({
        project_id: projectId,
        server_id: server.id,
        exposed_tool: `${prefix}.${p.tool}`,
        decision: p.decision,
        description: p.description,
      })),
    );
  }

  await logAdminEvent(supabase, projectId, {
    serverId: server.id,
    target: entry.name,
    detail: `Installed "${entry.name}" from the registry (${prefix}.*) with ${entry.recommendedPolicies.length} starter policies.`,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteServerAction(serverId: string) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const { data: server } = await supabase
    .from("mcp_servers")
    .select("name, prefix")
    .eq("id", serverId)
    .maybeSingle();
  await supabase.from("mcp_servers").delete().eq("id", serverId);
  if (server) {
    await logAdminEvent(supabase, projectId, {
      target: server.name,
      detail: `Removed MCP server "${server.name}" (${server.prefix}.*) — its tools and policies were deleted.`,
    });
  }
  revalidatePath("/dashboard", "layout");
}

export async function setShieldModeAction(
  serverId: string,
  mode: ShieldMode,
): Promise<ActionResult> {
  if (!["off", "flag", "block"].includes(mode)) return { error: "Unknown shield mode." };
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const { data: server } = await supabase
    .from("mcp_servers")
    .update({ shield_mode: mode })
    .eq("id", serverId)
    .select("name")
    .maybeSingle();
  if (server) {
    await logAdminEvent(supabase, projectId, {
      serverId,
      target: server.name,
      detail: `Prompt-injection shield on "${server.name}" set to ${mode}.`,
    });
  }
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function setSandboxProfileAction(
  serverId: string,
  profile: SandboxProfile,
): Promise<ActionResult> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);

  // Normalize/validate so a malformed client payload can't widen the sandbox.
  const clean: SandboxProfile = {
    fsScope: (Array.isArray(profile.fsScope) ? profile.fsScope : [])
      .map((p) => String(p).trim())
      .filter(Boolean)
      .slice(0, 20),
    egress: {
      mode: (["inherit", "none", "allowlist"] as const).includes(profile.egress?.mode)
        ? profile.egress.mode
        : "inherit",
      allow: (Array.isArray(profile.egress?.allow) ? profile.egress.allow : [])
        .map((d) => String(d).trim())
        .filter(Boolean)
        .slice(0, 50),
    },
    limits: {
      wallMs: clampInt(profile.limits?.wallMs, 1000, 600000, 60000),
      memMB: profile.limits?.memMB ? clampInt(profile.limits.memMB, 64, 16384, 512) : undefined,
    },
    snapshotBeforeWrite: profile.snapshotBeforeWrite === true,
    dryRunOnApproval: profile.dryRunOnApproval === true,
    stripEnv: profile.stripEnv === true,
    containerize: profile.containerize === true,
  };

  const { data: server } = await supabase
    .from("mcp_servers")
    .update({ sandbox_profile: clean })
    .eq("id", serverId)
    .select("name")
    .maybeSingle();
  if (server) {
    await logAdminEvent(supabase, projectId, {
      serverId,
      target: server.name,
      detail: `Sandbox profile updated for "${server.name}" (scope: ${clean.fsScope.length || "none"}, egress: ${clean.egress.mode}, snapshots: ${clean.snapshotBeforeWrite ? "on" : "off"}).`,
    });
  }
  revalidatePath("/dashboard", "layout");
  return {};
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Save (or clear) the Slack incoming-webhook for approval notifications. */
export async function setSlackWebhookAction(url: string): Promise<ActionResult> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const trimmed = url.trim();
  if (trimmed && !/^https:\/\/hooks\.slack\.com\/services\//.test(trimmed)) {
    return { error: "That doesn't look like a Slack incoming webhook (https://hooks.slack.com/services/…)." };
  }
  let ciphertext: string | null = null;
  if (trimmed) {
    try {
      ciphertext = encryptSecret(trimmed);
    } catch {
      return { error: "Credential vault is not configured (POLYSHIELD_VAULT_KEY)." };
    }
  }
  await supabase.from("projects").update({ slack_webhook_ciphertext: ciphertext }).eq("id", projectId);
  await logAdminEvent(supabase, projectId, {
    target: "Slack",
    detail: trimmed ? "Connected a Slack webhook for approval notifications." : "Disconnected the Slack webhook.",
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

/** Toggle offline/privacy mode — redact tool args/results from the audit log. */
export async function setPrivacyModeAction(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  await supabase.from("projects").update({ privacy_mode: enabled }).eq("id", projectId);
  await logAdminEvent(supabase, projectId, {
    target: "privacy mode",
    detail: `Offline/privacy mode turned ${enabled ? "on" : "off"} — tool args/results ${enabled ? "are now redacted from" : "are now stored in"} the audit log.`,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

// ---------- tools + policies ----------

export async function toggleToolAction(toolId: string, enabled: boolean) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const { data: tool } = await supabase
    .from("catalog_tools")
    .update({ enabled })
    .eq("id", toolId)
    .select("exposed_name, server_id")
    .maybeSingle();
  if (tool) {
    await logAdminEvent(supabase, projectId, {
      serverId: tool.server_id,
      target: tool.exposed_name,
      detail: `${enabled ? "Exposed" : "Hid"} tool ${tool.exposed_name} ${enabled ? "to" : "from"} agents.`,
    });
  }
  revalidatePath("/dashboard", "layout");
}

export async function setPolicyDecisionAction(
  policyId: string,
  decision: PolicyDecision,
) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const { data: policy } = await supabase
    .from("policies")
    .update({ decision })
    .eq("id", policyId)
    .select("exposed_tool, server_id")
    .maybeSingle();
  if (policy) {
    await logAdminEvent(supabase, projectId, {
      serverId: policy.server_id,
      target: policy.exposed_tool,
      detail: `Policy on ${policy.exposed_tool} changed to ${decision.replaceAll("_", " ")}.`,
    });
  }
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
  await logAdminEvent(supabase, projectId, {
    serverId: tool.server_id,
    target: input.exposedTool,
    detail: `Created ${input.decision.replaceAll("_", " ")} policy on ${input.exposedTool}${condition ? ` when ${condition}` : ""}.`,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deletePolicyAction(policyId: string) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const { data: policy } = await supabase
    .from("policies")
    .select("exposed_tool, decision, server_id")
    .eq("id", policyId)
    .maybeSingle();
  await supabase.from("policies").delete().eq("id", policyId);
  if (policy) {
    await logAdminEvent(supabase, projectId, {
      serverId: policy.server_id,
      target: policy.exposed_tool,
      detail: `Deleted ${String(policy.decision).replaceAll("_", " ")} policy on ${policy.exposed_tool}.`,
    });
  }
  revalidatePath("/dashboard", "layout");
}

// ---------- approvals ----------

const failureResult = (text: string): { result: McpToolResult; ok: boolean } => ({
  result: { content: [{ type: "text", text }], isError: true },
  ok: false,
});

/** Run an approved call on a local stdio server via a runner job. */
async function executeApprovedStdio(
  supabase: Supabase,
  projectId: string,
  serverId: string,
  rawName: string,
  args: Record<string, unknown>,
  meta: Record<string, unknown> = {},
): Promise<{ result: McpToolResult; ok: boolean }> {
  const freshAfter = new Date(Date.now() - 90_000).toISOString();
  const { data: online } = await supabase
    .from("runners")
    .select("id")
    .eq("project_id", projectId)
    .gt("last_seen_at", freshAfter)
    .limit(1)
    .maybeSingle();
  if (!online) {
    return failureResult(
      "Approved, but no Polyshield local runner is online to execute this stdio call. Start the runner and approve again if needed.",
    );
  }

  const { data: job } = await supabase
    .from("runner_jobs")
    .insert({
      project_id: projectId,
      server_id: serverId,
      raw_name: rawName,
      args,
      agent: "approval-execute",
      kind: "call",
      meta,
    })
    .select("id")
    .single();
  if (!job) return failureResult("Could not enqueue the runner job.");

  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1_000));
    const { data: row } = await supabase
      .from("runner_jobs")
      .select("status, result, error")
      .eq("id", job.id)
      .maybeSingle();
    if (!row) break;
    if (row.status === "done") {
      const r = (row.result ?? {}) as Partial<McpToolResult>;
      const result: McpToolResult = {
        content: Array.isArray(r.content) ? r.content : [],
        structuredContent: r.structuredContent,
        isError: r.isError === true,
      };
      return { result, ok: !result.isError };
    }
    if (row.status === "error" || row.status === "expired") {
      return failureResult(
        `Approved, but the runner could not execute the call: ${row.error ?? row.status}`,
      );
    }
  }
  return failureResult("Approved, but the runner did not return a result in time.");
}

/**
 * Execute an approved call against its source server using vaulted
 * credentials. Returns an MCP-shaped tool result either way so the agent
 * polling the ticket gets something it can read.
 */
async function executeApprovedCall(
  supabase: Supabase,
  projectId: string,
  approval: {
    server_id: string | null;
    exposed_tool: string;
    args: Record<string, unknown>;
  },
): Promise<{ result: McpToolResult; ok: boolean; shieldNote?: string; original?: McpToolResult }> {
  if (!approval.server_id) return failureResult("The source server no longer exists.");

  const { data: server } = await supabase
    .from("mcp_servers")
    .select("id, transport, shield_mode, sandbox_profile")
    .eq("id", approval.server_id)
    .maybeSingle();
  if (!server) return failureResult("The source server no longer exists.");

  const { data: tool } = await supabase
    .from("catalog_tools")
    .select("raw_name")
    .eq("server_id", server.id)
    .eq("exposed_name", approval.exposed_tool)
    .maybeSingle();
  if (!tool) return failureResult("The tool is no longer in the catalog.");

  const transport = server.transport as TransportConfig;
  let executed: { result: McpToolResult; ok: boolean };

  if (transport.type === "http") {
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
      executed = { result, ok: !result.isError };
    } catch (err) {
      return failureResult(
        `Approved, but execution failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  } else {
    // Snapshot before an approved destructive call so the operator can undo it.
    const sandbox = (server.sandbox_profile ?? {}) as Partial<SandboxProfile>;
    const meta =
      sandbox.snapshotBeforeWrite && isRiskyRawTool(tool.raw_name)
        ? {
            snapshot: true,
            label: `before ${approval.exposed_tool} (approved)`,
            fsScope: sandbox.fsScope ?? [],
          }
        : {};
    executed = await executeApprovedStdio(
      supabase,
      projectId,
      server.id,
      tool.raw_name,
      approval.args,
      meta,
    );
  }

  // Approved results are still untrusted downstream bytes — screen them with
  // the same shield as the gateway's allow path, and do it BEFORE the
  // transport-failure check: a downstream server can set isError=true on a
  // result whose text still carries an injection, and that must not slip
  // through unscanned just because the call was flagged as an error.
  const mode = (server.shield_mode ?? "flag") as ShieldMode;
  const scan = scanToolResult(executed.result);
  const { result: screened, blocked } = applyShield(executed.result, scan, mode);
  const shieldNote = scan.flagged
    ? `${blocked ? "Shield blocked the result" : "Shield flagged the result"} — matched: ${describeScan(scan)}.`
    : undefined;

  if (!executed.ok) {
    return { result: screened, ok: false, original: executed.result, shieldNote };
  }
  return {
    result: screened,
    ok: !blocked,
    original: executed.result,
    shieldNote,
  };
}

async function decideApproval(
  approvalId: string,
  decision: "approved" | "denied",
  remember = false,
) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const approver = user?.email ?? "unknown";

  // Atomic claim — a second click or a racing approve/deny finds no row.
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

  const { result, ok, shieldNote, original } = await executeApprovedCall(
    supabase,
    projectId,
    approval,
  );
  // The agent polling the ticket receives the screened result; the audit row
  // keeps the original so the operator can inspect quarantined content —
  // unless privacy mode is on, in which case the audit result is redacted.
  await supabase.from("approvals").update({ result }).eq("id", approvalId);
  if (approval.audit_id) {
    const { data: proj } = await supabase
      .from("projects")
      .select("privacy_mode")
      .eq("id", projectId)
      .maybeSingle();
    const auditResult = proj?.privacy_mode
      ? { _redacted: true, bytes: JSON.stringify(original ?? result ?? null).length }
      : original ?? result;
    await supabase
      .from("audit_log")
      .update({
        status: ok ? "approved" : shieldNote ? "blocked" : "error",
        approver,
        decided_via: "dashboard",
        reason: ok
          ? `Approved — executed against the source MCP.${shieldNote ? ` ${shieldNote}` : ""}`
          : shieldNote ?? "Approved, but execution failed.",
        result: auditResult,
      })
      .eq("id", approval.audit_id);
  }

  // "Remember this rule": stop holding this tool — create an allow policy so
  // future identical calls pass without an approval. Only if one doesn't
  // already exist, and only for an unconditional gate (a conditional one stays
  // as authored). The operator chose this explicitly.
  if (remember && approval.exposed_tool) {
    const { data: existingAllow } = await supabase
      .from("policies")
      .select("id")
      .eq("project_id", projectId)
      .eq("exposed_tool", approval.exposed_tool)
      .eq("decision", "allow")
      .maybeSingle();
    if (!existingAllow) {
      await supabase.from("policies").insert({
        project_id: projectId,
        server_id: approval.server_id,
        exposed_tool: approval.exposed_tool,
        decision: "allow",
        description: `Remembered from an approval by ${approver} — auto-allow.`,
      });
      await logAdminEvent(supabase, projectId, {
        serverId: approval.server_id,
        target: approval.exposed_tool,
        detail: `Remembered approval as a rule: ${approval.exposed_tool} now auto-allows.`,
      });
    }
  }
  revalidatePath("/dashboard", "layout");
}

export async function approveAction(approvalId: string, remember = false) {
  await decideApproval(approvalId, "approved", remember);
}

export async function denyAction(approvalId: string) {
  await decideApproval(approvalId, "denied");
}

// ---------- snapshots (undo) ----------

export async function restoreSnapshotAction(snapshotId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);

  const { data: snap } = await supabase
    .from("runner_snapshots")
    .select("id, server_id, ref, scope_path, status, label")
    .eq("id", snapshotId)
    .maybeSingle();
  if (!snap) return { error: "Snapshot not found." };
  if (!snap.server_id) {
    return { error: "The source server was removed, so this snapshot can't be restored." };
  }
  if (snap.status !== "available") {
    return { error: "This snapshot can no longer be restored." };
  }

  const freshAfter = new Date(Date.now() - 90_000).toISOString();
  const { data: online } = await supabase
    .from("runners")
    .select("id")
    .eq("project_id", projectId)
    .gt("last_seen_at", freshAfter)
    .limit(1)
    .maybeSingle();
  if (!online) {
    return { error: "No Polyshield runner is online to restore this snapshot. Start the runner and retry." };
  }

  // Enqueue a restore job for the runner; mark the snapshot in-flight.
  await supabase.from("runner_jobs").insert({
    project_id: projectId,
    server_id: snap.server_id,
    raw_name: "__restore__",
    args: {},
    agent: "snapshot-restore",
    kind: "restore",
    meta: { snapshotId: snap.id, ref: snap.ref, scopePath: snap.scope_path },
  });
  await supabase.from("runner_snapshots").update({ status: "restoring" }).eq("id", snap.id);
  await logAdminEvent(supabase, projectId, {
    serverId: snap.server_id,
    target: snap.label || "snapshot",
    detail: `Restoring snapshot "${snap.label || snap.id}" — reverting the server's filesystem scope.`,
  });
  revalidatePath("/dashboard", "layout");
  return {};
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
  await logAdminEvent(supabase, projectId, {
    target: name.trim() || "New agent",
    detail: `Created agent "${name.trim() || "New agent"}" and issued a key.`,
  });
  revalidatePath("/dashboard", "layout");
  return { key };
}

export async function deleteAgentAction(agentId: string) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const { data: agent } = await supabase
    .from("agents")
    .select("name")
    .eq("id", agentId)
    .maybeSingle();
  await supabase.from("agents").delete().eq("id", agentId);
  if (agent) {
    await logAdminEvent(supabase, projectId, {
      target: agent.name,
      detail: `Deleted agent "${agent.name}" — its key stopped working immediately.`,
    });
  }
  revalidatePath("/dashboard", "layout");
}

// ---------- runners ----------

/** Pair a local runner: returns the token once — only its hash is stored. */
export async function pairRunnerAction(name: string): Promise<{ token: string }> {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const token = `prt_live_${randomBytes(24).toString("hex")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await supabase.from("runners").insert({
    project_id: projectId,
    name: name.trim() || "My machine",
    token_hash: tokenHash,
  });
  await logAdminEvent(supabase, projectId, {
    target: name.trim() || "My machine",
    detail: `Paired local runner "${name.trim() || "My machine"}" and issued a token.`,
  });
  revalidatePath("/dashboard", "layout");
  return { token };
}

export async function deleteRunnerAction(runnerId: string) {
  const supabase = await createClient();
  const projectId = await currentProjectId(supabase);
  const { data: runner } = await supabase
    .from("runners")
    .select("name")
    .eq("id", runnerId)
    .maybeSingle();
  await supabase.from("runners").delete().eq("id", runnerId);
  if (runner) {
    await logAdminEvent(supabase, projectId, {
      target: runner.name,
      detail: `Unpaired local runner "${runner.name}" — its token stopped working immediately.`,
    });
  }
  revalidatePath("/dashboard", "layout");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
