import { createHash } from "node:crypto";

/**
 * Gateway proof: a secret only the gateway server can derive, sent with
 * side-effecting gateway RPCs (enqueue job, write audit, create approval).
 *
 * Why it exists: those RPCs are anon-callable and otherwise gated by the
 * AGENT's key hash — but the agent is the untrusted party. Without proof, a
 * malicious agent could call gateway_enqueue_job directly against PostgREST
 * and hand an un-policied tool call to the user's local runner. The database
 * stores only sha256(proof) in gateway_config (RLS, zero policies), so the
 * proof never exists server-side and agents have no way to learn it.
 *
 * Derived from POLYSHIELD_VAULT_KEY so deploys need no extra env var; run
 * scripts/set-gateway-proof.mjs once per environment to register the hash.
 */
export function gatewayProof(): string {
  const vaultKey = process.env.POLYSHIELD_VAULT_KEY;
  if (!vaultKey) {
    throw new Error("POLYSHIELD_VAULT_KEY is not set — cannot derive the gateway proof.");
  }
  return createHash("sha256").update(`polyshield-gateway-proof:${vaultKey}`).digest("hex");
}
