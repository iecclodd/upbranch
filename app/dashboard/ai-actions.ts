"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { GROQ_MODELS } from "@/lib/ai/provider";
import { parseJsonObject, runAi } from "@/lib/ai/run";
import { isParseableCondition } from "@/lib/gateway/policy";
import type { Plan } from "@/lib/dashboard/types";

async function context(): Promise<{ projectId: string; plan: Plan } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!project) return null;
  const profile = await getProfile();
  return { projectId: project.id, plan: profile?.plan ?? "free" };
}

export interface ApprovalRiskResult {
  ok: boolean;
  message?: string;
  risk?: "low" | "medium" | "high";
  reason?: string;
  watchFor?: string;
}

/** AI risk summary for a pending approval — the headline paid feature. */
export async function aiApprovalRiskAction(approvalId: string): Promise<ApprovalRiskResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: "Not authenticated." };

  const supabase = await createClient();
  const [{ data: approval }, { data: proj }] = await Promise.all([
    supabase
      .from("approvals")
      .select("exposed_tool, args, reason, risk")
      .eq("id", approvalId)
      .eq("project_id", ctx.projectId)
      .maybeSingle(),
    supabase.from("projects").select("privacy_mode").eq("id", ctx.projectId).maybeSingle(),
  ]);
  if (!approval) return { ok: false, message: "Approval not found." };

  // Respect offline/privacy mode: when on, never ship raw argument VALUES to the
  // third-party model — send only the argument key names, matching how the
  // gateway redacts args from the audit log. The feature still works (tool name,
  // stated reason, and arg shape are enough to assess risk) without exfiltrating
  // file contents / command strings / secrets-in-transit to the provider.
  const privacy = proj?.privacy_mode === true;
  const argKeys = Object.keys((approval.args ?? {}) as Record<string, unknown>);
  const argsForModel = privacy
    ? `(redacted by offline mode — argument keys only: ${argKeys.join(", ") || "none"})`
    : JSON.stringify(approval.args ?? {}, null, 2);

  const outcome = await runAi(ctx.projectId, ctx.plan, {
    model: GROQ_MODELS.smart,
    json: true,
    maxOutputTokens: 220,
    system:
      "You are a security reviewer for an AI-agent tool-call gateway. Given one pending tool call, assess its risk to the user's systems and data. Consider destructive/irreversible actions, data exfiltration, blast radius, and whether the arguments look anomalous for this tool. Output ONLY JSON: {\"risk\":\"low|medium|high\",\"reason\":\"<=200 chars\",\"watch_for\":\"<=120 chars\"}.",
    user: `Tool: ${approval.exposed_tool}\nStated reason: ${approval.reason ?? "(none)"}\nArguments:\n${argsForModel}`,
  });

  if (!outcome.ok) {
    return {
      ok: false,
      message:
        outcome.reason === "upgrade_required"
          ? "AI risk analysis is a paid feature — upgrade to enable it."
          : outcome.message,
    };
  }

  const parsed = parseJsonObject(outcome.text);
  if (!parsed) return { ok: false, message: "Could not parse the AI response." };
  const risk = String(parsed.risk ?? "").toLowerCase();
  return {
    ok: true,
    risk: (["low", "medium", "high"].includes(risk) ? risk : "medium") as "low" | "medium" | "high",
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : undefined,
    watchFor: typeof parsed.watch_for === "string" ? parsed.watch_for.slice(0, 160) : undefined,
  };
}

export interface SuggestConditionResult {
  ok: boolean;
  message?: string;
  condition?: string;
  parseable?: boolean;
}

/** Translate a plain-English rule into a Polyshield policy condition (draft). */
export async function aiSuggestConditionAction(text: string): Promise<SuggestConditionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: "Not authenticated." };
  if (!text.trim()) return { ok: false, message: "Describe the rule first." };

  const outcome = await runAi(ctx.projectId, ctx.plan, {
    model: GROQ_MODELS.cheap,
    json: true,
    maxOutputTokens: 160,
    system:
      "You translate a plain-English rule into a Polyshield policy CONDITION string. Grammar: clauses joined by ` and `. A clause is `field op value` (op: == != > >= < <=), or `field startsWith value`, or `field in [\"a\",\"b\"]`, optionally prefixed with `not `. Fields are call-argument names plus the injected vars: action (the tool name), path, project_root, tainted, risk. Quote string values. Output ONLY JSON: {\"condition\":\"<the condition, or empty string if the rule needs no condition>\"}. If impossible, {\"condition\":\"\"}.",
    user: `Rule: ${text}`,
  });

  if (!outcome.ok) {
    return {
      ok: false,
      message:
        outcome.reason === "upgrade_required"
          ? "AI policy help is a paid feature — upgrade to enable it."
          : outcome.message,
    };
  }

  const parsed = parseJsonObject(outcome.text);
  const condition = typeof parsed?.condition === "string" ? parsed.condition.trim() : "";
  if (!condition) return { ok: true, condition: "", parseable: true };
  return { ok: true, condition, parseable: isParseableCondition(condition) };
}

export type DigestLevel = "info" | "watch" | "alert";

export interface AuditDigestResult {
  ok: boolean;
  message?: string;
  summary?: string;
  highlights?: Array<{ level: DigestLevel; text: string }>;
  counts?: { total: number; allowed: number; held: number; denied: number; blocked: number };
}

/**
 * AI digest of recent agent activity — a plain-English read of what the agents
 * did and anything that warrants attention. Reads only audit metadata (tool,
 * decision, status, risk, agent, reason), never arguments or results, so it is
 * naturally privacy-safe: with offline mode on, those were never stored anyway.
 */
export async function aiAuditDigestAction(): Promise<AuditDigestResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: "Not authenticated." };

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("audit_log")
    .select("created_at, exposed_tool, decision, status, risk, agent, reason")
    .eq("project_id", ctx.projectId)
    .eq("event_type", "tool_call")
    .order("created_at", { ascending: false })
    .limit(80);

  const events = rows ?? [];
  const counts = {
    total: events.length,
    allowed: events.filter((e) => e.status === "allowed" || e.status === "approved").length,
    held: events.filter((e) => e.status === "waiting_for_approval").length,
    denied: events.filter((e) => e.status === "denied").length,
    blocked: events.filter((e) => e.status === "blocked" || e.status === "error").length,
  };

  if (events.length === 0) {
    return {
      ok: true,
      summary: "No agent tool calls have been recorded yet — run a call through the gateway and check back.",
      highlights: [],
      counts,
    };
  }

  const lines = events
    .slice(0, 60)
    .map(
      (e) =>
        `${e.exposed_tool} · ${e.decision}/${e.status}${e.risk ? ` · risk:${e.risk}` : ""} · ${e.agent}${
          e.reason ? ` · ${String(e.reason).slice(0, 80)}` : ""
        }`,
    )
    .join("\n");

  const outcome = await runAi(ctx.projectId, ctx.plan, {
    model: GROQ_MODELS.smart,
    json: true,
    maxOutputTokens: 360,
    system:
      'You are a security analyst summarizing an AI coding agent\'s recent tool-call activity for the human who owns it. Be concise and concrete; never invent events not present in the data. Output ONLY JSON: {"summary":"2-3 plain-English sentences on what the agents did overall","highlights":[{"level":"info|watch|alert","text":"<=140 chars"}]}. Use "alert" for things needing attention (repeated denials/blocks, out-of-scope attempts, destructive approvals, a spike in a risky tool), "watch" for mild anomalies, "info" for normal notable facts. At most 6 highlights.',
    user: `Totals — total:${counts.total} allowed:${counts.allowed} held:${counts.held} denied:${counts.denied} blocked/error:${counts.blocked}\n\nRecent events (tool · decision/status · risk · agent · reason):\n${lines}`,
  });

  if (!outcome.ok) {
    return {
      ok: false,
      message:
        outcome.reason === "upgrade_required"
          ? "AI digests are a paid feature — upgrade to enable them."
          : outcome.message,
      counts,
    };
  }

  const parsed = parseJsonObject(outcome.text);
  const summary = typeof parsed?.summary === "string" ? parsed.summary.slice(0, 600) : undefined;
  const rawHighlights: unknown[] = Array.isArray(parsed?.highlights) ? (parsed.highlights as unknown[]) : [];
  const highlights = rawHighlights
    .map((h) => {
      const o = (h ?? {}) as Record<string, unknown>;
      const level: DigestLevel = (["info", "watch", "alert"] as const).includes(o.level as DigestLevel)
        ? (o.level as DigestLevel)
        : "info";
      const text = typeof o.text === "string" ? o.text.slice(0, 200) : "";
      return text ? { level, text } : null;
    })
    .filter((h): h is { level: DigestLevel; text: string } => h !== null)
    .slice(0, 6);

  return { ok: true, summary, highlights, counts };
}
