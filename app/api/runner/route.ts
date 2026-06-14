import { createHash } from "node:crypto";
import { gatewayClient } from "@/lib/gateway/db";
import { scanToolDefinition } from "@/lib/gateway/shield";
import { isRiskyRawTool } from "@/lib/gateway/tools";
import { truncateToolResult } from "@/lib/mcp/client";
import { decryptSecret } from "@/lib/vault";
import type { StdioTransport } from "@/lib/dashboard/types";

/**
 * Control plane for the Polyshield local runner. The runner is a daemon on
 * the user's machine: it dials OUT to this endpoint with its pairing token
 * (only the SHA-256 hash is stored), fetches the stdio server configs for its
 * project, launches them locally, reports discovered tools, and executes
 * tool-call jobs the gateway enqueues. Nothing ever connects inbound to the
 * user's machine, and agents have no path to the runner.
 *
 * Like the gateway, this route holds only the anon key — every privileged
 * operation goes through runner_* SECURITY DEFINER RPCs scoped by token hash.
 *
 * Ops (POST {op, ...} with Authorization: Bearer prt_live_...):
 *  - sync:     heartbeat + report server states/tools, receive configs
 *              (env secrets decrypted from the vault for the paired runner).
 *  - claim:    atomically claim pending jobs.
 *  - complete: deliver a job result or error.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

interface ReportedTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface ReportedServer {
  serverId: string;
  status?: "connected" | "error" | "pending";
  error?: string;
  tools?: ReportedTool[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return json({ error: "Missing runner token. Send Authorization: Bearer <token>." }, 401);
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = gatewayClient();

  let body: {
    op?: string;
    hostname?: string;
    version?: string;
    servers?: ReportedServer[];
    jobId?: string;
    kind?: string;
    result?: unknown;
    error?: string;
    max?: number;
    // snapshot ops
    serverId?: string;
    label?: string;
    scopePath?: string;
    ref?: string;
    snapshotKind?: string;
    bytes?: number;
    snapshotId?: string;
    ok?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { data: handshake } = await db.rpc("runner_handshake", {
    p_token_hash: tokenHash,
    p_hostname: typeof body.hostname === "string" ? body.hostname.slice(0, 120) : null,
    p_version: typeof body.version === "string" ? body.version.slice(0, 40) : null,
  });
  if (!handshake) {
    return json({ error: "Invalid runner token." }, 401);
  }

  switch (body.op) {
    case "sync": {
      // Inbound: per-server status + freshly discovered tools.
      for (const reported of body.servers ?? []) {
        if (typeof reported?.serverId !== "string") continue;
        if (Array.isArray(reported.tools)) {
          const tools = reported.tools
            .filter((t) => t && typeof t.name === "string" && t.name)
            .slice(0, 500)
            .map((t) => {
              const description = typeof t.description === "string" ? t.description : "";
              const inputSchema = t.inputSchema ?? { type: "object", properties: {} };
              const scan = scanToolDefinition({ name: t.name, description, inputSchema });
              return {
                name: t.name,
                description,
                input_schema: inputSchema,
                risky: isRiskyRawTool(t.name),
                risk: scan.risk,
                risk_detail: scan.detail ?? null,
              };
            });
          await db.rpc("runner_report_tools", {
            p_token_hash: tokenHash,
            p_server_id: reported.serverId,
            p_tools: tools,
          });
        } else if (reported.status === "error" || reported.status === "pending") {
          await db.rpc("runner_set_server_status", {
            p_token_hash: tokenHash,
            p_server_id: reported.serverId,
            p_status: reported.status,
            p_detail:
              typeof reported.error === "string" && reported.error
                ? `Runner: ${reported.error.slice(0, 300)}`
                : "",
          });
        }
      }

      // Outbound: stdio configs with env secrets released from the vault.
      // Raw env values exist only here-to-runner over TLS; the database keeps
      // ciphertext and the dashboard only ever shows masks.
      const { data: configData } = await db.rpc("runner_get_config", {
        p_token_hash: tokenHash,
      });
      const rows = (configData ?? []) as Array<{
        id: string;
        name: string;
        prefix: string;
        status: string;
        transport: StdioTransport;
        sandbox_profile: unknown;
        secrets: Array<{ name: string; ciphertext: string }>;
      }>;

      const servers = [];
      for (const row of rows) {
        const env: Record<string, string> = {};
        for (const secret of row.secrets ?? []) {
          if (!secret.name.startsWith("env:")) continue;
          try {
            env[secret.name.slice(4)] = decryptSecret(secret.ciphertext);
          } catch {
            return json(
              { error: "Credential vault is not configured on the control plane (POLYSHIELD_VAULT_KEY)." },
              500,
            );
          }
        }
        servers.push({
          id: row.id,
          name: row.name,
          prefix: row.prefix,
          command: row.transport.command,
          args: row.transport.args ?? [],
          env,
          envPassthrough: row.transport.envPassthrough ?? [],
          cwd: row.transport.cwd,
          sandbox: row.sandbox_profile ?? null,
        });
      }

      return json({ ok: true, servers, pollIntervalMs: 1500 });
    }

    case "claim": {
      const { data } = await db.rpc("runner_claim_jobs", {
        p_token_hash: tokenHash,
        p_max: typeof body.max === "number" ? body.max : 5,
      });
      const jobs = ((data ?? []) as Array<{
        id: string;
        server_id: string;
        raw_name: string;
        args: Record<string, unknown>;
        kind: string;
        meta: Record<string, unknown>;
      }>).map((j) => ({
        id: j.id,
        serverId: j.server_id,
        rawName: j.raw_name,
        args: j.args ?? {},
        kind: j.kind ?? "call",
        meta: j.meta ?? {},
      }));
      return json({ ok: true, jobs });
    }

    case "complete": {
      if (typeof body.jobId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.jobId)) {
        return json({ error: "Invalid jobId." }, 400);
      }
      const errorText =
        typeof body.error === "string" && body.error ? body.error.slice(0, 1_000) : null;
      let result: unknown = null;
      if (!errorText && body.result !== undefined && body.result !== null) {
        if (body.kind === "dryrun") {
          // A dry-run result is a diff preview, not a tool result — store it
          // as-is (size-capped), so it survives onto the approval card.
          const serialized = JSON.stringify(body.result);
          result =
            serialized && serialized.length > 200_000
              ? { truncated: true, note: "Preview too large to store." }
              : body.result;
        } else {
          // A call result is a tool result — cap it like the gateway does.
          result = truncateToolResult({
            content: Array.isArray((body.result as { content?: unknown[] }).content)
              ? (body.result as { content: never[] }).content
              : [],
            structuredContent: (body.result as { structuredContent?: unknown }).structuredContent,
            isError: (body.result as { isError?: boolean }).isError === true,
          });
        }
      }
      const { data: completed } = await db.rpc("runner_complete_job", {
        p_token_hash: tokenHash,
        p_job_id: body.jobId,
        p_result: result,
        p_error: errorText,
      });
      return json({ ok: completed === true });
    }

    case "snapshot": {
      const { data } = await db.rpc("runner_report_snapshot", {
        p_token_hash: tokenHash,
        p_server_id: typeof body.serverId === "string" ? body.serverId : null,
        p_job_id: typeof body.jobId === "string" ? body.jobId : null,
        p_label: typeof body.label === "string" ? body.label.slice(0, 200) : "",
        p_scope_path: typeof body.scopePath === "string" ? body.scopePath.slice(0, 1000) : "",
        p_ref: typeof body.ref === "string" ? body.ref : "",
        p_kind: typeof body.snapshotKind === "string" ? body.snapshotKind : "copy",
        p_bytes: typeof body.bytes === "number" ? body.bytes : null,
      });
      return json({ ok: true, snapshotId: (data as string | null) ?? null });
    }

    case "snapshot_restored": {
      const { data } = await db.rpc("runner_mark_snapshot_restored", {
        p_token_hash: tokenHash,
        p_snapshot_id: typeof body.snapshotId === "string" ? body.snapshotId : null,
        p_ok: body.ok === true,
      });
      return json({ ok: data === true });
    }

    default:
      return json({ error: `Unknown op: ${String(body.op)}` }, 400);
  }
}
