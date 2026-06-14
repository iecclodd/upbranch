import { createClient } from "@/lib/supabase/server";
import { getProvider, isRateLimit, type CompleteOpts } from "@/lib/ai/provider";
import type { Plan } from "@/lib/dashboard/types";

/**
 * The single choke point every AI feature goes through. It enforces, in order:
 *   1. plan gating  — AI is a paid feature (free → upgrade_required)
 *   2. input clamp  — truncate the prompt so input cost is bounded
 *   3. daily cap    — atomic per-project call + token cap (Postgres) to stop a
 *                     runaway bill, even if a feature is called in a loop
 *   4. output cap   — hard max output tokens per call
 * then reconciles the reserved vs actual token usage. Never trust plan/cap
 * from the client — all of this runs server-side.
 */

const MAX_INPUT_CHARS = Number(process.env.AI_MAX_INPUT_CHARS ?? 8_000);
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 400);
const DAILY_CALL_CAP = Number(process.env.AI_DAILY_CALL_CAP ?? 200);
const DAILY_TOKEN_CAP = Number(process.env.AI_DAILY_TOKEN_CAP ?? DAILY_CALL_CAP * MAX_OUTPUT_TOKENS);

export type AiOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: "upgrade_required" | "rate_limited" | "daily_cap" | "not_configured" | "error"; message: string };

export function clampInput(s: string, max = MAX_INPUT_CHARS): string {
  return s.length <= max ? s : s.slice(0, max) + "\n…[truncated]";
}

export async function runAi(
  projectId: string,
  plan: Plan,
  opts: CompleteOpts,
): Promise<AiOutcome> {
  if (plan === "free") {
    return { ok: false, reason: "upgrade_required", message: "AI features are available on paid plans." };
  }
  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return { ok: false, reason: "not_configured", message: "AI is not configured on this deployment." };
  }

  const supabase = await createClient();
  const estOutput = Math.min(opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS);

  const { data: gate } = await supabase.rpc("ai_consume", {
    p_project_id: projectId,
    p_daily_call_cap: DAILY_CALL_CAP,
    p_daily_token_cap: DAILY_TOKEN_CAP,
    p_est_output: estOutput,
  });
  const decision = gate as { allowed: boolean; reason?: string } | null;
  if (!decision?.allowed) {
    return {
      ok: false,
      reason: "daily_cap",
      message: "You've hit today's AI usage limit for this project. It resets at midnight UTC.",
    };
  }

  try {
    const result = await getProvider().complete({
      ...opts,
      user: clampInput(opts.user),
      maxOutputTokens: estOutput,
    });
    await supabase.rpc("ai_settle", {
      p_project_id: projectId,
      p_est_output: estOutput,
      p_actual_output: result.outputTokens,
    });
    return { ok: true, text: result.text };
  } catch (err) {
    if (isRateLimit(err)) {
      return { ok: false, reason: "rate_limited", message: "The AI provider is busy. Try again in a moment." };
    }
    return { ok: false, reason: "error", message: "The AI request failed." };
  }
}

/** Best-effort parse of a JSON object the model returned (tolerates fences). */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const v = JSON.parse(cleaned);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}
