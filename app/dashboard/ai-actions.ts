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
  const { data: approval } = await supabase
    .from("approvals")
    .select("exposed_tool, args, reason, risk")
    .eq("id", approvalId)
    .maybeSingle();
  if (!approval) return { ok: false, message: "Approval not found." };

  const outcome = await runAi(ctx.projectId, ctx.plan, {
    model: GROQ_MODELS.smart,
    json: true,
    maxOutputTokens: 220,
    system:
      "You are a security reviewer for an AI-agent tool-call gateway. Given one pending tool call, assess its risk to the user's systems and data. Consider destructive/irreversible actions, data exfiltration, blast radius, and whether the arguments look anomalous for this tool. Output ONLY JSON: {\"risk\":\"low|medium|high\",\"reason\":\"<=200 chars\",\"watch_for\":\"<=120 chars\"}.",
    user: `Tool: ${approval.exposed_tool}\nStated reason: ${approval.reason ?? "(none)"}\nArguments:\n${JSON.stringify(approval.args ?? {}, null, 2)}`,
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
