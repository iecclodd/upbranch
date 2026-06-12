// Registers sha256(gateway proof) in gateway_config. Run once per
// environment after migration 0005 (and again if POLYSHIELD_VAULT_KEY ever
// rotates):  node scripts/set-gateway-proof.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const dbUrl = process.env.SUPABASE_DB_URL ?? envLocal.match(/^SUPABASE_DB_URL=(.+)$/m)?.[1]?.trim();
const vaultKey =
  process.env.POLYSHIELD_VAULT_KEY ?? envLocal.match(/^POLYSHIELD_VAULT_KEY=(.+)$/m)?.[1]?.trim();
if (!dbUrl || !vaultKey) {
  console.error("Need SUPABASE_DB_URL and POLYSHIELD_VAULT_KEY (env or .env.local).");
  process.exit(1);
}

const proof = createHash("sha256")
  .update(`polyshield-gateway-proof:${vaultKey}`)
  .digest("hex");
const proofHash = createHash("sha256").update(proof).digest("hex");

const c = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query(
    `insert into gateway_config (key, value) values ('gateway_proof_hash', $1)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [proofHash],
  );
  console.log("gateway_proof_hash registered.");
} finally {
  await c.end();
}
