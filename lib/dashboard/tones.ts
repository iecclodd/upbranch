import type { AuditStatus, PolicyDecision } from "./types";

/**
 * Shared tone vocabulary for status pills. Lives outside any "use client"
 * module so both Server and Client Components can call these.
 */
export type Tone = "good" | "review" | "bad" | "neutral" | "violet";

export function decisionTone(decision: PolicyDecision): Tone {
  if (decision === "allow") return "good";
  if (decision === "deny") return "bad";
  return "review";
}

export function statusTone(status: AuditStatus): Tone {
  if (status === "allowed" || status === "approved") return "good";
  if (status === "denied" || status === "blocked" || status === "error") return "bad";
  if (status === "info") return "neutral";
  return "review";
}
